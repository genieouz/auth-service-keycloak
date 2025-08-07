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
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ApiResponseDto } from '../common/dto/response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('ressources')
@ApiBearerAuth()
@Controller('resources')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResourcesController {
  private readonly logger = new Logger(ResourcesController.name);

  constructor(private readonly resourcesService: ResourcesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Créer une nouvelle ressource',
    description: 'Crée une nouvelle ressource avec ses actions associées et génère automatiquement les permissions correspondantes'
  })
  @ApiBody({ type: CreateResourceDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Ressource créée avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données de création invalides' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'La ressource existe déjà' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async createResource(@Body() createResourceDto: CreateResourceDto, @CurrentUser() currentUser: any) {
    try {
      const resource = await this.resourcesService.createResource(createResourceDto);
      
      this.logger.log(`Ressource créée par ${currentUser.username}: ${createResourceDto.name}`);
      
      return {
        success: true,
        message: 'Ressource créée avec succès',
        data: resource,
      };
    } catch (error) {
      this.logger.error('Erreur lors de la création de la ressource', error);
      throw error;
    }
  }

  @Get()
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ 
    summary: 'Lister toutes les ressources',
    description: 'Récupère la liste de toutes les ressources disponibles avec leurs actions'
  })
  @ApiQuery({ 
    name: 'search', 
    description: 'Terme de recherche pour filtrer les ressources',
    required: false,
    example: 'documents'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste des ressources récupérée avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async getAllResources(@Query('search') search?: string) {
    try {
      const resources = search 
        ? await this.resourcesService.searchResources(search)
        : await this.resourcesService.getAllResources();
        
      return {
        success: true,
        message: 'Ressources récupérées avec succès',
        data: resources,
      };
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des ressources', error);
      throw error;
    }
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ 
    summary: 'Récupérer une ressource par ID',
    description: 'Récupère les détails d\'une ressource spécifique'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Identifiant unique de la ressource',
    example: 'res_1234567890_abc123def'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Ressource trouvée avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Ressource non trouvée' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async getResourceById(@Param('id') id: string) {
    try {
      const resource = await this.resourcesService.getResourceById(id);
      if (!resource) {
        return {
          success: false,
          message: 'Ressource non trouvée',
        };
      }
      
      return {
        success: true,
        message: 'Ressource trouvée avec succès',
        data: resource,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération de la ressource ${id}`, error);
      throw error;
    }
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ 
    summary: 'Mettre à jour une ressource',
    description: 'Modifie les propriétés d\'une ressource existante et met à jour les permissions associées'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Identifiant unique de la ressource',
    example: 'res_1234567890_abc123def'
  })
  @ApiBody({ type: UpdateResourceDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Ressource mise à jour avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données de mise à jour invalides ou ressource système' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Ressource non trouvée' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async updateResource(@Param('id') id: string, @Body() updateResourceDto: UpdateResourceDto, @CurrentUser() currentUser: any) {
    try {
      const updatedResource = await this.resourcesService.updateResource(id, updateResourceDto);
      
      this.logger.log(`Ressource mise à jour par ${currentUser.username}: ${updatedResource.name}`);
      
      return {
        success: true,
        message: 'Ressource mise à jour avec succès',
        data: updatedResource,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour de la ressource ${id}`, error);
      throw error;
    }
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Supprimer une ressource',
    description: 'Supprime définitivement une ressource du système et toutes ses permissions associées'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Identifiant unique de la ressource',
    example: 'res_1234567890_abc123def'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Ressource supprimée avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Impossible de supprimer la ressource (ressource système)' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Ressource non trouvée' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async deleteResource(@Param('id') id: string, @CurrentUser() currentUser: any) {
    try {
      const result = await this.resourcesService.deleteResource(id);
      
      this.logger.log(`Ressource supprimée par ${currentUser.username}: ${id}`);
      
      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression de la ressource ${id}`, error);
      throw error;
    }
  }

  @Get('name/:name')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ 
    summary: 'Récupérer une ressource par nom',
    description: 'Récupère les détails d\'une ressource spécifique par son nom'
  })
  @ApiParam({ 
    name: 'name', 
    description: 'Nom de la ressource',
    example: 'documents'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Ressource trouvée avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Ressource non trouvée' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async getResourceByName(@Param('name') name: string) {
    try {
      const resource = await this.resourcesService.getResourceByName(name);
      if (!resource) {
        return {
          success: false,
          message: 'Ressource non trouvée',
        };
      }
      
      return {
        success: true,
        message: 'Ressource trouvée avec succès',
        data: resource,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération de la ressource ${name}`, error);
      throw error;
    }
  }

  @Post('initialize')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Initialiser les ressources système',
    description: 'Crée les ressources système par défaut si elles n\'existent pas'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Ressources système initialisées avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  async initializeSystemResources(@CurrentUser() currentUser: any) {
    try {
      // Cette méthode est appelée automatiquement au démarrage du module
      // mais peut être appelée manuellement si nécessaire
      await this.resourcesService.onModuleInit();
      
      this.logger.log(`Ressources système initialisées par ${currentUser.username}`);
      
      return {
        success: true,
        message: 'Ressources système initialisées avec succès',
      };
    } catch (error) {
      this.logger.error('Erreur lors de l\'initialisation des ressources système', error);
      throw error;
    }
  }
}