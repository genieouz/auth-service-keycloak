import { 
  Controller, 
  Get, 
  Patch, 
  Delete, 
  Param, 
  Body, 
  Query, 
  HttpCode, 
  HttpStatus, 
  Logger 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery,
  ApiBody 
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { ApiResponseDto, PaginatedResponseDto } from '../common/dto/response.dto';

@ApiTags('utilisateurs')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get()
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

  @Get(':id')
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

  @Delete(':id')
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
}