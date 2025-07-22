import { 
  Controller, 
  Get, 
  Patch, 
  Delete, 
  Param, 
  Body, 
  Query, 
  Post,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpCode, 
  HttpStatus, 
  Logger,
  UseGuards
} from '@nestjs/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { UploadAvatarDto, AvatarResponseDto } from './dto/upload-avatar.dto';
import { ApiResponseDto, PaginatedResponseDto } from '../common/dto/response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('utilisateurs')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ 
    summary: 'Lister les utilisateurs',
    description: 'Récupère la liste paginée de tous les utilisateurs enregistrés'
  })
  @ApiQuery({ type: GetUsersQueryDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste des utilisateurs récupérée avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Utilisateurs récupérés avec succès' },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserProfileDto' }
        },
        total: { type: 'number', example: 150 },
        page: { type: 'number', example: 0 },
        limit: { type: 'number', example: 20 },
        totalPages: { type: 'number', example: 8 }
      },
      required: ['success', 'message', 'data', 'total', 'page', 'limit', 'totalPages']
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Paramètres de requête invalides' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async getUsers(@Query() query: GetUsersQueryDto) {
    try {
      const result = await this.usersService.getUsers(query);
      return {
        success: true,
        message: 'Utilisateurs récupérés avec succès',
        data: result.users,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      };
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des utilisateurs', error);
      throw error;
    }
  }

  @Get('me')
  @ApiOperation({ 
    summary: 'Récupérer son profil utilisateur',
    description: 'Récupère les informations du profil de l\'utilisateur connecté avec ses permissions'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Profil utilisateur et permissions récupérés avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Profil et permissions récupérés avec succès' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '4c2cd50b-6be8-4c72-b306-353987c94100' },
            username: { type: 'string', example: 'genieouzog+2@gmail.com' },
            email: { type: 'string', example: 'genieouzog+2@gmail.com' },
            firstName: { type: 'string', example: 'Amadou N.' },
            lastName: { type: 'string', example: 'Diallo' },
            enabled: { type: 'boolean', example: true },
            emailVerified: { type: 'boolean', example: true },
            roles: { 
              type: 'array', 
              items: { type: 'string' },
              example: ['default-roles-senegal services', 'admin']
            },
            clientRoles: { 
              type: 'array', 
              items: { type: 'string' },
              example: []
            },
            registrationDate: { type: 'string', format: 'date-time', example: '2025-07-22T18:56:27.806Z' },
            phone: { type: 'string', example: '+221771234567' },
            birthDate: { type: 'string', format: 'date', example: '1990-05-15' },
            gender: { type: 'string', enum: ['M', 'F', 'Autre'], example: 'M' },
            address: { type: 'string', example: '123 Avenue Bourguiba, Plateau' },
            city: { type: 'string', example: 'Dakar' },
            postalCode: { type: 'string', example: '10000' },
            country: { type: 'string', example: 'Sénégal' },
            profession: { type: 'string', example: 'Développeur Full Stack' },
            acceptTerms: { type: 'boolean', example: true },
            acceptPrivacyPolicy: { type: 'boolean', example: true },
            acceptMarketing: { type: 'boolean', example: false },
            accountType: { type: 'string', enum: ['email', 'phone'], example: 'email' },
            avatarUrl: { 
              type: 'string', 
              example: 'https://senegalservices.minio.api.sandbox.topatoko.com/senegal-service-auth/avatars/4c2cd50b-6be8-4c72-b306-353987c94100/c94f1186-b415-411c-8f30-a48568e863da.jpeg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=cwsLWoQcHVSi7OVS%2F20250722%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250722T185627Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=f2cecb80ff9c3136add48c413f18baec5f541a9550ad42006ff17ac37c00ae44',
            },
            customAttributes: {
              type: 'object',
              properties: {
                directPermissions: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['users:read', 'users:create']
                }
              },
              additionalProperties: true,
              example: {
                directPermissions: ['users:read', 'users:create']
              },
            },
            permissions: {
              type: 'object',
              properties: {
                effectivePermissions: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['users:read', 'users:create'],
                  description: 'Toutes les permissions effectives de l\'utilisateur (rôles + directes)'
                },
                rolePermissions: {
                  type: 'array',
                  items: { type: 'string' },
                  example: [],
                  description: 'Permissions héritées des rôles'
                },
                directPermissions: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['users:read', 'users:create'],
                  description: 'Permissions assignées directement à l\'utilisateur'
                },
                roles: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['default-roles-senegal services', 'admin'],
                  description: 'Rôles de l\'utilisateur'
                },
                canManageUsers: { type: 'boolean', example: true },
                canViewUsers: { type: 'boolean', example: true },
                isAdmin: { type: 'boolean', example: true },
                isModerator: { type: 'boolean', example: false },
                isUser: { type: 'boolean', example: false }
              },
              required: ['effectivePermissions', 'rolePermissions', 'directPermissions', 'roles', 'canManageUsers', 'canViewUsers', 'isAdmin', 'isModerator', 'isUser']
            }
          },
          required: ['id', 'username', 'firstName', 'lastName', 'enabled', 'emailVerified', 'roles', 'clientRoles', 'registrationDate', 'acceptTerms', 'acceptPrivacyPolicy', 'permissions']
        }
      },
      required: ['success', 'message', 'data']
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Non authentifié' 
  })
  async getMyProfile(@CurrentUser() user: any) {
    try {
      const userProfile = await this.usersService.getUserById(user.userId);
      
      // Récupérer les permissions complètes de l'utilisateur
      const userPermissions = await this.usersService.getUserPermissions(user.userId);
      
      return {
        success: true,
        message: 'Profil et permissions récupérés avec succès',
        data: {
          ...userProfile,
          permissions: userPermissions,
        },
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération du profil ${user.userId}`, error);
      throw error;
    }
  }

  @Patch('me')
  @ApiOperation({ 
    summary: 'Mettre à jour son profil',
    description: 'Modifie les informations du profil de l\'utilisateur connecté'
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Profil mis à jour avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Profil mis à jour avec succès' },
        data: { $ref: '#/components/schemas/UserProfileDto' }
      },
      required: ['success', 'message', 'data']
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données de mise à jour invalides' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Non authentifié' 
  })
  async updateMyProfile(@CurrentUser() user: any, @Body() updateUserDto: UpdateUserDto) {
    try {
      // Empêcher la modification du statut enabled par l'utilisateur lui-même
      const { enabled, ...safeUpdateData } = updateUserDto;
      
      const updatedUser = await this.usersService.updateUser(user.userId, safeUpdateData);
      return {
        success: true,
        message: 'Profil mis à jour avec succès',
        data: updatedUser,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour du profil ${user.userId}`, error);
      throw error;
    }
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ 
    summary: 'Uploader son avatar',
    description: 'Upload et met à jour l\'avatar de l\'utilisateur connecté'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadAvatarDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Avatar uploadé avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Avatar uploadé avec succès' },
        data: { $ref: '#/components/schemas/AvatarResponseDto' }
      },
      required: ['success', 'message', 'data']
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Fichier invalide ou trop volumineux' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Non authentifié' 
  })
  async uploadMyAvatar(@CurrentUser() user: any, @UploadedFile() file: any) {
    try {
      if (!file) {
        throw new BadRequestException('Aucun fichier fourni');
      }

      const result = await this.usersService.uploadAvatar(user.userId, file);
      return {
        success: true,
        message: 'Avatar uploadé avec succès',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de l'upload d'avatar pour ${user.userId}`, error);
      throw error;
    }
  }

  @Delete('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Supprimer son avatar',
    description: 'Supprime l\'avatar de l\'utilisateur connecté'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Avatar supprimé avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Avatar supprimé avec succès' }
      },
      required: ['success', 'message']
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Non authentifié' 
  })
  async deleteMyAvatar(@CurrentUser() user: any) {
    try {
      await this.usersService.deleteAvatar(user.userId);
      return {
        success: true,
        message: 'Avatar supprimé avec succès',
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression d'avatar pour ${user.userId}`, error);
      throw error;
    }
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ 
    summary: 'Récupérer un utilisateur par ID',
    description: 'Récupère les détails d\'un utilisateur spécifique par son identifiant unique'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Identifiant unique de l\'utilisateur',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Utilisateur trouvé avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Utilisateur trouvé avec succès' },
        data: { $ref: '#/components/schemas/UserProfileDto' }
      },
      required: ['success', 'message', 'data']
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async getUserById(@Param('id') id: string) {
    try {
      const user = await this.usersService.getUserById(id);
      return {
        success: true,
        message: 'Utilisateur trouvé avec succès',
        data: user,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération de l'utilisateur ${id}`, error);
      throw error;
    }
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ 
    summary: 'Mettre à jour un utilisateur',
    description: 'Modifie les informations d\'un utilisateur existant'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Identifiant unique de l\'utilisateur',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Utilisateur mis à jour avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Utilisateur mis à jour avec succès' },
        data: { $ref: '#/components/schemas/UserProfileDto' }
      },
      required: ['success', 'message', 'data']
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données de mise à jour invalides' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    try {
      const updatedUser = await this.usersService.updateUser(id, updateUserDto);
      return {
        success: true,
        message: 'Utilisateur mis à jour avec succès',
        data: updatedUser,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour de l'utilisateur ${id}`, error);
      throw error;
    }
  }

  @Post(':id/avatar')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ 
    summary: 'Uploader l\'avatar d\'un utilisateur (Admin)',
    description: 'Upload et met à jour l\'avatar d\'un utilisateur spécifique'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Identifiant unique de l\'utilisateur',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadAvatarDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Avatar uploadé avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Avatar uploadé avec succès' },
        data: { $ref: '#/components/schemas/AvatarResponseDto' }
      },
      required: ['success', 'message', 'data']
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Fichier invalide ou trop volumineux' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  async uploadUserAvatar(@Param('id') id: string, @UploadedFile() file: any, @CurrentUser() currentUser: any) {
    try {
      if (!file) {
        throw new BadRequestException('Aucun fichier fourni');
      }

      const result = await this.usersService.uploadAvatar(id, file);
      
      this.logger.log(`Avatar uploadé par admin ${currentUser.username} pour l'utilisateur ${id}`);
      
      return {
        success: true,
        message: 'Avatar uploadé avec succès',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de l'upload d'avatar pour l'utilisateur ${id}`, error);
      throw error;
    }
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Supprimer un utilisateur',
    description: 'Supprime définitivement un utilisateur du système'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Identifiant unique de l\'utilisateur',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Utilisateur supprimé avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Utilisateur supprimé avec succès' }
      },
      required: ['success', 'message']
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async deleteUser(@Param('id') id: string) {
    try {
      const result = await this.usersService.deleteUser(id);
      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression de l'utilisateur ${id}`, error);
      throw error;
    }
  }

  @Delete(':id/avatar')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Supprimer l\'avatar d\'un utilisateur (Admin)',
    description: 'Supprime l\'avatar d\'un utilisateur spécifique'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Identifiant unique de l\'utilisateur',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Avatar supprimé avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Avatar supprimé avec succès' }
      },
      required: ['success', 'message']
    }
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  async deleteUserAvatar(@Param('id') id: string, @CurrentUser() currentUser: any) {
    try {
      await this.usersService.deleteAvatar(id);
      
      this.logger.log(`Avatar supprimé par admin ${currentUser.username} pour l'utilisateur ${id}`);
      
      return {
        success: true,
        message: 'Avatar supprimé avec succès',
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression d'avatar pour l'utilisateur ${id}`, error);
      throw error;
    }
  }

  @Get('avatar/:fileName')
  @ApiOperation({ 
    summary: 'Récupérer un avatar par nom de fichier',
    description: 'Proxy pour servir les avatars depuis MinIO'
  })
  @ApiParam({ 
    name: 'fileName', 
    description: 'Nom du fichier avatar',
    example: 'avatars/user-id/uuid.jpg'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Avatar récupéré avec succès'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Avatar non trouvé' 
  })
  async getAvatar(@Param('fileName') fileName: string, @Res() res: any) {
    try {
      const avatarUrl = await this.usersService.getAvatarUrl(fileName);
      return res.redirect(avatarUrl);
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération de l'avatar: ${fileName}`, error);
      throw new NotFoundException('Avatar non trouvé');
    }
  }


  @Get('search/:query')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ 
    summary: 'Rechercher des utilisateurs',
    description: 'Recherche des utilisateurs par nom, email ou téléphone'
  })
  @ApiParam({ 
    name: 'query', 
    description: 'Terme de recherche',
    example: 'amadou'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Résultats de recherche récupérés avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Recherche effectuée avec succès' },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserProfileDto' }
        }
      },
      required: ['success', 'message', 'data']
    }
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async searchUsers(@Param('query') query: string) {
    try {
      const users = await this.usersService.searchUsers(query);
      return {
        success: true,
        message: 'Recherche effectuée avec succès',
        data: users,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la recherche d'utilisateurs: ${query}`, error);
      throw error;
    }
  }
}