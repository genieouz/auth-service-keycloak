import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { KeycloakService } from '../keycloak/keycloak.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRolesDto, RemoveRolesDto } from './dto/assign-roles.dto';
import { RoleDefinition, UserRoleAssignment, SYSTEM_PERMISSIONS, SYSTEM_ROLES } from './interfaces/role.interface';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly keycloakService: KeycloakService) {}

  /**
   * Créer un nouveau rôle
   */
  async createRole(createRoleDto: CreateRoleDto): Promise<RoleDefinition> {
    try {
      // Vérifier si le rôle existe déjà
      const existingRole = await this.getRoleByName(createRoleDto.name);
      if (existingRole) {
        throw new ConflictException(`Le rôle '${createRoleDto.name}' existe déjà`);
      }

      // Valider les permissions
      this.validatePermissions(createRoleDto.permissions);

      // Créer le rôle dans Keycloak
      const roleId = await this.keycloakService.createRole({
        name: createRoleDto.name,
        description: createRoleDto.description,
        composite: createRoleDto.composite || false,
        attributes: {
          permissions: createRoleDto.permissions,
          ...(createRoleDto.attributes || {}),
        },
      });

      // Si c'est un rôle composite, assigner les rôles enfants
      if (createRoleDto.composite && createRoleDto.childRoles?.length > 0) {
        await this.assignChildRoles(createRoleDto.name, createRoleDto.childRoles);
      }

      this.logger.log(`Rôle créé: ${createRoleDto.name} (${roleId})`);

      return {
        id: roleId,
        name: createRoleDto.name,
        description: createRoleDto.description,
        permissions: createRoleDto.permissions,
        composite: createRoleDto.composite,
        childRoles: createRoleDto.childRoles,
        attributes: createRoleDto.attributes,
      };
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Erreur lors de la création du rôle', error);
      throw new BadRequestException('Impossible de créer le rôle');
    }
  }

  /**
   * Récupérer tous les rôles
   */
  async getAllRoles(): Promise<RoleDefinition[]> {
    try {
      const keycloakRoles = await this.keycloakService.getRealmRoles();
      
      return keycloakRoles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description || '',
        permissions: role.attributes?.permissions || [],
        composite: role.composite || false,
        childRoles: role.composites?.realm || [],
        attributes: this.extractCustomAttributes(role.attributes),
      }));
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des rôles', error);
      throw new BadRequestException('Impossible de récupérer les rôles');
    }
  }

  /**
   * Récupérer un rôle par nom
   */
  async getRoleByName(roleName: string): Promise<RoleDefinition | null> {
    try {
      const role = await this.keycloakService.getRoleByName(roleName);
      
      if (!role) {
        return null;
      }

      return {
        id: role.id,
        name: role.name,
        description: role.description || '',
        permissions: role.attributes?.permissions || [],
        composite: role.composite || false,
        childRoles: role.composites?.realm || [],
        attributes: this.extractCustomAttributes(role.attributes),
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération du rôle ${roleName}`, error);
      return null;
    }
  }

  /**
   * Mettre à jour un rôle
   */
  async updateRole(roleName: string, updateRoleDto: UpdateRoleDto): Promise<RoleDefinition> {
    try {
      const existingRole = await this.getRoleByName(roleName);
      if (!existingRole) {
        throw new NotFoundException(`Rôle '${roleName}' non trouvé`);
      }

      // Valider les nouvelles permissions si fournies
      if (updateRoleDto.permissions) {
        this.validatePermissions(updateRoleDto.permissions);
      }

      // Préparer les données de mise à jour
      const updateData: any = {
        description: updateRoleDto.description || existingRole.description,
        composite: updateRoleDto.composite !== undefined ? updateRoleDto.composite : existingRole.composite,
      };

      // Mettre à jour les attributs
      if (updateRoleDto.permissions || updateRoleDto.attributes) {
        updateData.attributes = {
          permissions: updateRoleDto.permissions || existingRole.permissions,
          ...(updateRoleDto.attributes || existingRole.attributes || {}),
        };
      }

      // Mettre à jour dans Keycloak
      await this.keycloakService.updateRole(roleName, updateData);

      // Gérer les rôles enfants si c'est un rôle composite
      if (updateRoleDto.composite && updateRoleDto.childRoles) {
        await this.updateChildRoles(roleName, updateRoleDto.childRoles);
      }

      this.logger.log(`Rôle mis à jour: ${roleName}`);

      return await this.getRoleByName(roleName);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la mise à jour du rôle ${roleName}`, error);
      throw new BadRequestException('Impossible de mettre à jour le rôle');
    }
  }

  /**
   * Supprimer un rôle
   */
  async deleteRole(roleName: string): Promise<{ message: string }> {
    try {
      // Vérifier que ce n'est pas un rôle système
      if (Object.values(SYSTEM_ROLES).includes(roleName as any)) {
        throw new BadRequestException('Impossible de supprimer un rôle système');
      }

      const existingRole = await this.getRoleByName(roleName);
      if (!existingRole) {
        throw new NotFoundException(`Rôle '${roleName}' non trouvé`);
      }

      // Vérifier qu'aucun utilisateur n'a ce rôle
      const usersWithRole = await this.keycloakService.getUsersWithRole(roleName);
      if (usersWithRole.length > 0) {
        throw new BadRequestException(`Impossible de supprimer le rôle '${roleName}': ${usersWithRole.length} utilisateur(s) l'utilisent encore`);
      }

      await this.keycloakService.deleteRole(roleName);
      
      this.logger.log(`Rôle supprimé: ${roleName}`);
      
      return { message: `Rôle '${roleName}' supprimé avec succès` };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la suppression du rôle ${roleName}`, error);
      throw new BadRequestException('Impossible de supprimer le rôle');
    }
  }

  /**
   * Assigner des rôles à un utilisateur
   */
  async assignRolesToUser(userId: string, assignRolesDto: AssignRolesDto): Promise<UserRoleAssignment> {
    try {
      // Vérifier que l'utilisateur existe
      const user = await this.keycloakService.getUserById(userId);
      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      // Vérifier que tous les rôles existent
      for (const roleName of assignRolesDto.roles) {
        const role = await this.getRoleByName(roleName);
        if (!role) {
          throw new BadRequestException(`Rôle '${roleName}' non trouvé`);
        }
      }

      // Assigner les rôles dans Keycloak
      await this.keycloakService.assignRolesToUser(userId, assignRolesDto.roles);

      // Calculer les permissions effectives
      const effectivePermissions = await this.calculateEffectivePermissions(assignRolesDto.roles);

      this.logger.log(`Rôles assignés à l'utilisateur ${userId}: ${assignRolesDto.roles.join(', ')}`);

      return {
        userId,
        roles: assignRolesDto.roles,
        effectivePermissions,
        assignedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Erreur lors de l'assignation des rôles à l'utilisateur ${userId}`, error);
      throw new BadRequestException('Impossible d\'assigner les rôles');
    }
  }

  /**
   * Retirer des rôles d'un utilisateur
   */
  async removeRolesFromUser(userId: string, removeRolesDto: RemoveRolesDto): Promise<{ message: string }> {
    try {
      // Vérifier que l'utilisateur existe
      const user = await this.keycloakService.getUserById(userId);
      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      // Retirer les rôles dans Keycloak
      await this.keycloakService.removeRolesFromUser(userId, removeRolesDto.roles);

      this.logger.log(`Rôles retirés de l'utilisateur ${userId}: ${removeRolesDto.roles.join(', ')}`);

      return { message: `Rôles retirés avec succès de l'utilisateur` };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Erreur lors du retrait des rôles de l'utilisateur ${userId}`, error);
      throw new BadRequestException('Impossible de retirer les rôles');
    }
  }

  /**
   * Récupérer les rôles d'un utilisateur
   */
  async getUserRoles(userId: string): Promise<UserRoleAssignment> {
    try {
      const userRoles = await this.keycloakService.getUserRoles(userId);
      const roleNames = userRoles.map(role => role.name);
      const effectivePermissions = await this.calculateEffectivePermissions(roleNames);

      return {
        userId,
        roles: roleNames,
        effectivePermissions,
        assignedAt: new Date(), // Keycloak ne fournit pas cette info, on utilise la date actuelle
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des rôles de l'utilisateur ${userId}`, error);
      throw new BadRequestException('Impossible de récupérer les rôles de l\'utilisateur');
    }
  }

  /**
   * Vérifier si un utilisateur a une permission spécifique
   */
  async userHasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const userRoleAssignment = await this.getUserRoles(userId);
      return userRoleAssignment.effectivePermissions.includes(permission);
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification de permission pour l'utilisateur ${userId}`, error);
      return false;
    }
  }

  /**
   * Vérifier si un utilisateur a un rôle spécifique
   */
  async userHasRole(userId: string, roleName: string): Promise<boolean> {
    try {
      const userRoleAssignment = await this.getUserRoles(userId);
      return userRoleAssignment.roles.includes(roleName);
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification de rôle pour l'utilisateur ${userId}`, error);
      return false;
    }
  }

  /**
   * Initialiser les rôles système par défaut
   */
  async initializeSystemRoles(): Promise<void> {
    try {
      const systemRoles = [
        {
          name: SYSTEM_ROLES.SUPER_ADMIN,
          description: 'Super administrateur avec tous les droits',
          permissions: Object.values(SYSTEM_PERMISSIONS),
          composite: false,
        },
        {
          name: SYSTEM_ROLES.ADMIN,
          description: 'Administrateur système',
          permissions: [
            SYSTEM_PERMISSIONS.USERS_READ,
            SYSTEM_PERMISSIONS.USERS_CREATE,
            SYSTEM_PERMISSIONS.USERS_UPDATE,
            SYSTEM_PERMISSIONS.USERS_DELETE,
            SYSTEM_PERMISSIONS.ROLES_READ,
            SYSTEM_PERMISSIONS.ROLES_CREATE,
            SYSTEM_PERMISSIONS.ROLES_UPDATE,
            SYSTEM_PERMISSIONS.ROLES_ASSIGN,
            SYSTEM_PERMISSIONS.PERMISSIONS_READ,
            SYSTEM_PERMISSIONS.PERMISSIONS_CREATE,
            SYSTEM_PERMISSIONS.PERMISSIONS_UPDATE,
            SYSTEM_PERMISSIONS.PERMISSIONS_DELETE,
            SYSTEM_PERMISSIONS.PERMISSIONS_ASSIGN,
            SYSTEM_PERMISSIONS.SYSTEM_LOGS,
            SYSTEM_PERMISSIONS.DOCUMENTS_READ,
            SYSTEM_PERMISSIONS.DOCUMENTS_CREATE,
            SYSTEM_PERMISSIONS.DOCUMENTS_UPDATE,
            SYSTEM_PERMISSIONS.DOCUMENTS_DELETE,
            SYSTEM_PERMISSIONS.SERVICES_READ,
            SYSTEM_PERMISSIONS.SERVICES_MANAGE,
          ],
          composite: false,
        },
        {
          name: SYSTEM_ROLES.MODERATOR,
          description: 'Modérateur avec droits limités',
          permissions: [
            SYSTEM_PERMISSIONS.USERS_READ,
            SYSTEM_PERMISSIONS.USERS_UPDATE,
            SYSTEM_PERMISSIONS.ROLES_READ,
            SYSTEM_PERMISSIONS.DOCUMENTS_READ,
            SYSTEM_PERMISSIONS.DOCUMENTS_CREATE,
            SYSTEM_PERMISSIONS.DOCUMENTS_UPDATE,
            SYSTEM_PERMISSIONS.SERVICES_READ,
          ],
          composite: false,
        },
        {
          name: SYSTEM_ROLES.USER,
          description: 'Utilisateur standard',
          permissions: [
            SYSTEM_PERMISSIONS.DOCUMENTS_READ,
            SYSTEM_PERMISSIONS.SERVICES_READ,
          ],
          composite: false,
        },
        {
          name: SYSTEM_ROLES.GUEST,
          description: 'Invité avec accès minimal',
          permissions: [
            SYSTEM_PERMISSIONS.SERVICES_READ,
          ],
          composite: false,
        },
      ];

      for (const roleData of systemRoles) {
        const existingRole = await this.getRoleByName(roleData.name);
        if (!existingRole) {
          await this.createRole(roleData);
          this.logger.log(`Rôle système créé: ${roleData.name}`);
        }
      }

      this.logger.log('Initialisation des rôles système terminée');
    } catch (error) {
      this.logger.error('Erreur lors de l\'initialisation des rôles système', error);
    }
  }

  /**
   * Calculer les permissions effectives d'un ensemble de rôles
   */
  private async calculateEffectivePermissions(roleNames: string[]): Promise<string[]> {
    const allPermissions = new Set<string>();

    for (const roleName of roleNames) {
      const role = await this.getRoleByName(roleName);
      if (role) {
        // Ajouter les permissions directes du rôle
        role.permissions.forEach(permission => allPermissions.add(permission));

        // Si c'est un rôle composite, ajouter les permissions des rôles enfants
        if (role.composite && role.childRoles) {
          const childPermissions = await this.calculateEffectivePermissions(role.childRoles);
          childPermissions.forEach(permission => allPermissions.add(permission));
        }
      }
    }

    return Array.from(allPermissions);
  }

  /**
   * Valider que les permissions sont valides
   */
  private validatePermissions(permissions: string[]): void {
    const validPermissions = Object.values(SYSTEM_PERMISSIONS);
    
    for (const permission of permissions) {
      // Vérifier le format permission (resource:action ou resource:action:scope)
      if (!/^[a-z_]+:[a-z_]+(?::[a-z_]+)?$/.test(permission)) {
        throw new BadRequestException(`Format de permission invalide: ${permission}. Format attendu: resource:action ou resource:action:scope`);
      }
      
      // Optionnel: vérifier que la permission est dans la liste des permissions système
      // (commenté pour permettre les permissions personnalisées)
      // if (!validPermissions.includes(permission)) {
      //   throw new BadRequestException(`Permission non reconnue: ${permission}`);
      // }
    }
  }

  /**
   * Assigner des rôles enfants à un rôle composite
   */
  private async assignChildRoles(parentRoleName: string, childRoleNames: string[]): Promise<void> {
    try {
      await this.keycloakService.addCompositeRoles(parentRoleName, childRoleNames);
    } catch (error) {
      this.logger.error(`Erreur lors de l'assignation des rôles enfants à ${parentRoleName}`, error);
      throw new BadRequestException('Impossible d\'assigner les rôles enfants');
    }
  }

  /**
   * Mettre à jour les rôles enfants d'un rôle composite
   */
  private async updateChildRoles(parentRoleName: string, newChildRoleNames: string[]): Promise<void> {
    try {
      // Récupérer les rôles enfants actuels
      const currentRole = await this.getRoleByName(parentRoleName);
      const currentChildRoles = currentRole?.childRoles || [];

      // Rôles à ajouter
      const rolesToAdd = newChildRoleNames.filter(role => !currentChildRoles.includes(role));
      
      // Rôles à retirer
      const rolesToRemove = currentChildRoles.filter(role => !newChildRoleNames.includes(role));

      // Ajouter les nouveaux rôles
      if (rolesToAdd.length > 0) {
        await this.keycloakService.addCompositeRoles(parentRoleName, rolesToAdd);
      }

      // Retirer les anciens rôles
      if (rolesToRemove.length > 0) {
        await this.keycloakService.removeCompositeRoles(parentRoleName, rolesToRemove);
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour des rôles enfants de ${parentRoleName}`, error);
      throw new BadRequestException('Impossible de mettre à jour les rôles enfants');
    }
  }

  /**
   * Extraire les attributs personnalisés (exclure les attributs système)
   */
  private extractCustomAttributes(attributes: any): { [key: string]: string } {
    if (!attributes) return {};

    const customAttributes: { [key: string]: string } = {};
    const systemAttributes = ['permissions'];

    Object.keys(attributes).forEach(key => {
      if (!systemAttributes.includes(key)) {
        customAttributes[key] = Array.isArray(attributes[key]) ? attributes[key][0] : attributes[key];
      }
    });

    return customAttributes;
  }
}