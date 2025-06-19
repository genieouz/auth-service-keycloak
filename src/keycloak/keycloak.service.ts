import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as jwksClient from 'jwks-rsa';
import { KeycloakTokenResponse, KeycloakUser, KeycloakError } from '../common/interfaces/keycloak.interface';

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);
  private readonly httpClient: AxiosInstance;
  private readonly keycloakUrl: string;
  private readonly realm: string;
  private readonly adminClientId: string;
  private readonly adminClientSecret: string;
  private readonly userClientId: string;
  private readonly jwksClient: jwksClient.JwksClient;

  constructor(private configService: ConfigService) {
    this.keycloakUrl = this.configService.get('KEYCLOAK_URL');
    this.realm = this.configService.get('KEYCLOAK_REALM');
    this.adminClientId = this.configService.get('KEYCLOAK_ADMIN_CLIENT_ID');
    this.adminClientSecret = this.configService.get('KEYCLOAK_ADMIN_CLIENT_SECRET');
    this.userClientId = this.configService.get('KEYCLOAK_USER_CLIENT_ID');

    this.httpClient = axios.create({
      baseURL: this.keycloakUrl,
      timeout: 10000,
    });

    // Initialiser le client JWKS pour la vérification des tokens
    this.jwksClient = jwksClient({
      jwksUri: `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/certs`,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  /**
   * Obtenir un token d'accès pour l'API admin
   */
  async getAdminToken(): Promise<string> {
    try {
      const response = await this.httpClient.post(
        `/realms/${this.realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.adminClientId,
          client_secret: this.adminClientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const tokenData: KeycloakTokenResponse = response.data;
      return tokenData.access_token;
    } catch (error) {
      this.logger.error('Erreur lors de l\'obtention du token admin', error.response?.data);
      throw new UnauthorizedException('Impossible d\'obtenir le token d\'accès admin');
    }
  }

  /**
   * Obtenir la clé publique pour vérifier un token JWT
   */
  async getPublicKey(kid: string): Promise<string> {
    try {
      const key = await this.jwksClient.getSigningKey(kid);
      return key.getPublicKey();
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération de la clé publique: ${kid}`, error);
      throw new UnauthorizedException('Impossible de vérifier le token');
    }
  }

  /**
   * Vérifier et décoder un token JWT de Keycloak
   */
  async verifyToken(token: string): Promise<any> {
    try {
      // Décoder le header pour obtenir le kid (key ID)
      const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
      
      if (!header.kid) {
        throw new UnauthorizedException('Token invalide: kid manquant');
      }

      // Obtenir la clé publique correspondante
      const publicKey = await this.getPublicKey(header.kid);
      
      // Vérifier le token avec la clé publique
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        // Validation d'audience stricte
        audience: ['account', this.userClientId],
        issuer: `${this.keycloakUrl}/realms/${this.realm}`,
      });

      return decoded;
    } catch (error) {
      this.logger.error('Erreur lors de la vérification du token', error);
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }

  /**
   * Authentifier un utilisateur avec email/téléphone et mot de passe
   */
  async authenticateUser(identifier: string, password: string): Promise<KeycloakTokenResponse> {
    try {
      this.logger.log(`Tentative d'authentification pour: ${identifier}`);
      
      // Attendre un peu plus longtemps pour les nouveaux comptes
      const isNewAccount = identifier.startsWith('+');
      if (isNewAccount) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const response = await this.httpClient.post(
        `/realms/${this.realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'password',
          client_id: this.userClientId,
          username: identifier,
          password: password,
          scope: 'openid profile email offline_access', // Ajouter offline_access pour refresh token
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Erreur lors de l'authentification pour ${identifier}:`, error.response?.data);
      const errorData: KeycloakError = error.response?.data;
      
      // Gestion spécifique de l'erreur "Account is not fully set up"
      if (errorData?.error_description?.includes('Account is not fully set up')) {
        // Pour les comptes téléphone, essayer de corriger automatiquement
        if (identifier.startsWith('+')) {
          this.logger.warn(`Tentative de correction automatique pour le téléphone ${identifier}`);
          
          try {
            // Trouver l'utilisateur et forcer la finalisation
            const user = await this.findUserByIdentifier(identifier);
            if (user) {
              await this.updateUser(user.id, {
                enabled: true,
                emailVerified: false, // Pas d'email réel
                attributes: {
                  ...user.attributes,
                  accountSetupComplete: ['true'],
                  phoneVerified: ['true'],
                  emailVerified: ['false'],
                }
              });
              
              // Réessayer l'authentification après correction
              await new Promise(resolve => setTimeout(resolve, 2000));
              return this.authenticateUser(identifier, password);
            }
          } catch (fixError) {
            this.logger.error(`Impossible de corriger automatiquement le compte ${identifier}`, fixError);
          }
        }
        
        throw new UnauthorizedException('Compte en cours de finalisation. Veuillez réessayer dans quelques instants.');
      }
      
      if (errorData?.error_description?.includes('Invalid user credentials')) {
        throw new UnauthorizedException('Identifiants invalides');
      }
      
      if (errorData?.error_description?.includes('Account disabled')) {
        throw new UnauthorizedException('Compte désactivé');
      }
      
      throw new UnauthorizedException(errorData?.error_description || 'Identifiants invalides');
    }
  }

  /**
   * Créer un utilisateur dans Keycloak
   */
  async createUser(userData: KeycloakUser): Promise<string> {
    try {
      const adminToken = await this.getAdminToken();
      
      // Configuration spéciale pour les utilisateurs avec téléphone uniquement
      const isPhoneOnly = !userData.email && userData.attributes?.phone;
      
      const completeUserData = {
        ...userData,
        // Pour les utilisateurs avec téléphone uniquement, utiliser le téléphone comme email fictif
        email: userData.email || (isPhoneOnly ? `${userData.attributes.phone[0].replace('+', '')}@phone.local` : undefined),
        enabled: true,
        emailVerified: !!userData.email, // Seulement si un vrai email est fourni
        requiredActions: [], // CRITIQUE: Aucune action requise
        groups: [],
        credentials: userData.credentials || [{
          type: 'password',
          temporary: false,
          value: userData.credentials?.[0]?.value || 'temp-password',
        }],
        attributes: {
          ...userData.attributes,
          accountSetupComplete: ['true'],
          emailVerified: userData.email ? ['true'] : ['false'],
          phoneVerified: userData.attributes?.phone ? ['true'] : ['false'],
          // Marquer explicitement le type de compte
          accountType: [isPhoneOnly ? 'phone' : 'email'],
          // Indiquer que c'est un email fictif si nécessaire
          ...(isPhoneOnly && { emailIsFictional: ['true'] }),
        },
      };
      
      const response = await this.httpClient.post(
        `/admin/realms/${this.realm}/users`,
        completeUserData,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Extraire l'ID du header Location
      const locationHeader = response.headers.location;
      const userId = locationHeader ? locationHeader.split('/').pop() : null;
      
      if (!userId) {
        throw new Error('Impossible de récupérer l\'ID de l\'utilisateur créé');
      }

      // Attendre que Keycloak finalise la création
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Post-traitement spécial pour les comptes téléphone uniquement
      try {
        const createdUser = await this.getUserById(userId);
        
        // Mise à jour finale pour garantir la configuration complète
        const finalUpdate: Partial<KeycloakUser> = {
          enabled: true,
          emailVerified: !!userData.email, // Seulement pour les vrais emails
          attributes: {
            ...createdUser.attributes,
            accountSetupComplete: ['true'],
            emailVerified: userData.email ? ['true'] : ['false'],
            phoneVerified: userData.attributes?.phone ? ['true'] : ['false'],
          }
        };
        
        await this.updateUser(userId, finalUpdate);
        
        this.logger.log(`Post-traitement terminé pour l'utilisateur ${userId}`);
      } catch (error) {
        this.logger.warn(`Impossible de vérifier l'utilisateur créé: ${userId}`, error);
      }

      this.logger.log(`Utilisateur créé avec l'ID: ${userId}`);
      return userId;
    } catch (error) {
      this.logger.error('Erreur lors de la création de l\'utilisateur', error.response?.data);
      throw new BadRequestException('Impossible de créer l\'utilisateur dans Keycloak');
    }
  }

  /**
   * Récupérer un utilisateur par ID
   */
  async getUserById(userId: string): Promise<KeycloakUser> {
    try {
      const adminToken = await this.getAdminToken();
      
      const response = await this.httpClient.get(
        `/admin/realms/${this.realm}/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération de l'utilisateur ${userId}`, error.response?.data);
      throw new BadRequestException('Utilisateur non trouvé');
    }
  }

  /**
   * Lister les utilisateurs
   */
  async getUsers(first = 0, max = 100): Promise<KeycloakUser[]> {
    try {
      const adminToken = await this.getAdminToken();
      
      const response = await this.httpClient.get(
        `/admin/realms/${this.realm}/users`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
          params: {
            first,
            max,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des utilisateurs', error.response?.data);
      throw new BadRequestException('Impossible de récupérer les utilisateurs');
    }
  }

  /**
   * Compter le nombre total d'utilisateurs (optimisé)
   */
  async getUsersCount(): Promise<number> {
    try {
      const adminToken = await this.getAdminToken();
      
      const response = await this.httpClient.get(
        `/admin/realms/${this.realm}/users/count`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Erreur lors du comptage des utilisateurs', error.response?.data);
      // Fallback: estimation basée sur une requête limitée
      const users = await this.getUsers(0, 1);
      return users.length > 0 ? 1000 : 0; // Estimation grossière
    }
  }

  /**
   * Rechercher des utilisateurs par critères (optimisé)
   */
  async searchUsers(search: string, max = 10): Promise<KeycloakUser[]> {
    try {
      const adminToken = await this.getAdminToken();
      
      const response = await this.httpClient.get(
        `/admin/realms/${this.realm}/users`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
          params: {
            search,
            max,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Erreur lors de la recherche d\'utilisateurs', error.response?.data);
      return [];
    }
  }

  /**
   * Vérifier si un utilisateur existe par email (optimisé)
   */
  async userExistsByEmail(email: string): Promise<boolean> {
    try {
      const adminToken = await this.getAdminToken();
      
      // Recherche directe par email avec exact match
      const response = await this.httpClient.get(
        `/admin/realms/${this.realm}/users`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
          params: {
            email: email,
            exact: true,
            max: 1,
          },
        }
      );

      const users: KeycloakUser[] = response.data;
      return users.length > 0;
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification d'existence par email: ${email}`, error);
      return false;
    }
  }

  /**
   * Vérifier si un utilisateur existe par téléphone (optimisé)
   */
  async userExistsByPhone(phone: string): Promise<boolean> {
    try {
      const adminToken = await this.getAdminToken();
      
      // Recherche directe par attribut téléphone
      const response = await this.httpClient.get(
        `/admin/realms/${this.realm}/users`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
          params: {
            q: `phone:${phone}`,
            max: 1,
          },
        }
      );

      const users: KeycloakUser[] = response.data;
      return users.length > 0 && users.some(user => 
        user.attributes?.phone?.includes(phone)
      );
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification d'existence par téléphone: ${phone}`, error);
      return false;
    }
  }

  /**
   * Rechercher un utilisateur par username (email ou téléphone)
   */
  async findUserByUsername(username: string): Promise<KeycloakUser | null> {
    try {
      const adminToken = await this.getAdminToken();
      
      const response = await this.httpClient.get(
        `/admin/realms/${this.realm}/users`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
          params: {
            username: username,
            exact: true,
            max: 1,
          },
        }
      );

      const users: KeycloakUser[] = response.data;
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      this.logger.error(`Erreur lors de la recherche par username: ${username}`, error);
      return null;
    }
  }

  /**
   * Vérifier si un utilisateur existe par email ou téléphone (optimisé)
   */
  async userExists(email?: string, phone?: string): Promise<boolean> {
    try {
      const checks: Promise<boolean>[] = [];
      
      if (email) {
        checks.push(this.userExistsByEmail(email));
      }
      
      if (phone) {
        checks.push(this.userExistsByPhone(phone));
      }
      
      if (checks.length === 0) {
        return false;
      }
      
      // Exécuter les vérifications en parallèle
      const results = await Promise.all(checks);
      return results.some(exists => exists);
    } catch (error) {
      this.logger.error('Erreur lors de la vérification d\'existence utilisateur', error);
      return false;
    }
  }

  /**
   * Mettre à jour un utilisateur
   */
  async updateUser(userId: string, userData: Partial<KeycloakUser>): Promise<void> {
    try {
      const adminToken = await this.getAdminToken();
      
      await this.httpClient.put(
        `/admin/realms/${this.realm}/users/${userId}`,
        userData,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`Utilisateur ${userId} mis à jour avec succès`);
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour de l'utilisateur ${userId}`, error.response?.data);
      throw new BadRequestException('Impossible de mettre à jour l\'utilisateur');
    }
  }

  /**
   * Désactiver un utilisateur
   */
  async disableUser(userId: string): Promise<void> {
    await this.updateUser(userId, { enabled: false });
  }

  /**
   * Supprimer un utilisateur
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const adminToken = await this.getAdminToken();
      
      await this.httpClient.delete(
        `/admin/realms/${this.realm}/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      this.logger.log(`Utilisateur ${userId} supprimé avec succès`);
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression de l'utilisateur ${userId}`, error.response?.data);
      throw new BadRequestException('Impossible de supprimer l\'utilisateur');
    }
  }

  /**
   * Rafraîchir un token d'accès
   */
  async refreshToken(refreshToken: string): Promise<KeycloakTokenResponse> {
    try {
      const response = await this.httpClient.post(
        `/realms/${this.realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.userClientId,
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Erreur lors du rafraîchissement du token', error.response?.data);
      throw new UnauthorizedException('Token de rafraîchissement invalide');
    }
  }

  /**
   * Changer le mot de passe d'un utilisateur
   */
  async changeUserPassword(userId: string, newPassword: string): Promise<void> {
    try {
      const adminToken = await this.getAdminToken();
      
      await this.httpClient.put(
        `/admin/realms/${this.realm}/users/${userId}/reset-password`,
        {
          type: 'password',
          value: newPassword,
          temporary: false,
        },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`Mot de passe changé pour l'utilisateur ${userId}`);
    } catch (error) {
      this.logger.error(`Erreur lors du changement de mot de passe pour ${userId}`, error.response?.data);
      throw new BadRequestException('Impossible de changer le mot de passe');
    }
  }

  /**
   * Trouver un utilisateur par identifiant (email ou téléphone)
   */
  async findUserByIdentifier(identifier: string): Promise<KeycloakUser | null> {
    try {
      // Essayer d'abord par email
      if (identifier.includes('@')) {
        const users = await this.searchUsers(identifier);
        return users.find(user => user.email === identifier) || null;
      }
      
      // Sinon chercher par téléphone dans les attributs
      const users = await this.searchUsers(identifier);
      return users.find(user => 
        user.attributes?.phone?.includes(identifier) ||
        user.username === identifier
      ) || null;
    } catch (error) {
      this.logger.error(`Erreur lors de la recherche par identifiant: ${identifier}`, error);
      return null;
    }
  }

  /**
   * Déconnecter un utilisateur (invalider ses sessions)
   */
  async logoutUser(userId: string): Promise<void> {
    try {
      const adminToken = await this.getAdminToken();
      
      await this.httpClient.post(
        `/admin/realms/${this.realm}/users/${userId}/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      this.logger.log(`Sessions invalidées pour l'utilisateur ${userId}`);
    } catch (error) {
      this.logger.error(`Erreur lors de la déconnexion de l'utilisateur ${userId}`, error.response?.data);
      // Ne pas faire échouer la déconnexion si Keycloak échoue
    }
  }
}