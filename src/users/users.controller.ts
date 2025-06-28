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
    type: PaginatedResponseDto 
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
    description: 'Récupère les informations du profil de l\'utilisateur connecté'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Profil utilisateur récupéré avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Non authentifié' 
  })
  async getMyProfile(@CurrentUser() user: any) {
    try {
      const userProfile = await this.usersService.getUserById(user.userId);
      
      // Calculer les permissions comme dans le login
      const permissions = {
        canManageUsers: userProfile.roles.includes('admin'),
        canViewUsers: userProfile.roles.includes('admin') || userProfile.roles.includes('moderator'),
        isAdmin: userProfile.roles.includes('admin'),
        isModerator: userProfile.roles.includes('moderator'),
        isUser: userProfile.roles.includes('user') || userProfile.roles.length === 0,
      };
      
      return {
        success: true,
        message: 'Profil récupéré avec succès',
        data: {
          ...userProfile,
          permissions,
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
    type: ApiResponseDto 
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
    type: AvatarResponseDto
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
    type: ApiResponseDto 
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
    type: ApiResponseDto 
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
    type: AvatarResponseDto
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
    type: ApiResponseDto 
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
    type: ApiResponseDto 
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