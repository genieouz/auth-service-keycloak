import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import jwksClient from 'jwks-rsa';
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
      
      // Optimiser la structure pour Keycloak
      const optimizedUserData = this.optimizeUserDataForKeycloak(userData);
      
      const response = await this.httpClient.post(
        `/admin/realms/${this.realm}/users`,
        optimizedUserData,
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

      // Attendre que Keycloak finalise la création (plus court)
      await new Promise(resolve => setTimeout(resolve, 1500));

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
      
      // Récupérer d'abord les données complètes de l'utilisateur
      const currentUser = await this.getUserById(userId);
      
      // Fusionner les nouvelles données avec les données existantes
      const mergedUserData = this.mergeUserData(currentUser, userData);
      
      await this.httpClient.put(
        `/admin/realms/${this.realm}/users/${userId}`,
        mergedUserData,
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

  /**
   * Assigner des rôles à un utilisateur
   */
  async assignRolesToUser(userId: string, roles: string[]): Promise<void> {
    try {
      const adminToken = await this.getAdminToken();
      
      // Récupérer les rôles disponibles dans le realm
      const availableRoles = await this.getRealmRoles();
      
      // Filtrer les rôles valides
      const validRoles = roles.filter(roleName => 
        availableRoles.some(role => role.name === roleName)
      );
      
      if (validRoles.length === 0) {
        this.logger.warn(`Aucun rôle valide trouvé parmi: ${roles.join(', ')}`);
        return;
      }
      
      // Mapper les noms de rôles vers les objets rôles
      const rolesToAssign = validRoles.map(roleName => 
        availableRoles.find(role => role.name === roleName)
      ).filter(role => role !== undefined);
      
      // Assigner les rôles
      await this.httpClient.post(
        `/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
        rolesToAssign,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      this.logger.log(`Rôles assignés à l'utilisateur ${userId}: ${validRoles.join(', ')}`);
    } catch (error) {
      this.logger.error(`Erreur lors de l'assignation des rôles pour ${userId}`, error.response?.data);
      throw new BadRequestException('Impossible d\'assigner les rôles');
    }
  }

  /**
   * Retirer des rôles d'un utilisateur
   */
  async removeRolesFromUser(userId: string, roles: string[]): Promise<void> {
    try {
      const adminToken = await this.getAdminToken();
      
      // Récupérer les rôles disponibles dans le realm
      const availableRoles = await this.getRealmRoles();
      
      // Filtrer les rôles valides
      const validRoles = roles.filter(roleName => 
        availableRoles.some(role => role.name === roleName)
      );
      
      if (validRoles.length === 0) {
        this.logger.warn(`Aucun rôle valide trouvé parmi: ${roles.join(', ')}`);
        return;
      }
      
      // Mapper les noms de rôles vers les objets rôles
      const rolesToRemove = validRoles.map(roleName => 
        availableRoles.find(role => role.name === roleName)
      ).filter(role => role !== undefined);
      
      // Retirer les rôles
      await this.httpClient.delete(
        `/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          data: rolesToRemove,
        }
      );
      
      this.logger.log(`Rôles retirés de l'utilisateur ${userId}: ${validRoles.join(', ')}`);
    } catch (error) {
      this.logger.error(`Erreur lors du retrait des rôles pour ${userId}`, error.response?.data);
      throw new BadRequestException('Impossible de retirer les rôles');
    }
  }

  /**
   * Récupérer les rôles d'un utilisateur
   */
  async getUserRoles(userId: string): Promise<any[]> {
    try {
      const adminToken = await this.getAdminToken();
      
      const response = await this.httpClient.get(
        `/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des rôles pour ${userId}`, error.response?.data);
      // Retourner un tableau vide au lieu de faire échouer la requête
      this.logger.warn(`Retour d'un tableau vide pour les rôles de l'utilisateur ${userId}`);
      return [];
    }
  }

  /**
   * Récupérer un utilisateur avec ses rôles en une seule requête
   */
  async getUserWithRoles(userId: string): Promise<{ user: KeycloakUser; roles: any[] }> {
    try {
      const [user, roles] = await Promise.all([
        this.getUserById(userId),
        this.getUserRoles(userId)
      ]);
      
      return { user, roles };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération de l'utilisateur avec rôles ${userId}`, error);
      throw new BadRequestException('Utilisateur non trouvé');
    }
  }

  /**
   * Créer un rôle dans Keycloak
   */
  async createRole(roleData: any): Promise<string> {
    try {
      const adminToken = await this.getAdminToken();
      
      const response = await this.httpClient.post(
        `/admin/realms/${this.realm}/roles`,
        roleData,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      // Récupérer l'ID du rôle créé
      const createdRole = await this.getRoleByName(roleData.name);
      return createdRole?.id || roleData.name;
    } catch (error) {
      this.logger.error('Erreur lors de la création du rôle', error.response?.data);
      throw new BadRequestException('Impossible de créer le rôle');
    }
  }

  /**
   * Récupérer un rôle par nom
   */
  async getRoleByName(roleName: string): Promise<any> {
    try {
      const adminToken = await this.getAdminToken();
      
      const response = await this.httpClient.get(
        `/admin/realms/${this.realm}/roles/${roleName}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );
      
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      this.logger.error(`Erreur lors de la récupération du rôle ${roleName}`, error.response?.data);
      throw new BadRequestException('Impossible de récupérer le rôle');
    }
  }

  /**
   * Mettre à jour un rôle
   */
  async updateRole(roleName: string, roleData: any): Promise<void> {
    try {
      const adminToken = await this.getAdminToken();
      
      await this.httpClient.put(
        `/admin/realms/${this.realm}/roles/${roleName}`,
        roleData,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      this.logger.log(`Rôle mis à jour: ${roleName}`);
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour du rôle ${roleName}`, error.response?.data);
      throw new BadRequestException('Impossible de mettre à jour le rôle');
    }
  }

  /**
   * Supprimer un rôle
   */
  async deleteRole(roleName: string): Promise<void> {
    try {
      const adminToken = await this.getAdminToken();
      
      await this.httpClient.delete(
        `/admin/realms/${this.realm}/roles/${roleName}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );
      
      this.logger.log(`Rôle supprimé: ${roleName}`);
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression du rôle ${roleName}`, error.response?.data);
      throw new BadRequestException('Impossible de supprimer le rôle');
    }
  }

  /**
   * Récupérer les utilisateurs ayant un rôle spécifique
   */
  async getUsersWithRole(roleName: string): Promise<any[]> {
    try {
      const adminToken = await this.getAdminToken();
      
      const response = await this.httpClient.get(
        `/admin/realms/${this.realm}/roles/${roleName}/users`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des utilisateurs avec le rôle ${roleName}`, error.response?.data);
      return [];
    }
  }

  /**
   * Ajouter des rôles composites
   */
  async addCompositeRoles(parentRoleName: string, childRoleNames: string[]): Promise<void> {
    try {
      const adminToken = await this.getAdminToken();
      
      // Récupérer les objets rôles enfants
      const availableRoles = await this.getRealmRoles();
      const childRoles = childRoleNames.map(roleName => 
        availableRoles.find(role => role.name === roleName)
      ).filter(role => role !== undefined);
      
      await this.httpClient.post(
        `/admin/realms/${this.realm}/roles/${parentRoleName}/composites`,
        childRoles,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      this.logger.log(`Rôles composites ajoutés à ${parentRoleName}: ${childRoleNames.join(', ')}`);
    } catch (error) {
      this.logger.error(`Erreur lors de l'ajout des rôles composites à ${parentRoleName}`, error.response?.data);
      throw new BadRequestException('Impossible d\'ajouter les rôles composites');
    }
  }

  /**
   * Retirer des rôles composites
   */
  async removeCompositeRoles(parentRoleName: string, childRoleNames: string[]): Promise<void> {
    try {
      const adminToken = await this.getAdminToken();
      
      // Récupérer les objets rôles enfants
      const availableRoles = await this.getRealmRoles();
      const childRoles = childRoleNames.map(roleName => 
        availableRoles.find(role => role.name === roleName)
      ).filter(role => role !== undefined);
      
      await this.httpClient.delete(
        `/admin/realms/${this.realm}/roles/${parentRoleName}/composites`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          data: childRoles,
        }
      );
      
      this.logger.log(`Rôles composites retirés de ${parentRoleName}: ${childRoleNames.join(', ')}`);
    } catch (error) {
      this.logger.error(`Erreur lors du retrait des rôles composites de ${parentRoleName}`, error.response?.data);
      throw new BadRequestException('Impossible de retirer les rôles composites');
    }
  }
  /**
   * Récupérer les rôles disponibles dans le realm
   */
  async getRealmRoles(): Promise<any[]> {
    try {
      const adminToken = await this.getAdminToken();
      
      const response = await this.httpClient.get(
        `/admin/realms/${this.realm}/roles`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );
      
      return response.data;
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des rôles', error.response?.data);
      return [];
    }
  }

  /**
   * Optimiser les données utilisateur pour l'API Keycloak
   */
  private optimizeUserDataForKeycloak(userData: KeycloakUser): any {
    // Structure optimisée pour Keycloak
    const optimized: any = {
      // Champs principaux (niveau racine - recommandé)
      username: userData.username,
      email: userData.email, // undefined si pas d'email
      firstName: userData.firstName,
      lastName: userData.lastName,
      enabled: userData.enabled ?? true,
      emailVerified: userData.emailVerified ?? false,
      
      // Configuration du compte
      requiredActions: [], // Aucune action requise
      groups: [], // Pas de groupes par défaut
      
      // Credentials
      credentials: userData.credentials || [],
    };

    // Ajouter les attributs personnalisés seulement s'ils existent
    if (userData.attributes && Object.keys(userData.attributes).length > 0) {
      optimized.attributes = {
        ...userData.attributes,
        // Métadonnées de vérification
        emailVerified: [userData.emailVerified ? 'true' : 'false'],
        phoneVerified: [userData.attributes.phone ? 'true' : 'false'],
      };
    }

    // Nettoyer les valeurs undefined
    Object.keys(optimized).forEach(key => {
      if (optimized[key] === undefined) {
        delete optimized[key];
      }
    });

    return optimized;
  }

  /**
   * Fusionner les données utilisateur partielles avec les données existantes
   */
  private mergeUserData(currentUser: KeycloakUser, partialUserData: Partial<KeycloakUser>): KeycloakUser {
    // Commencer avec les données actuelles de l'utilisateur
    const mergedUser: KeycloakUser = {
      ...currentUser,
    };

    // Mettre à jour les champs principaux seulement s'ils sont fournis
    if (partialUserData.email !== undefined) {
      mergedUser.email = partialUserData.email;
    }
    if (partialUserData.firstName !== undefined) {
      mergedUser.firstName = partialUserData.firstName;
    }
    if (partialUserData.lastName !== undefined) {
      mergedUser.lastName = partialUserData.lastName;
    }
    if (partialUserData.enabled !== undefined) {
      mergedUser.enabled = partialUserData.enabled;
    }
    if (partialUserData.emailVerified !== undefined) {
      mergedUser.emailVerified = partialUserData.emailVerified;
    }

    // Fusionner les attributs personnalisés
    if (partialUserData.attributes) {
      mergedUser.attributes = {
        ...currentUser.attributes,
        ...partialUserData.attributes,
      };
    }

    // Fusionner les credentials si fournis
    if (partialUserData.credentials) {
      mergedUser.credentials = partialUserData.credentials;
    }

    this.logger.debug(`Données fusionnées pour l'utilisateur ${currentUser.id}:`, {
      originalFields: Object.keys(currentUser),
      updatedFields: Object.keys(partialUserData),
      mergedFields: Object.keys(mergedUser),
    });

    return mergedUser;
  }
}