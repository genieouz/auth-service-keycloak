import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { AssignPermissionsDto, AddPermissionsToRoleDto } from './dto/assign-permissions.dto';
import { PermissionDefinition, UserPermissionAssignment, RolePermissionMapping, EXTENDED_SYSTEM_PERMISSIONS } from './interfaces/permission.interface';
import { KeycloakService } from '../keycloak/keycloak.service';
import { Permission, PermissionDocument } from './schemas/permission.schema';

@Injectable()
export class PermissionsService implements OnModuleInit {
  private readonly logger = new Logger(PermissionsService.name);
  private permissions: Map<string, PermissionDefinition> = new Map();

  constructor(
    private readonly keycloakService: KeycloakService,
    @InjectModel(Permission.name) private permissionModel: Model<PermissionDocument>,
  ) {}

  /**
   * Initialisation du module - charger les permissions depuis la base de données
   */
  async onModuleInit() {
    await this.initializeSystemPermissions();
    await this.loadPermissionsFromDatabase();
  }

  /**
   * Créer une nouvelle permission
   */
  async createPermission(createPermissionDto: CreatePermissionDto): Promise<PermissionDefinition> {
    try {
      // Vérifier si la permission existe déjà
      if (this.permissions.has(createPermissionDto.name)) {
        throw new ConflictException(`La permission '${createPermissionDto.name}' existe déjà`);
      }

      // Valider le format de la permission
      this.validatePermissionFormat(createPermissionDto.name);

      // Créer la permission dans MongoDB
      const permissionDoc = new this.permissionModel({
        name: createPermissionDto.name,
        description: createPermissionDto.description,
        resource: createPermissionDto.resource,
        action: createPermissionDto.action,
        scope: createPermissionDto.scope,
        category: createPermissionDto.category || 'custom',
        isSystem: false,
        customId: this.generatePermissionId(),
      });

      const savedPermission = await permissionDoc.save();

      const permission: PermissionDefinition = {
        id: savedPermission.customId,
        name: createPermissionDto.name,
        description: createPermissionDto.description,
        resource: createPermissionDto.resource,
        action: createPermissionDto.action,
        scope: createPermissionDto.scope,
        category: createPermissionDto.category || 'custom',
        createdAt: (savedPermission as any).createdAt || new Date(),
        updatedAt: (savedPermission as any).updatedAt || (savedPermission as any).createdAt || new Date(),
      };

      this.permissions.set(permission.name, permission);
      
      this.logger.log(`Permission créée: ${permission.name}`);
      
      return permission;
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Erreur lors de la création de la permission', error);
      throw new BadRequestException('Impossible de créer la permission');
    }
  }

