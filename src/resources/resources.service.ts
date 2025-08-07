import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourceDefinition, COMMON_ACTIONS, RESOURCE_CATEGORIES } from './interfaces/resource.interface';
import { PermissionsService } from '../permissions/permissions.service';
import { Resource, ResourceDocument } from './schemas/resource.schema';

@Injectable()
export class ResourcesService implements OnModuleInit {
  private readonly logger = new Logger(ResourcesService.name);
  private resources: Map<string, ResourceDefinition> = new Map();

  constructor(
    @InjectModel(Resource.name) private resourceModel: Model<ResourceDocument>,
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * Initialisation du module - charger les ressources depuis la base de données
   */
  async onModuleInit() {
    await this.initializeSystemResources();
    await this.loadResourcesFromDatabase();
  }

  /**
   * Créer une nouvelle ressource
   */
  async createResource(createResourceDto: CreateResourceDto): Promise<ResourceDefinition> {
    try {
      // Vérifier si la ressource existe déjà
      if (this.resources.has(createResourceDto.name)) {
        throw new ConflictException(`La ressource '${createResourceDto.name}' existe déjà`);
      }

      // Valider les actions
      this.validateActions(createResourceDto.actions);

      // Créer la ressource dans MongoDB
      const resourceDoc = new this.resourceModel({
        name: createResourceDto.name,
        description: createResourceDto.description,
        actions: createResourceDto.actions,
        category: createResourceDto.category || RESOURCE_CATEGORIES.CUSTOM,
        defaultScope: createResourceDto.defaultScope,
        isSystem: false,
        customId: this.generateResourceId(),
      });

      const savedResource = await resourceDoc.save();

      const resource: ResourceDefinition = {
        id: savedResource.customId,
        name: createResourceDto.name,
        description: createResourceDto.description,
        actions: createResourceDto.actions,
        category: createResourceDto.category || RESOURCE_CATEGORIES.CUSTOM,
        defaultScope: createResourceDto.defaultScope,
        isSystem: false,
        createdAt: (savedResource as any).createdAt || new Date(),
        updatedAt: (savedResource as any).updatedAt || (savedResource as any).createdAt || new Date(),
      };

      this.resources.set(resource.name, resource);

      // Créer les permissions associées
      await this.createResourcePermissions(resource);
      
      this.logger.log(`Ressource créée: ${resource.name} avec ${resource.actions.length} actions`);
      
      return resource;
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Erreur lors de la création de la ressource', error);
      throw new BadRequestException('Impossible de créer la ressource');
    }
  }

  /**
   * Récupérer toutes les ressources
   */
  async getAllResources(): Promise<ResourceDefinition[]> {
    return Array.from(this.resources.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Récupérer une ressource par ID
   */
  async getResourceById(id: string): Promise<ResourceDefinition | null> {
    const resource = Array.from(this.resources.values()).find(r => r.id === id);
    return resource || null;
  }

  /**
   * Récupérer une ressource par nom
   */
  async getResourceByName(name: string): Promise<ResourceDefinition | null> {
    return this.resources.get(name) || null;
  }

  /**
   * Mettre à jour une ressource
   */
  async updateResource(id: string, updateResourceDto: UpdateResourceDto): Promise<ResourceDefinition> {
    try {
      const resource = await this.getResourceById(id);
      if (!resource) {
        throw new NotFoundException(`Ressource avec l'ID '${id}' non trouvée`);
      }

      // Vérifier que ce n'est pas une ressource système
      if (resource.isSystem) {
        throw new BadRequestException('Impossible de modifier une ressource système');
      }

      // Valider les nouvelles actions si fournies
      if (updateResourceDto.actions) {
        this.validateActions(updateResourceDto.actions);
      }

      // Mettre à jour dans MongoDB
      const updateData: any = {};
      if (updateResourceDto.description !== undefined) {
        updateData.description = updateResourceDto.description;
      }
      if (updateResourceDto.actions !== undefined) {
        updateData.actions = updateResourceDto.actions;
      }
      if (updateResourceDto.category !== undefined) {
        updateData.category = updateResourceDto.category;
      }
      if (updateResourceDto.defaultScope !== undefined) {
        updateData.defaultScope = updateResourceDto.defaultScope;
      }

      const updatedDoc = await this.resourceModel.findOneAndUpdate(
        { customId: id },
        updateData,
        { new: true }
      );

      if (!updatedDoc) {
        throw new NotFoundException(`Ressource avec l'ID '${id}' non trouvée dans la base de données`);
      }

      // Mettre à jour les champs
      if (updateResourceDto.description !== undefined) {
        resource.description = updateResourceDto.description;
      }
      if (updateResourceDto.actions !== undefined) {
        resource.actions = updateResourceDto.actions;
      }
      if (updateResourceDto.category !== undefined) {
        resource.category = updateResourceDto.category;
      }
      if (updateResourceDto.defaultScope !== undefined) {
        resource.defaultScope = updateResourceDto.defaultScope;
      }
      
      resource.updatedAt = (updatedDoc as any).updatedAt || new Date();

      this.resources.set(resource.name, resource);

      // Mettre à jour les permissions associées si les actions ont changé
      if (updateResourceDto.actions !== undefined) {
        await this.updateResourcePermissions(resource);
      }
      
      this.logger.log(`Ressource mise à jour: ${resource.name}`);
      
      return resource;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la mise à jour de la ressource ${id}`, error);
      throw new BadRequestException('Impossible de mettre à jour la ressource');
    }
  }

  /**
   * Supprimer une ressource
   */
  async deleteResource(id: string): Promise<{ message: string }> {
    try {
      const resource = await this.getResourceById(id);
      if (!resource) {
        throw new NotFoundException(`Ressource avec l'ID '${id}' non trouvée`);
      }

      // Vérifier que ce n'est pas une ressource système
      if (resource.isSystem) {
        throw new BadRequestException('Impossible de supprimer une ressource système');
      }

      // Supprimer toutes les permissions associées à cette ressource
      await this.deleteResourcePermissions(resource.name);

      // Supprimer de MongoDB
      await this.resourceModel.findOneAndDelete({ customId: id });

      this.resources.delete(resource.name);
      
      this.logger.log(`Ressource supprimée: ${resource.name}`);
      
      return { message: `Ressource '${resource.name}' supprimée avec succès` };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la suppression de la ressource ${id}`, error);
      throw new BadRequestException('Impossible de supprimer la ressource');
    }
  }

  /**
   * Rechercher des ressources par critères
   */
  async searchResources(query: string): Promise<ResourceDefinition[]> {
    const allResources = await this.getAllResources();
    
    if (!query) {
      return allResources;
    }

    const searchTerm = query.toLowerCase();
    
    return allResources.filter(resource => 
      resource.name.toLowerCase().includes(searchTerm) ||
      resource.description.toLowerCase().includes(searchTerm) ||
      (resource.category && resource.category.toLowerCase().includes(searchTerm)) ||
      resource.actions.some(action => action.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Créer les permissions associées à une ressource
   */
  private async createResourcePermissions(resource: ResourceDefinition): Promise<void> {
    try {
      for (const action of resource.actions) {
        const permissionName = resource.defaultScope 
          ? `${resource.name}:${action}:${resource.defaultScope}`
          : `${resource.name}:${action}`;

        // Vérifier si la permission existe déjà
        const existingPermission = await this.permissionsService.getPermissionByName(permissionName);
        if (!existingPermission) {
          await this.permissionsService.createPermission({
            name: permissionName,
            description: this.generatePermissionDescription(resource.name, action, resource.defaultScope),
            resource: resource.name,
            action: action,
            scope: resource.defaultScope,
            category: resource.category,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la création des permissions pour la ressource ${resource.name}`, error);
      throw new BadRequestException('Erreur lors de la création des permissions associées');
    }
  }

  /**
   * Mettre à jour les permissions associées à une ressource
   */
  private async updateResourcePermissions(resource: ResourceDefinition): Promise<void> {
    try {
      // Supprimer toutes les anciennes permissions de cette ressource
      await this.deleteResourcePermissions(resource.name);
      
      // Créer les nouvelles permissions
      await this.createResourcePermissions(resource);
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour des permissions pour la ressource ${resource.name}`, error);
      throw new BadRequestException('Erreur lors de la mise à jour des permissions associées');
    }
  }

  /**
   * Supprimer toutes les permissions associées à une ressource
   */
  private async deleteResourcePermissions(resourceName: string): Promise<void> {
    try {
      const allPermissions = await this.permissionsService.getAllPermissions();
      const resourcePermissions = allPermissions.filter(permission => 
        permission.resource === resourceName
      );

      for (const permission of resourcePermissions) {
        try {
          await this.permissionsService.deletePermission(permission.id);
        } catch (error) {
          this.logger.warn(`Impossible de supprimer la permission ${permission.name}`, error);
        }
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression des permissions pour la ressource ${resourceName}`, error);
    }
  }

