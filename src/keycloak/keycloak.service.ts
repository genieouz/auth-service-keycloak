import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
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

  constructor(private configService: ConfigService) {
    this.keycloakUrl = this.configService.get('KEYCLOAK_URL', 'http://localhost:8080');
    this.realm = this.configService.get('KEYCLOAK_REALM', 'senegalservices');
    this.adminClientId = this.configService.get('KEYCLOAK_ADMIN_CLIENT_ID', 'keycloak_admin_api');
    this.adminClientSecret = this.configService.get('KEYCLOAK_ADMIN_CLIENT_SECRET', 'KabivlQz5GVG5Rw9BEKVSqKfzm6OXPbY');
    this.userClientId = this.configService.get('KEYCLOAK_USER_CLIENT_ID', 'senegalservices_client');

    this.httpClient = axios.create({
      baseURL: this.keycloakUrl,
      timeout: 10000,
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
   * Authentifier un utilisateur avec email/téléphone et mot de passe
   */
  async authenticateUser(identifier: string, password: string): Promise<KeycloakTokenResponse> {
    try {
      const response = await this.httpClient.post(
        `/realms/${this.realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'password',
          client_id: this.userClientId,
          username: identifier,
          password: password,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Erreur lors de l\'authentification utilisateur', error.response?.data);
      const errorData: KeycloakError = error.response?.data;
      throw new UnauthorizedException(errorData?.error_description || 'Identifiants invalides');
    }
  }

  /**
   * Créer un utilisateur dans Keycloak
   */
  async createUser(userData: KeycloakUser): Promise<string> {
    try {
      const adminToken = await this.getAdminToken();
      
      const response = await this.httpClient.post(
        `/admin/realms/${this.realm}/users`,
        userData,
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
}