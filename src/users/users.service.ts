import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { KeycloakService } from '../keycloak/keycloak.service';
import { StorageService, UploadResult } from '../storage/storage.service';
import { PermissionsService } from '../permissions/permissions.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { KeycloakUser } from '../common/interfaces/keycloak.interface';
import { UserProfileDto, PermissionsDto } from '../common/dto/response.dto';
import { UserMapperUtil } from '../common/utils/user-mapper.util';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly keycloakService: KeycloakService,
    private readonly storageService: StorageService,
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * Récupérer un utilisateur par ID
   */
  async getUserById(userId: string): Promise<UserProfileDto> {
    try {
      // Récupérer l'utilisateur et ses rôles en une seule fois
      const { user: keycloakUser, roles: userRoles } = await this.keycloakService.getUserWithRoles(userId);
      const realmRoles = userRoles.map(role => role.name);
      const clientRoles: string[] = []; // À implémenter si nécessaire
      
      // Générer l'URL d'avatar à la demande si l'utilisateur en a un
      const updatedKeycloakUser = await this.generateAvatarUrlIfNeeded(keycloakUser);
      
      return UserMapperUtil.mapKeycloakUserToProfile(updatedKeycloakUser, realmRoles, clientRoles);
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération de l'utilisateur ${userId}`, error);
      throw new NotFoundException('Utilisateur non trouvé');
    }
  }

  /**
   * Lister les utilisateurs avec pagination
   */
  async getUsers(query: GetUsersQueryDto): Promise<{
    users: UserProfileDto[];
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
      
      // Générer les URLs d'avatar et mapper les utilisateurs
      const usersWithRefreshedAvatars = await Promise.all(
        users.map(user => this.generateAvatarUrlIfNeeded(user))
      );
      
      // Récupérer les rôles pour chaque utilisateur
      const mappedUsers = await Promise.all(
        usersWithRefreshedAvatars.map(async (user) => {
          try {
            const userRoles = await this.keycloakService.getUserRoles(user.id);
            const realmRoles = userRoles.map(role => role.name);
            const clientRoles: string[] = []; // À implémenter si nécessaire
            
            return UserMapperUtil.mapKeycloakUserToProfile(user, realmRoles, clientRoles);
          } catch (error) {
            this.logger.warn(`Impossible de récupérer les rôles pour l'utilisateur ${user.id}`, error);
            // En cas d'erreur, retourner l'utilisateur sans rôles
            return UserMapperUtil.mapKeycloakUserToProfile(user, [], []);
          }
        })
      );
      
      return {
        users: mappedUsers,
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
   * Générer l'URL d'avatar d'un utilisateur à la demande
   */
  private async generateAvatarUrlIfNeeded(keycloakUser: KeycloakUser): Promise<KeycloakUser> {
    try {
      const avatarFileName = keycloakUser.attributes?.avatarFileName?.[0];
      
      // Si pas d'avatar, retourner tel quel
      if (!avatarFileName) {
        return keycloakUser;
      }
      
      // Générer une nouvelle URL à la demande
      const avatarUrl = await this.storageService.getAvatarUrl(avatarFileName);
      
      // Retourner l'utilisateur avec l'URL générée
      return {
        ...keycloakUser,
        attributes: {
          ...keycloakUser.attributes,
          avatarUrl: [avatarUrl],
        },
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la génération de l'URL d'avatar pour l'utilisateur ${keycloakUser.id}`, error);
      // En cas d'erreur, retourner l'utilisateur original
      return keycloakUser;
    }
  }

  /**
   * Mettre à jour un utilisateur
   */
  async updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<UserProfileDto> {
    try {
      // Utiliser le mapper pour convertir les données
      const keycloakUserData = UserMapperUtil.mapUpdateDtoToKeycloak(updateUserDto);
      // Mettre à jour dans Keycloak
      await this.keycloakService.updateUser(userId, keycloakUserData);
      
      // Retourner l'utilisateur mis à jour
      return await this.getUserById(userId);
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

  /**
   * Rechercher des utilisateurs
   */
  async searchUsers(query: string): Promise<UserProfileDto[]> {
    try {
      const keycloakUsers = await this.keycloakService.searchUsers(query);
      
      // Récupérer les rôles pour chaque utilisateur trouvé
      const usersWithRoles = await Promise.all(
        keycloakUsers.map(async (user) => {
          try {
            const userRoles = await this.keycloakService.getUserRoles(user.id);
            const realmRoles = userRoles.map(role => role.name);
            const clientRoles: string[] = []; // À implémenter si nécessaire
            
            return UserMapperUtil.mapKeycloakUserToProfile(user, realmRoles, clientRoles);
          } catch (error) {
            this.logger.warn(`Impossible de récupérer les rôles pour l'utilisateur ${user.id}`, error);
            // En cas d'erreur, retourner l'utilisateur sans rôles
            return UserMapperUtil.mapKeycloakUserToProfile(user, [], []);
          }
        })
      );
      
      return usersWithRoles;
    } catch (error) {
      this.logger.error(`Erreur lors de la recherche d'utilisateurs: ${query}`, error);
      throw error;
    }
  }

  /**
   * Uploader un avatar pour un utilisateur
   */
  async uploadAvatar(userId: string, file: any): Promise<UploadResult> {
    try {
      // Vérifier que l'utilisateur existe
      const user = await this.keycloakService.getUserById(userId);
      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      // Supprimer l'ancien avatar s'il existe
      const currentAvatarFileName = user.attributes?.avatarFileName?.[0];
      if (currentAvatarFileName) {
        await this.storageService.deleteAvatar(currentAvatarFileName);
      }

      // Uploader le nouvel avatar
      const uploadResult = await this.storageService.uploadAvatar(file, userId);

      // Stocker seulement la clé du fichier dans Keycloak
      await this.keycloakService.updateUser(userId, {
        attributes: {
          ...user.attributes,
          avatarFileName: [uploadResult.fileName],
        },
      });

      this.logger.log(`Avatar uploadé avec succès pour l'utilisateur ${userId}`);
      
      return uploadResult;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erreur lors de l'upload d'avatar pour l'utilisateur ${userId}`, error);
      throw error;
    }
  }

  /**
   * Supprimer l'avatar d'un utilisateur
   */
  async deleteAvatar(userId: string): Promise<void> {
    try {
      // Vérifier que l'utilisateur existe
      const user = await this.keycloakService.getUserById(userId);
      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      // Supprimer l'avatar du stockage
      const avatarFileName = user.attributes?.avatarFileName?.[0];
      if (avatarFileName) {
        await this.storageService.deleteAvatar(avatarFileName);
      }

      // Supprimer la référence dans Keycloak
      const updatedAttributes = { ...user.attributes };
      delete updatedAttributes.avatarFileName;

      await this.keycloakService.updateUser(userId, {
        attributes: updatedAttributes,
      });

      this.logger.log(`Avatar supprimé avec succès pour l'utilisateur ${userId}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la suppression d'avatar pour l'utilisateur ${userId}`, error);
      throw error;
    }
  }

  /**
   * Obtenir l'URL d'un avatar
   */
  async getAvatarUrl(fileName: string): Promise<string> {
    return await this.storageService.getAvatarUrl(fileName);
  }

  /**
   * Récupérer les permissions complètes d'un utilisateur
   */
  async getUserPermissions(userId: string): Promise<{
    effectivePermissions: string[];
    rolePermissions: string[];
    directPermissions: string[];
    roles: string[];
    // Permissions calculées pour la compatibilité
    canManageUsers: boolean;
    canViewUsers: boolean;
    isAdmin: boolean;
    isModerator: boolean;
    isUser: boolean;
  }> {
    try {
      // Récupérer toutes les permissions de l'utilisateur
      const userPermissions = await this.permissionsService.getAllUserPermissions(userId);
      
      // Récupérer les rôles de l'utilisateur
      const userRoles = await this.keycloakService.getUserRoles(userId);
      const roleNames = userRoles.map(role => role.name);
      
      // Calculer les permissions par rôles
      const rolePermissions: string[] = [];
      for (const role of userRoles) {
        const rolePerms = role.attributes?.permissions || [];
        rolePermissions.push(...rolePerms);
      }
      
      // Récupérer les permissions directes
      const user = await this.keycloakService.getUserById(userId);
      const directPermissions = user.attributes?.directPermissions || [];
      
      // Permissions effectives (toutes les permissions uniques)
      const effectivePermissions = [...new Set([...rolePermissions, ...directPermissions])];
      
      // Calculer les permissions héritées pour la compatibilité
      const canManageUsers = roleNames.includes('admin') || roleNames.includes('super_admin') || 
                            effectivePermissions.includes('users:manage');
      const canViewUsers = canManageUsers || roleNames.includes('moderator') || 
                          effectivePermissions.includes('users:read');
      const isAdmin = roleNames.includes('admin') || roleNames.includes('super_admin');
      const isModerator = roleNames.includes('moderator');
      const isUser = roleNames.includes('user') || roleNames.length === 0;
      
      return {
        effectivePermissions,
        rolePermissions: [...new Set(rolePermissions)],
        directPermissions,
        roles: roleNames,
        canManageUsers,
        canViewUsers,
        isAdmin,
        isModerator,
        isUser,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des permissions de l'utilisateur ${userId}`, error);
      
      // Fallback en cas d'erreur
      return {
        effectivePermissions: [],
        rolePermissions: [],
        directPermissions: [],
        roles: [],
        canManageUsers: false,
        canViewUsers: false,
        isAdmin: false,
        isModerator: false,
        isUser: true,
      };
    }
  }


}