  /**
   * Initialiser les ressources système par défaut
   */
  private async initializeSystemResources(): Promise<void> {
    try {
      const systemResources = [
        {
          name: 'users',
          description: 'Gestion des utilisateurs du système',
          actions: ['read', 'create', 'update', 'delete', 'manage', 'impersonate'],
          category: RESOURCE_CATEGORIES.SYSTEM,
        },
        {
          name: 'roles',
          description: 'Gestion des rôles et permissions',
          actions: ['read', 'create', 'update', 'delete', 'assign'],
          category: RESOURCE_CATEGORIES.SYSTEM,
        },
        {
          name: 'permissions',
          description: 'Gestion des permissions système',
          actions: ['read', 'create', 'update', 'delete', 'assign'],
          category: RESOURCE_CATEGORIES.SYSTEM,
        },
        {
          name: 'system',
          description: 'Administration système',
          actions: ['config', 'logs', 'monitoring', 'backup', 'maintenance'],
          category: RESOURCE_CATEGORIES.SYSTEM,
        },
        {
          name: 'documents',
          description: 'Gestion des documents',
          actions: ['read', 'create', 'update', 'delete', 'approve', 'publish'],
          category: RESOURCE_CATEGORIES.BUSINESS,
        },
        {
          name: 'services',
          description: 'Gestion des services',
          actions: ['read', 'create', 'update', 'delete', 'manage', 'configure'],
          category: RESOURCE_CATEGORIES.BUSINESS,
        },
      ];

      for (const resourceData of systemResources) {
        const existingResource = await this.resourceModel.findOne({ name: resourceData.name });
        
        if (!existingResource) {
          const systemResource = new this.resourceModel({
            name: resourceData.name,
            description: resourceData.description,
            actions: resourceData.actions,
            category: resourceData.category,
            isSystem: true,
            customId: this.generateResourceId(),
          });
          
          await systemResource.save();
          this.logger.log(`Ressource système créée en base: ${resourceData.name}`);
        }
      }
      
      // Charger toutes les ressources système dans la Map
      const systemResources_db = await this.resourceModel.find({ isSystem: true });
      
      systemResources_db.forEach(resourceDoc => {
        const resource: ResourceDefinition = {
          id: resourceDoc.customId,
          name: resourceDoc.name,
          description: resourceDoc.description,
          actions: resourceDoc.actions,
          category: resourceDoc.category,
          defaultScope: resourceDoc.defaultScope,
          isSystem: resourceDoc.isSystem,
          createdAt: (resourceDoc as any).createdAt || new Date(),
          updatedAt: (resourceDoc as any).updatedAt || (resourceDoc as any).createdAt || new Date(),
        };
        
        this.resources.set(resourceDoc.name, resource);
      });
      
      this.logger.log(`${systemResources_db.length} ressources système initialisées depuis la base de données`);
    } catch (error) {
      this.logger.error('Erreur lors de l\'initialisation des ressources système', error);
    }
  }