  /**
   * Récupérer toutes les permissions
   */
  async getAllPermissions(): Promise<PermissionDefinition[]> {
    return Array.from(this.permissions.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Récupérer une permission par ID
   */
  async getPermissionById(id: string): Promise<PermissionDefinition | null> {
    const permission = Array.from(this.permissions.values()).find(p => p.id === id);
    return permission || null;
  }

  /**
   * Récupérer une permission par nom
   */
  async getPermissionByName(name: string): Promise<PermissionDefinition | null> {
    return this.permissions.get(name) || null;
  }

  /**
   * Mettre à jour une permission
   */
  async updatePermission(id: string, updatePermissionDto: UpdatePermissionDto): Promise<PermissionDefinition> {
    try {
      const permission = await this.getPermissionById(id);
      if (!permission) {
        throw new NotFoundException(`Permission avec l'ID '${id}' non trouvée`);
      }

      // Vérifier que ce n'est pas une permission système
      if (Object.values(EXTENDED_SYSTEM_PERMISSIONS).includes(permission.name as any)) {
        throw new BadRequestException('Impossible de modifier une permission système');
      }

      // Mettre à jour dans MongoDB
      const updateData: any = {};
      if (updatePermissionDto.description !== undefined) {
        updateData.description = updatePermissionDto.description;
      }
      if (updatePermissionDto.scope !== undefined) {
        updateData.scope = updatePermissionDto.scope;
      }
      if (updatePermissionDto.category !== undefined) {
        updateData.category = updatePermissionDto.category;
      }

      const updatedDoc = await this.permissionModel.findOneAndUpdate(
        { customId: id },
        updateData,
        { new: true }
      );

      if (!updatedDoc) {
        throw new NotFoundException(`Permission avec l'ID '${id}' non trouvée dans la base de données`);
      }

      // Mettre à jour les champs
      if (updatePermissionDto.description !== undefined) {
        permission.description = updatePermissionDto.description;
      }
      if (updatePermissionDto.scope !== undefined) {
        permission.scope = updatePermissionDto.scope;
      }
      if (updatePermissionDto.category !== undefined) {
        permission.category = updatePermissionDto.category;
      }
      
      permission.updatedAt = (updatedDoc as any).updatedAt || new Date();

      this.permissions.set(permission.name, permission);
      
      this.logger.log(`Permission mise à jour: ${permission.name}`);
      
      return permission;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la mise à jour de la permission ${id}`, error);
      throw new BadRequestException('Impossible de mettre à jour la permission');
    }
  }

  /**
   * Supprimer une permission
   */
  async deletePermission(id: string): Promise<{ message: string }> {
    try {
      const permission = await this.getPermissionById(id);
      if (!permission) {
        throw new NotFoundException(`Permission avec l'ID '${id}' non trouvée`);
      }

      // Vérifier que ce n'est pas une permission système
      if (Object.values(EXTENDED_SYSTEM_PERMISSIONS).includes(permission.name as any)) {
        throw new BadRequestException('Impossible de supprimer une permission système');
      }

      // Vérifier qu'aucun rôle n'utilise cette permission
      const roles = await this.keycloakService.getRealmRoles();
      const rolesUsingPermission = roles.filter(role => 
        role.attributes?.permissions?.includes(permission.name)
      );

      if (rolesUsingPermission.length > 0) {
        throw new BadRequestException(
          `Impossible de supprimer la permission '${permission.name}': utilisée par ${rolesUsingPermission.length} rôle(s)`
        );
      }

      // Supprimer de MongoDB
      await this.permissionModel.findOneAndDelete({ customId: id });

      this.permissions.delete(permission.name);
      
      this.logger.log(`Permission supprimée: ${permission.name}`);
      
      return { message: `Permission '${permission.name}' supprimée avec succès` };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la suppression de la permission ${id}`, error);
      throw new BadRequestException('Impossible de supprimer la permission');
    }
  }

  /**
   * Assigner des permissions directement à un utilisateur
   */
  async assignPermissionsToUser(userId: string, assignPermissionsDto: AssignPermissionsDto): Promise<UserPermissionAssignment> {
    try {
      // Vérifier que l'utilisateur existe
      const user = await this.keycloakService.getUserById(userId);
      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      // Valider que toutes les permissions existent
      for (const permissionName of assignPermissionsDto.permissions) {
        if (!this.permissions.has(permissionName)) {
          throw new BadRequestException(`Permission '${permissionName}' non trouvée`);
        }
      }

      // Récupérer les permissions actuelles de l'utilisateur
      const currentPermissions = user.attributes?.directPermissions || [];
      
      // Fusionner avec les nouvelles permissions (éviter les doublons)
      const allPermissions = [...new Set([...currentPermissions, ...assignPermissionsDto.permissions])];

      // Mettre à jour l'utilisateur dans Keycloak
      await this.keycloakService.updateUser(userId, {
        attributes: {
          ...user.attributes,
          directPermissions: allPermissions,
        },
      });

      this.logger.log(`Permissions assignées directement à l'utilisateur ${userId}: ${assignPermissionsDto.permissions.join(', ')}`);

      return {
        userId,
        permissions: allPermissions,
        assignedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Erreur lors de l'assignation des permissions à l'utilisateur ${userId}`, error);
      throw new BadRequestException('Impossible d\'assigner les permissions');
    }
  }

  /**
   * Récupérer toutes les permissions d'un utilisateur (rôles + directes)
   */
  async getAllUserPermissions(userId: string): Promise<UserPermissionAssignment> {
    try {
      const user = await this.keycloakService.getUserById(userId);
      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      // Permissions directes
      const directPermissions = user.attributes?.directPermissions || [];

      // Permissions via les rôles
      const userRoles = await this.keycloakService.getUserRoles(userId);
      const rolePermissions: string[] = [];

      for (const role of userRoles) {
        const rolePerms = role.attributes?.permissions || [];
        rolePermissions.push(...rolePerms);
      }

      // Fusionner toutes les permissions (éviter les doublons)
      const allPermissions = [...new Set([...directPermissions, ...rolePermissions])];

      return {
        userId,
        permissions: allPermissions,
        assignedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la récupération des permissions de l'utilisateur ${userId}`, error);
      throw new BadRequestException('Impossible de récupérer les permissions de l\'utilisateur');
    }
  }

  /**
   * Récupérer les permissions d'un rôle
   */
  async getRolePermissions(roleName: string): Promise<RolePermissionMapping> {
    try {
      const role = await this.keycloakService.getRoleByName(roleName);
      if (!role) {
        throw new NotFoundException(`Rôle '${roleName}' non trouvé`);
      }

      const permissions = role.attributes?.permissions || [];

      return {
        roleName,
        permissions,
        updatedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la récupération des permissions du rôle ${roleName}`, error);
      throw new BadRequestException('Impossible de récupérer les permissions du rôle');
    }
  }

  /**
   * Ajouter des permissions à un rôle
   */
  async addPermissionsToRole(roleName: string, addPermissionsDto: AddPermissionsToRoleDto): Promise<RolePermissionMapping> {
    try {
      const role = await this.keycloakService.getRoleByName(roleName);
      if (!role) {
        throw new NotFoundException(`Rôle '${roleName}' non trouvé`);
      }

      // Valider que toutes les permissions existent
      for (const permissionName of addPermissionsDto.permissions) {
        if (!this.permissions.has(permissionName)) {
          throw new BadRequestException(`Permission '${permissionName}' non trouvée`);
        }
      }
      // Récupérer les permissions actuelles du rôle
      const currentPermissions = role.attributes?.permissions || [];
      
      // Fusionner avec les nouvelles permissions (éviter les doublons)
      const allPermissions = [...new Set([...currentPermissions, ...addPermissionsDto.permissions])];

      // Mettre à jour le rôle dans Keycloak
      await this.keycloakService.updateRole(roleName, {
        ...role,
        attributes: {
          ...role.attributes,
          permissions: allPermissions,
        },
      });

      this.logger.log(`Permissions ajoutées au rôle ${roleName}: ${addPermissionsDto.permissions.join(', ')}`);

      return {
        roleName,
        permissions: allPermissions,
        updatedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Erreur lors de l'ajout des permissions au rôle ${roleName}`, error);
      throw new BadRequestException('Impossible d\'ajouter les permissions au rôle');
    }
  }

  /**
   * Retirer une permission d'un rôle
   */
  async removePermissionFromRole(roleName: string, permissionName: string): Promise<{ message: string }> {
    try {
      const role = await this.keycloakService.getRoleByName(roleName);
      if (!role) {
        throw new NotFoundException(`Rôle '${roleName}' non trouvé`);
      }

      // Récupérer les permissions actuelles du rôle
      const currentPermissions = role.attributes?.permissions || [];
      
      // Retirer la permission spécifiée
      const updatedPermissions = currentPermissions.filter(p => p !== permissionName);

      if (currentPermissions.length === updatedPermissions.length) {
        throw new NotFoundException(`Permission '${permissionName}' non trouvée dans le rôle '${roleName}'`);
      }

      // Mettre à jour le rôle dans Keycloak
      await this.keycloakService.updateRole(roleName, {
        attributes: {
          ...role.attributes,
          permissions: updatedPermissions,
        },
      });

      this.logger.log(`Permission retirée du rôle ${roleName}: ${permissionName}`);

      return { message: `Permission '${permissionName}' retirée du rôle '${roleName}' avec succès` };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Erreur lors du retrait de la permission ${permissionName} du rôle ${roleName}`, error);
      throw new BadRequestException('Impossible de retirer la permission du rôle');
    }
  }

  /**
   * Rechercher des permissions par critères
   */
  async searchPermissions(query: string): Promise<PermissionDefinition[]> {
    const allPermissions = await this.getAllPermissions();
    
    if (!query) {
      return allPermissions;
    }

    const searchTerm = query.toLowerCase();
    
    return allPermissions.filter(permission => 
      permission.name.toLowerCase().includes(searchTerm) ||
      permission.description.toLowerCase().includes(searchTerm) ||
      permission.resource.toLowerCase().includes(searchTerm) ||
      permission.action.toLowerCase().includes(searchTerm) ||
      (permission.category && permission.category.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Initialiser les permissions système
   */
  private async initializeSystemPermissions(): Promise<void> {
    try {
      // Vérifier et créer les permissions système dans MongoDB si elles n'existent pas
      for (const [key, permissionName] of Object.entries(EXTENDED_SYSTEM_PERMISSIONS)) {
        const existingPermission = await this.permissionModel.findOne({ name: permissionName });
        
        if (!existingPermission) {
          const [resource, action, scope] = permissionName.split(':');
          
          const systemPermission = new this.permissionModel({
            name: permissionName,
            description: this.generatePermissionDescription(resource, action, scope),
            resource,
            action,
            scope,
            category: 'system',
            isSystem: true,
            customId: this.generatePermissionId(),
          });
          
          await systemPermission.save();
          this.logger.log(`Permission système créée en base: ${permissionName}`);
        }
      }
      
      // Charger toutes les permissions système dans la Map
      const systemPermissions = await this.permissionModel.find({ isSystem: true });
      
      systemPermissions.forEach(permissionDoc => {
        const permission: PermissionDefinition = {
          id: permissionDoc.customId,
          name: permissionDoc.name,
          description: permissionDoc.description,
          resource: permissionDoc.resource,
          action: permissionDoc.action,
          scope: permissionDoc.scope,
          category: permissionDoc.category,
          createdAt: (permissionDoc as any).createdAt || new Date(),
          updatedAt: (permissionDoc as any).updatedAt || (permissionDoc as any).createdAt || new Date(),
        };
        
        this.permissions.set(permissionDoc.name, permission);
      });
      
      this.logger.log(`${systemPermissions.length} permissions système initialisées depuis la base de données`);
    } catch (error) {
      this.logger.error('Erreur lors de l\'initialisation des permissions système', error);
      
      // Fallback: initialiser en mémoire seulement
      this.initializeSystemPermissionsInMemory();
    }
  }

  /**
   * Initialiser les permissions système en mémoire (fallback)
   */
  private initializeSystemPermissionsInMemory(): void {
    Object.entries(EXTENDED_SYSTEM_PERMISSIONS).forEach(([key, permissionName]) => {
      const [resource, action, scope] = permissionName.split(':');
      
      const permission: PermissionDefinition = {
        id: this.generatePermissionId(),
        name: permissionName,
        description: this.generatePermissionDescription(resource, action, scope),
        resource,
        action,
        scope,
        category: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.permissions.set(permissionName, permission);
    });

    this.logger.log(`${this.permissions.size} permissions système initialisées en mémoire (fallback)`);
  }

  /**
   * Charger les permissions personnalisées depuis la base de données
   */
  private async loadPermissionsFromDatabase(): Promise<void> {
    try {
      const customPermissions = await this.permissionModel.find({ isSystem: false });
      
      customPermissions.forEach(permissionDoc => {
        const permission: PermissionDefinition = {
          id: permissionDoc.customId,
          name: permissionDoc.name,
          description: permissionDoc.description,
          resource: permissionDoc.resource,
          action: permissionDoc.action,
          scope: permissionDoc.scope,
          category: permissionDoc.category,
          createdAt: (permissionDoc as any).createdAt || new Date(),
          updatedAt: (permissionDoc as any).updatedAt || (permissionDoc as any).createdAt || new Date(),
        };
        
        this.permissions.set(permissionDoc.name, permission);
      });
      
      this.logger.log(`${customPermissions.length} permissions personnalisées chargées depuis la base de données`);
    } catch (error) {
      this.logger.error('Erreur lors du chargement des permissions depuis la base de données', error);
    }
  }

  /**
   * Générer un ID unique pour une permission
   */
  private generatePermissionId(): string {
    return `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Valider le format d'une permission
   */
  private validatePermissionFormat(permissionName: string): void {
    if (!/^[a-z_]+:[a-z_]+(?::[a-z_]+)?$/.test(permissionName)) {
      throw new BadRequestException(
        `Format de permission invalide: ${permissionName}. Format attendu: resource:action ou resource:action:scope`
      );
    }
  }

  /**
   * Générer une description automatique pour une permission
   */
  private generatePermissionDescription(resource: string, action: string, scope?: string): string {
    const actionDescriptions: { [key: string]: string } = {
      read: 'lire',
      create: 'créer',
      update: 'modifier',
      delete: 'supprimer',
      manage: 'gérer',
      assign: 'assigner',
      approve: 'approuver',
      publish: 'publier',
      configure: 'configurer',
      send: 'envoyer',
      export: 'exporter',
      impersonate: 'se faire passer pour',
      backup: 'sauvegarder',
      maintenance: 'maintenir',
    };

    const resourceDescriptions: { [key: string]: string } = {
      users: 'les utilisateurs',
      roles: 'les rôles',
      permissions: 'les permissions',
      documents: 'les documents',
      services: 'les services',
      system: 'le système',
      notifications: 'les notifications',
      reports: 'les rapports',
      analytics: 'les analytics',
    };

    const actionDesc = actionDescriptions[action] || action;
    const resourceDesc = resourceDescriptions[resource] || resource;
    
    let description = `Permet de ${actionDesc} ${resourceDesc}`;
    
    if (scope) {
      const scopeDescriptions: { [key: string]: string } = {
        own: 'ses propres',
        all: 'tous les',
      };
      const scopeDesc = scopeDescriptions[scope] || scope;
      description = `Permet de ${actionDesc} ${scopeDesc} ${resourceDesc}`;
    }

    return description;
  }
}