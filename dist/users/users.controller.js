"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UsersController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const users_service_1 = require("./users.service");
const update_user_dto_1 = require("./dto/update-user.dto");
const get_users_query_dto_1 = require("./dto/get-users-query.dto");
const response_dto_1 = require("../common/dto/response.dto");
let UsersController = UsersController_1 = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
        this.logger = new common_1.Logger(UsersController_1.name);
    }
    async getUsers(query) {
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
        }
        catch (error) {
            this.logger.error('Erreur lors de la récupération des utilisateurs', error);
            throw error;
        }
    }
    async getUserById(id) {
        try {
            const user = await this.usersService.getUserById(id);
            return {
                success: true,
                message: 'Utilisateur trouvé avec succès',
                data: user,
            };
        }
        catch (error) {
            this.logger.error(`Erreur lors de la récupération de l'utilisateur ${id}`, error);
            throw error;
        }
    }
    async updateUser(id, updateUserDto) {
        try {
            const updatedUser = await this.usersService.updateUser(id, updateUserDto);
            return {
                success: true,
                message: 'Utilisateur mis à jour avec succès',
                data: updatedUser,
            };
        }
        catch (error) {
            this.logger.error(`Erreur lors de la mise à jour de l'utilisateur ${id}`, error);
            throw error;
        }
    }
    async deleteUser(id) {
        try {
            const result = await this.usersService.deleteUser(id);
            return {
                success: true,
                message: result.message,
            };
        }
        catch (error) {
            this.logger.error(`Erreur lors de la suppression de l'utilisateur ${id}`, error);
            throw error;
        }
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Lister les utilisateurs',
        description: 'Récupère la liste paginée de tous les utilisateurs enregistrés'
    }),
    (0, swagger_1.ApiQuery)({ type: get_users_query_dto_1.GetUsersQueryDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Liste des utilisateurs récupérée avec succès',
        type: response_dto_1.PaginatedResponseDto
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Paramètres de requête invalides'
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_users_query_dto_1.GetUsersQueryDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Récupérer un utilisateur par ID',
        description: 'Récupère les détails d\'un utilisateur spécifique par son identifiant unique'
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Identifiant unique de l\'utilisateur',
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Utilisateur trouvé avec succès',
        type: response_dto_1.ApiResponseDto
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Utilisateur non trouvé'
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUserById", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Mettre à jour un utilisateur',
        description: 'Modifie les informations d\'un utilisateur existant'
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Identifiant unique de l\'utilisateur',
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    }),
    (0, swagger_1.ApiBody)({ type: update_user_dto_1.UpdateUserDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Utilisateur mis à jour avec succès',
        type: response_dto_1.ApiResponseDto
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Données de mise à jour invalides'
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Utilisateur non trouvé'
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Supprimer un utilisateur',
        description: 'Supprime définitivement un utilisateur du système'
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Identifiant unique de l\'utilisateur',
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Utilisateur supprimé avec succès',
        type: response_dto_1.ApiResponseDto
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Utilisateur non trouvé'
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteUser", null);
exports.UsersController = UsersController = UsersController_1 = __decorate([
    (0, swagger_1.ApiTags)('utilisateurs'),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map