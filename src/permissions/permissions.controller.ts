import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body, 
  Query,
  HttpCode, 
  HttpStatus, 
  Logger,
  UseGuards
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery,
  ApiBody,
  ApiBearerAuth
} from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { AssignPermissionsDto, AddPermissionsToRoleDto } from './dto/assign-permissions.dto';
import { ApiResponseDto } from '../common/dto/response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PermissionsController {
  private readonly logger = new Logger(PermissionsController.name);

  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Créer une nouvelle permission',
    description: 'Crée une nouvelle permission personnalisée dans le système'
  })
  @ApiBody({ type: CreatePermissionDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Permission créée avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Permission créée avec succès' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            name: { type: 'string', example: 'documents:read' },
            description: { type: 'string', example: 'Permet de lire les documents' },
            resource: { type: 'string', example: 'documents' },
            action: { type: 'string', example: 'read' },
            scope: { type: 'string', example: 'own', nullable: true },
            category: { type: 'string', example: 'system', nullable: true },
            createdAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' }
          }
        }
      },
      required: ['success', 'message', 'data']
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données de création invalides' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'La permission existe déjà' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async createPermission(@Body() createPermissionDto: CreatePermissionDto, @CurrentUser() currentUser: any) {
    try {
      const permission = await this.permissionsService.createPermission(createPermissionDto);
      
      this.logger.log(`Permission créée par ${currentUser.username}: ${createPermissionDto.name}`);
      
      return {
        success: true,
        message: 'Permission créée avec succès',
        data: permission,
      };
    } catch (error) {
      this.logger.error('Erreur lors de la création de la permission', error);
      throw error;
    }
  }

  @Get()
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ 
    summary: 'Lister toutes les permissions',
    description: 'Récupère la liste de toutes les permissions disponibles'
  })
  @ApiQuery({ 
    name: 'search', 
    description: 'Terme de recherche pour filtrer les permissions',
    required: false,
    example: 'documents'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste des permissions récupérée avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Permissions récupérées avec succès' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
              name: { type: 'string', example: 'documents:read' },
              description: { type: 'string', example: 'Permet de lire les documents' },
              resource: { type: 'string', example: 'documents' },
              action: { type: 'string', example: 'read' },
              scope: { type: 'string', example: 'own', nullable: true },
              category: { type: 'string', example: 'system', nullable: true },
              createdAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' },
              updatedAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' }
            }
          },
          example: [
            {
              id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
              name: 'documents:read',
              description: 'Permet de lire les documents',
              resource: 'documents',
              action: 'read',
              scope: 'own',
              category: 'system',
              createdAt: '2025-01-15T10:30:00.000Z',
              updatedAt: '2025-01-15T10:30:00.000Z'
            },
            {
              id: 'b2c3d4e5-f6g7-8901-bcde-f23456789012',
              name: 'users:create',
              description: 'Permet de créer des utilisateurs',
              resource: 'users',
              action: 'create',
              scope: null,
              category: 'admin',
              createdAt: '2025-01-15T10:30:00.000Z',
              updatedAt: '2025-01-15T10:30:00.000Z'
            }
          ]
        }
      },
      required: ['success', 'message', 'data']
    }
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async getAllPermissions(@Query('search') search?: string) {
    try {
      const permissions = search 
        ? await this.permissionsService.searchPermissions(search)
        : await this.permissionsService.getAllPermissions();
        
      return {
        success: true,
        message: 'Permissions récupérées avec succès',
        data: permissions,
      };
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des permissions', error);
      throw error;
    }
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ 
    summary: 'Récupérer une permission par ID',
    description: 'Récupère les détails d\'une permission spécifique'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Identifiant unique de la permission',
    example: 'perm_1234567890_abc123def'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Permission trouvée avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Permission trouvée avec succès' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            name: { type: 'string', example: 'documents:read' },
            description: { type: 'string', example: 'Permet de lire les documents' },
            resource: { type: 'string', example: 'documents' },
            action: { type: 'string', example: 'read' },
            scope: { type: 'string', example: 'own', nullable: true },
            category: { type: 'string', example: 'system', nullable: true },
            createdAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' }
          }
        }
      },
      required: ['success', 'message', 'data']
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Permission non trouvée' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async getPermissionById(@Param('id') id: string) {
    try {
      const permission = await this.permissionsService.getPermissionById(id);
      if (!permission) {
        return {
          success: false,
          message: 'Permission non trouvée',
        };
      }
      
      return {
        success: true,
        message: 'Permission trouvée avec succès',
        data: permission,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération de la permission ${id}`, error);
      throw error;
    }
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ 
    summary: 'Mettre à jour une permission',
    description: 'Modifie les propriétés d\'une permission existante'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Identifiant unique de la permission',
    example: 'perm_1234567890_abc123def'
  })
  @ApiBody({ type: UpdatePermissionDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Permission mise à jour avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données de mise à jour invalides ou permission système' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Permission non trouvée' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async updatePermission(@Param('id') id: string, @Body() updatePermissionDto: UpdatePermissionDto, @CurrentUser() currentUser: any) {
    try {
      const updatedPermission = await this.permissionsService.updatePermission(id, updatePermissionDto);
      
      this.logger.log(`Permission mise à jour par ${currentUser.username}: ${updatedPermission.name}`);
      
      return {
        success: true,
        message: 'Permission mise à jour avec succès',
        data: updatedPermission,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour de la permission ${id}`, error);
      throw error;
    }
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Supprimer une permission',
    description: 'Supprime définitivement une permission du système'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Identifiant unique de la permission',
    example: 'perm_1234567890_abc123def'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Permission supprimée avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Impossible de supprimer la permission (utilisée par des rôles ou permission système)' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Permission non trouvée' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async deletePermission(@Param('id') id: string, @CurrentUser() currentUser: any) {
    try {
      const result = await this.permissionsService.deletePermission(id);
      
      this.logger.log(`Permission supprimée par ${currentUser.username}: ${id}`);
      
      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression de la permission ${id}`, error);
      throw error;
    }
  }

  @Post('users/:userId')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Assigner des permissions directement à un utilisateur',
    description: 'Assigne des permissions spécifiques directement à un utilisateur (en plus de celles des rôles)'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'Identifiant unique de l\'utilisateur',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @ApiBody({ type: AssignPermissionsDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Permissions assignées avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Permissions assignées avec succès' },
        data: {
          type: 'object',
          properties: {
            userId: { type: 'string', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            assignedPermissions: {
              type: 'array',
              items: { type: 'string' },
              example: ['documents:read', 'documents:write', 'users:read']
            },
            assignedAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' },
            assignedBy: { type: 'string', example: 'admin@example.com' }
          }
        }
      },
      required: ['success', 'message', 'data']
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données d\'assignation invalides' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur ou permission non trouvé' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async assignPermissionsToUser(@Param('userId') userId: string, @Body() assignPermissionsDto: AssignPermissionsDto, @CurrentUser() currentUser: any) {
    try {
      const assignment = await this.permissionsService.assignPermissionsToUser(userId, assignPermissionsDto);
      
      this.logger.log(`Permissions assignées par ${currentUser.username} à l'utilisateur ${userId}: ${assignPermissionsDto.permissions.join(', ')}`);
      
      return {
        success: true,
        message: 'Permissions assignées avec succès',
        data: assignment,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de l'assignation des permissions à l'utilisateur ${userId}`, error);
      throw error;
    }
  }

  @Get('users/:userId')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ 
    summary: 'Récupérer toutes les permissions d\'un utilisateur',
    description: 'Récupère toutes les permissions d\'un utilisateur (rôles + permissions directes)'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'Identifiant unique de l\'utilisateur',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Permissions de l\'utilisateur récupérées avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async getAllUserPermissions(@Param('userId') userId: string) {
    try {
      const userPermissions = await this.permissionsService.getAllUserPermissions(userId);
      return {
        success: true,
        message: 'Permissions de l\'utilisateur récupérées avec succès',
        data: userPermissions,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des permissions de l'utilisateur ${userId}`, error);
      throw error;
    }
  }

  @Get('roles/:roleName')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ 
    summary: 'Récupérer toutes les permissions d\'un rôle',
    description: 'Récupère toutes les permissions associées à un rôle spécifique'
  })
  @ApiParam({ 
    name: 'roleName', 
    description: 'Nom du rôle',
    example: 'gestionnaire_documents'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Permissions du rôle récupérées avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Rôle non trouvé' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async getRolePermissions(@Param('roleName') roleName: string) {
    try {
      const rolePermissions = await this.permissionsService.getRolePermissions(roleName);
      return {
        success: true,
        message: 'Permissions du rôle récupérées avec succès',
        data: rolePermissions,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des permissions du rôle ${roleName}`, error);
      throw error;
    }
  }

  @Post('roles/:roleName')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Ajouter des permissions à un rôle',
    description: 'Ajoute des permissions spécifiques à un rôle existant'
  })
  @ApiParam({ 
    name: 'roleName', 
    description: 'Nom du rôle',
    example: 'gestionnaire_documents'
  })
  @ApiBody({ type: AddPermissionsToRoleDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Permissions ajoutées au rôle avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données d\'ajout invalides' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Rôle ou permission non trouvé' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async addPermissionsToRole(@Param('roleName') roleName: string, @Body() addPermissionsDto: AddPermissionsToRoleDto, @CurrentUser() currentUser: any) {
    try {
      const rolePermissions = await this.permissionsService.addPermissionsToRole(roleName, addPermissionsDto);
      
      this.logger.log(`Permissions ajoutées par ${currentUser.username} au rôle ${roleName}: ${addPermissionsDto.permissions.join(', ')}`);
      
      return {
        success: true,
        message: 'Permissions ajoutées au rôle avec succès',
        data: rolePermissions,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de l'ajout des permissions au rôle ${roleName}`, error);
      throw error;
    }
  }

  @Delete('roles/:roleName/:permissionName')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Retirer une permission d\'un rôle',
    description: 'Retire une permission spécifique d\'un rôle'
  })
  @ApiParam({ 
    name: 'roleName', 
    description: 'Nom du rôle',
    example: 'gestionnaire_documents'
  })
  @ApiParam({ 
    name: 'permissionName', 
    description: 'Nom de la permission à retirer',
    example: 'documents:delete'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Permission retirée du rôle avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Rôle ou permission non trouvé' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async removePermissionFromRole(@Param('roleName') roleName: string, @Param('permissionName') permissionName: string, @CurrentUser() currentUser: any) {
    try {
      const result = await this.permissionsService.removePermissionFromRole(roleName, permissionName);
      
      this.logger.log(`Permission retirée par ${currentUser.username} du rôle ${roleName}: ${permissionName}`);
      
      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`Erreur lors du retrait de la permission ${permissionName} du rôle ${roleName}`, error);
      throw error;
    }
  }
}