import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { KeycloakService } from '../keycloak/keycloak.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { KeycloakUser } from '../common/interfaces/keycloak.interface';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly keycloakService: KeycloakService) {}

  /**
   * Récupérer un utilisateur par ID
   */
  async getUserById(userId: string): Promise<KeycloakUser> {
    try {
      return await this.keycloakService.getUserById(userId);
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération de l'utilisateur ${userId}`, error);
      throw new NotFoundException('Utilisateur non trouvé');
    }
  }

  /**
   * Lister les utilisateurs avec pagination
   */
  async getUsers(query: GetUsersQueryDto): Promise<{
    users: KeycloakUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const { page = 0, limit = 20 } = query;
      const first = page * limit;
      
      // Récupérer les utilisateurs et le total en parallèle pour optimiser
      const [users, total] = await Promise.all([
        this.keycloakService.getUsers(first, limit),
        this.keycloakService.getUsersCount()
      ]);
      
      return {
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des utilisateurs', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un utilisateur
   */
  async updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<KeycloakUser> {
    try {
      // Préparer les données pour Keycloak
      const keycloakUserData: Partial<KeycloakUser> = {
        email: updateUserDto.email,
        firstName: updateUserDto.firstName,
        lastName: updateUserDto.lastName,
        enabled: updateUserDto.enabled,
      };

      // Ajouter le téléphone dans les attributs si fourni
      if (updateUserDto.phone) {
        keycloakUserData.attributes = {
          phone: [updateUserDto.phone],
        };
      }

      // Mettre à jour dans Keycloak
      await this.keycloakService.updateUser(userId, keycloakUserData);
      
      // Retourner l'utilisateur mis à jour
      return await this.keycloakService.getUserById(userId);
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour de l'utilisateur ${userId}`, error);
      throw error;
    }
  }

  /**
   * Désactiver un utilisateur
   */
  async disableUser(userId: string): Promise<{ message: string }> {
    try {
      await this.keycloakService.disableUser(userId);
      return { message: 'Utilisateur désactivé avec succès' };
    } catch (error) {
      this.logger.error(`Erreur lors de la désactivation de l'utilisateur ${userId}`, error);
      throw error;
    }
  }

  /**
   * Supprimer un utilisateur
   */
  async deleteUser(userId: string): Promise<{ message: string }> {
    try {
      await this.keycloakService.deleteUser(userId);
      return { message: 'Utilisateur supprimé avec succès' };
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression de l'utilisateur ${userId}`, error);
      throw error;
    }
  }
}