  /**
   * Charger les ressources personnalisées depuis la base de données
   */
  private async loadResourcesFromDatabase(): Promise<void> {
    try {
      const customResources = await this.resourceModel.find({ isSystem: false });
      
      customResources.forEach(resourceDoc => {
        const resource: ResourceDefinition = {
          id: resourceDoc.customId,
          name: resourceDoc.name,
          description: resourceDoc.description,
          actions: resourceDoc.actions,
          category: resourceDoc.category,
          defaultScope: resourceDoc.defaultScope,
          isSystem: resourceDoc.isSystem,
          createdAt: (resourceDoc as any).createdAt || new Date(),
          updatedAt: (resourceDoc as any).updatedAt || (resourceDoc as any).createdAt || new Date(),
        };
        
        this.resources.set(resourceDoc.name, resource);
      });
      
      this.logger.log(`${customResources.length} ressources personnalisées chargées depuis la base de données`);
    } catch (error) {
      this.logger.error('Erreur lors du chargement des ressources depuis la base de données', error);
    }
  }

  /**
   * Générer un ID unique pour une ressource
   */
  private generateResourceId(): string {
    return `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Valider les actions d'une ressource
   */
  private validateActions(actions: string[]): void {
    if (!actions || actions.length === 0) {
      throw new BadRequestException('Au moins une action doit être définie pour la ressource');
    }

    for (const action of actions) {
      if (!/^[a-z_]+$/.test(action)) {
        throw new BadRequestException(`Action invalide: ${action}. Seules les lettres minuscules et underscores sont autorisés`);
      }
    }

    // Vérifier les doublons
    const uniqueActions = new Set(actions);
    if (uniqueActions.size !== actions.length) {
      throw new BadRequestException('Les actions doivent être uniques');
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
      archive: 'archiver',
      config: 'configurer',
      logs: 'consulter les logs',
      monitoring: 'surveiller',
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
    };

    const actionDesc = actionDescriptions[action] || action;
    const resourceDesc = resourceDescriptions[resource] || resource;
    
    let description = `Permet de ${actionDesc} ${resourceDesc}`;
    
    if (scope) {
      const scopeDescriptions: { [key: string]: string } = {
        own: 'ses propres',
        all: 'tous les',
        department: 'ceux du département',
        team: 'ceux de l\'équipe',
      };
      const scopeDesc = scopeDescriptions[scope] || scope;
      description = `Permet de ${actionDesc} ${scopeDesc} ${resourceDesc}`;
    }

    return description;
  }
}