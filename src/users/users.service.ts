import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { KeycloakService } from '../keycloak/keycloak.service';
import { StorageService, UploadResult } from '../storage/storage.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { KeycloakUser } from '../common/interfaces/keycloak.interface';
import { UserProfileDto } from '../common/dto/response.dto';
import { UserMapperUtil } from '../common/utils/user-mapper.util';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly keycloakService: KeycloakService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Récupérer un utilisateur par ID
   */
  async getUserById(userId: string): Promise<UserProfileDto> {
    try {
      const keycloakUser = await this.keycloakService.getUserById(userId);
      
      // Vérifier et rafraîchir l'URL d'avatar si nécessaire
      const updatedKeycloakUser = await this.refreshUserAvatarIfNeeded(keycloakUser);
      
      return UserMapperUtil.mapKeycloakUserToProfile(updatedKeycloakUser);
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
      
      // Rafraîchir les URLs d'avatar et mapper les utilisateurs
      const usersWithRefreshedAvatars = await Promise.all(
        users.map(user => this.refreshUserAvatarIfNeeded(user))
      );
      
      const mappedUsers = usersWithRefreshedAvatars.map(user => 
        UserMapperUtil.mapKeycloakUserToProfile(user)
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
   * Vérifier et rafraîchir l'URL d'avatar d'un utilisateur si nécessaire
   */
  private async refreshUserAvatarIfNeeded(keycloakUser: KeycloakUser): Promise<KeycloakUser> {
    try {
      const avatarUrl = keycloakUser.attributes?.avatarUrl?.[0];
      const avatarFileName = keycloakUser.attributes?.avatarFileName?.[0];
      const isSignedUrl = keycloakUser.attributes?.avatarIsSignedUrl?.[0] === 'true';
      const expiresAtStr = keycloakUser.attributes?.avatarExpiresAt?.[0];
      
      // Si pas d'avatar ou URL publique, pas besoin de rafraîchir
      if (!avatarUrl || !avatarFileName || !isSignedUrl) {
        return keycloakUser;
      }
      
      const expiresAt = expiresAtStr ? new Date(expiresAtStr) : undefined;
      
      // Vérifier si l'URL a besoin d'être rafraîchie
      const refreshResult = await this.storageService.refreshAvatarUrlIfNeeded(
        avatarFileName,
        avatarUrl,
        expiresAt
      );
      
      // Si l'URL a été mise à jour, mettre à jour Keycloak
      if (refreshResult.needsUpdate && keycloakUser.id) {
        const updatedAttributes = {
          ...keycloakUser.attributes,
          avatarUrl: [refreshResult.url],
          avatarIsSignedUrl: [refreshResult.isSignedUrl.toString()],
          ...(refreshResult.expiresAt && { 
            avatarExpiresAt: [refreshResult.expiresAt.toISOString()] 
          }),
        };
        
        // Mettre à jour dans Keycloak de manière asynchrone (ne pas bloquer la réponse)
        this.keycloakService.updateUser(keycloakUser.id, {
          attributes: updatedAttributes,
        }).catch(error => {
          this.logger.error(`Erreur lors de la mise à jour de l'URL d'avatar pour ${keycloakUser.id}`, error);
        });
        
        // Retourner l'utilisateur avec l'URL mise à jour
        return {
          ...keycloakUser,
          attributes: updatedAttributes,
        };
      }
      
      return keycloakUser;
    } catch (error) {
      this.logger.error(`Erreur lors du rafraîchissement de l'avatar pour l'utilisateur ${keycloakUser.id}`, error);
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
      return keycloakUsers.map(user => UserMapperUtil.mapKeycloakUserToProfile(user));
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
      const currentAvatarUrl = user.attributes?.avatarUrl?.[0];
      if (currentAvatarUrl) {
        const currentFileName = this.extractFileNameFromUrl(currentAvatarUrl);
        if (currentFileName) {
          await this.storageService.deleteAvatar(currentFileName);
        }
      }

      // Uploader le nouvel avatar
      const uploadResult = await this.storageService.uploadAvatar(file, userId);

      // Mettre à jour l'URL de l'avatar dans Keycloak
      await this.keycloakService.updateUser(userId, {
        attributes: {
          ...user.attributes,
          avatarUrl: [uploadResult.url],
          avatarFileName: [uploadResult.fileName],
          avatarIsSignedUrl: [uploadResult.isSignedUrl.toString()],
          ...(uploadResult.expiresAt && { avatarExpiresAt: [uploadResult.expiresAt.toISOString()] }),
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
      const currentAvatarUrl = user.attributes?.avatarUrl?.[0];
      if (currentAvatarUrl) {
        const currentFileName = this.extractFileNameFromUrl(currentAvatarUrl);
        if (currentFileName) {
          await this.storageService.deleteAvatar(currentFileName);
        }
      }

      // Supprimer les références dans Keycloak
      const updatedAttributes = { ...user.attributes };
      delete updatedAttributes.avatarUrl;
      delete updatedAttributes.avatarFileName;
      delete updatedAttributes.avatarIsSignedUrl;
      delete updatedAttributes.avatarExpiresAt;

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
   * Extraire le nom de fichier depuis une URL
   */
  private extractFileNameFromUrl(url: string): string | null {
    try {
      const urlParts = url.split('/');
      const bucketIndex = urlParts.findIndex(part => part.includes('senegalservices-avatars'));
      if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
        return urlParts.slice(bucketIndex + 1).join('/');
      }
      return null;
    } catch (error) {
      this.logger.error('Erreur lors de l\'extraction du nom de fichier depuis l\'URL', error);
      return null;
    }
  }

  /**
   * Rafraîchir les URLs d'avatar expirées pour tous les utilisateurs
   * Méthode optimisée pour être appelée par des scripts externes ou CronJobs Kubernetes
   */
  async refreshExpiredAvatarUrls(): Promise<{ updated: number; errors: number }> {
    let updated = 0;
    let errors = 0;
    
    try {
      this.logger.log('Début du rafraîchissement des URLs d\'avatar expirées');
      
      // Récupérer tous les utilisateurs par batch
      let first = 0;
      const limit = 50;
      let hasMore = true;
      
      while (hasMore) {
        const users = await this.keycloakService.getUsers(first, limit);
        
        if (users.length === 0) {
          hasMore = false;
          break;
        }
        
        // Traiter chaque utilisateur
        for (const user of users) {
          try {
            const avatarUrl = user.attributes?.avatarUrl?.[0];
            const avatarFileName = user.attributes?.avatarFileName?.[0];
            const isSignedUrl = user.attributes?.avatarIsSignedUrl?.[0] === 'true';
            const expiresAtStr = user.attributes?.avatarExpiresAt?.[0];
            
            // Vérifier si cet utilisateur a besoin d'un rafraîchissement
            if (avatarUrl && avatarFileName && isSignedUrl) {
              const expiresAt = expiresAtStr ? new Date(expiresAtStr) : undefined;
              
              // Vérifier si l'URL expire dans les 24 heures
              if (this.storageService.isUrlExpiringSoon(expiresAt, 24)) {
                const refreshResult = await this.storageService.refreshAvatarUrlIfNeeded(
                  avatarFileName,
                  avatarUrl,
                  expiresAt
                );
                
                if (refreshResult.needsUpdate && user.id) {
                  await this.keycloakService.updateUser(user.id, {
                    attributes: {
                      ...user.attributes,
                      avatarUrl: [refreshResult.url],
                      avatarIsSignedUrl: [refreshResult.isSignedUrl.toString()],
                      ...(refreshResult.expiresAt && { 
                        avatarExpiresAt: [refreshResult.expiresAt.toISOString()] 
                      }),
                    },
                  });
                  
                  updated++;
                  this.logger.log(`URL d'avatar rafraîchie pour l'utilisateur ${user.id}`);
                }
              }
            }
          } catch (error) {
            errors++;
            this.logger.error(`Erreur lors du rafraîchissement pour l'utilisateur ${user.id}`, error);
          }
        }
        
        first += limit;
        
        // Pause courte entre les batches pour éviter la surcharge
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      this.logger.log(`Rafraîchissement terminé: ${updated} URLs mises à jour, ${errors} erreurs`);
      
    } catch (error) {
      this.logger.error('Erreur lors du rafraîchissement global des URLs d\'avatar', error);
    }
    
    return { updated, errors };
  }
}