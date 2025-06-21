import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body, 
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
  ApiBody,
  ApiBearerAuth
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRolesDto, RemoveRolesDto } from './dto/assign-roles.dto';
import { ApiResponseDto } from '../common/dto/response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('rôles et permissions')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
  private readonly logger = new Logger(RolesController.name);

  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Créer un nouveau rôle',
    description: 'Crée un nouveau rôle avec des permissions spécifiques'
  })
  @ApiBody({ type: CreateRoleDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Rôle créé avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données de création invalides' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Le rôle existe déjà' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async createRole(@Body() createRoleDto: CreateRoleDto, @CurrentUser() currentUser: any) {
    try {
      const role = await this.rolesService.createRole(createRoleDto);
      
      this.logger.log(`Rôle créé par ${currentUser.username}: ${createRoleDto.name}`);
      
      return {
        success: true,
        message: 'Rôle créé avec succès',
        data: role,
      };
    } catch (error) {
      this.logger.error('Erreur lors de la création du rôle', error);
      throw error;
    }
  }

  @Get()
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ 
    summary: 'Lister tous les rôles',
    description: 'Récupère la liste de tous les rôles disponibles'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste des rôles récupérée avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async getAllRoles() {
    try {
      const roles = await this.rolesService.getAllRoles();
      return {
        success: true,
        message: 'Rôles récupérés avec succès',
        data: roles,
      };
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des rôles', error);
      throw error;
    }
  }

  @Get(':roleName')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ 
    summary: 'Récupérer un rôle par nom',
    description: 'Récupère les détails d\'un rôle spécifique'
  })
  @ApiParam({ 
    name: 'roleName', 
    description: 'Nom du rôle',
    example: 'gestionnaire_documents'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Rôle trouvé avec succès',
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
  async getRoleByName(@Param('roleName') roleName: string) {
    try {
      const role = await this.rolesService.getRoleByName(roleName);
      if (!role) {
        return {
          success: false,
          message: 'Rôle non trouvé',
        };
      }
      
      return {
        success: true,
        message: 'Rôle trouvé avec succès',
        data: role,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération du rôle ${roleName}`, error);
      throw error;
    }
  }

  @Put(':roleName')
  @Roles(Role.ADMIN)
  @ApiOperation({ 
    summary: 'Mettre à jour un rôle',
    description: 'Modifie les propriétés d\'un rôle existant'
  })
  @ApiParam({ 
    name: 'roleName', 
    description: 'Nom du rôle',
    example: 'gestionnaire_documents'
  })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Rôle mis à jour avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données de mise à jour invalides' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Rôle non trouvé' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async updateRole(@Param('roleName') roleName: string, @Body() updateRoleDto: UpdateRoleDto, @CurrentUser() currentUser: any) {
    try {
      const updatedRole = await this.rolesService.updateRole(roleName, updateRoleDto);
      
      this.logger.log(`Rôle mis à jour par ${currentUser.username}: ${roleName}`);
      
      return {
        success: true,
        message: 'Rôle mis à jour avec succès',
        data: updatedRole,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour du rôle ${roleName}`, error);
      throw error;
    }
  }

  @Delete(':roleName')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Supprimer un rôle',
    description: 'Supprime définitivement un rôle du système'
  })
  @ApiParam({ 
    name: 'roleName', 
    description: 'Nom du rôle',
    example: 'gestionnaire_documents'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Rôle supprimé avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Impossible de supprimer le rôle (utilisé par des utilisateurs)' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Rôle non trouvé' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async deleteRole(@Param('roleName') roleName: string, @CurrentUser() currentUser: any) {
    try {
      const result = await this.rolesService.deleteRole(roleName);
      
      this.logger.log(`Rôle supprimé par ${currentUser.username}: ${roleName}`);
      
      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression du rôle ${roleName}`, error);
      throw error;
    }
  }

  @Post('users/:userId/assign')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Assigner des rôles à un utilisateur',
    description: 'Assigne un ou plusieurs rôles à un utilisateur spécifique'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'Identifiant unique de l\'utilisateur',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @ApiBody({ type: AssignRolesDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Rôles assignés avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données d\'assignation invalides' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur ou rôle non trouvé' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async assignRolesToUser(@Param('userId') userId: string, @Body() assignRolesDto: AssignRolesDto, @CurrentUser() currentUser: any) {
    try {
      const assignment = await this.rolesService.assignRolesToUser(userId, assignRolesDto);
      
      this.logger.log(`Rôles assignés par ${currentUser.username} à l'utilisateur ${userId}: ${assignRolesDto.roles.join(', ')}`);
      
      return {
        success: true,
        message: 'Rôles assignés avec succès',
        data: assignment,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de l'assignation des rôles à l'utilisateur ${userId}`, error);
      throw error;
    }
  }

  @Post('users/:userId/remove')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Retirer des rôles d\'un utilisateur',
    description: 'Retire un ou plusieurs rôles d\'un utilisateur spécifique'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'Identifiant unique de l\'utilisateur',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @ApiBody({ type: RemoveRolesDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Rôles retirés avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données de retrait invalides' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async removeRolesFromUser(@Param('userId') userId: string, @Body() removeRolesDto: RemoveRolesDto, @CurrentUser() currentUser: any) {
    try {
      const result = await this.rolesService.removeRolesFromUser(userId, removeRolesDto);
      
      this.logger.log(`Rôles retirés par ${currentUser.username} de l'utilisateur ${userId}: ${removeRolesDto.roles.join(', ')}`);
      
      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`Erreur lors du retrait des rôles de l'utilisateur ${userId}`, error);
      throw error;
    }
  }

  @Get('users/:userId')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ 
    summary: 'Récupérer les rôles d\'un utilisateur',
    description: 'Récupère tous les rôles et permissions d\'un utilisateur'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'Identifiant unique de l\'utilisateur',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Rôles de l\'utilisateur récupérés avec succès',
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
  async getUserRoles(@Param('userId') userId: string) {
    try {
      const userRoles = await this.rolesService.getUserRoles(userId);
      return {
        success: true,
        message: 'Rôles de l\'utilisateur récupérés avec succès',
        data: userRoles,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des rôles de l'utilisateur ${userId}`, error);
      throw error;
    }
  }

  @Get('users/:userId/permissions/:permission')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ 
    summary: 'Vérifier une permission utilisateur',
    description: 'Vérifie si un utilisateur a une permission spécifique'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'Identifiant unique de l\'utilisateur',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @ApiParam({ 
    name: 'permission', 
    description: 'Permission à vérifier',
    example: 'documents:read'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Vérification de permission effectuée',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async checkUserPermission(@Param('userId') userId: string, @Param('permission') permission: string) {
    try {
      const hasPermission = await this.rolesService.userHasPermission(userId, permission);
      return {
        success: true,
        message: 'Vérification de permission effectuée',
        data: {
          userId,
          permission,
          hasPermission,
        },
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification de permission pour l'utilisateur ${userId}`, error);
      throw error;
    }
  }

  @Post('initialize')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Initialiser les rôles système',
    description: 'Crée les rôles système par défaut s\'ils n\'existent pas'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Rôles système initialisés avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async initializeSystemRoles(@CurrentUser() currentUser: any) {
    try {
      await this.rolesService.initializeSystemRoles();
      
      this.logger.log(`Rôles système initialisés par ${currentUser.username}`);
      
      return {
        success: true,
        message: 'Rôles système initialisés avec succès',
      };
    } catch (error) {
      this.logger.error('Erreur lors de l\'initialisation des rôles système', error);
      throw error;
    }
  }
}