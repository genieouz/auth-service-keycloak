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
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const keycloak_service_1 = require("../keycloak/keycloak.service");
let UsersService = UsersService_1 = class UsersService {
    constructor(keycloakService) {
        this.keycloakService = keycloakService;
        this.logger = new common_1.Logger(UsersService_1.name);
    }
    async getUserById(userId) {
        try {
            return await this.keycloakService.getUserById(userId);
        }
        catch (error) {
            this.logger.error(`Erreur lors de la récupération de l'utilisateur ${userId}`, error);
            throw new common_1.NotFoundException('Utilisateur non trouvé');
        }
    }
    async getUsers(query) {
        try {
            const { page = 0, limit = 20 } = query;
            const first = page * limit;
            const users = await this.keycloakService.getUsers(first, limit);
            const totalUsers = await this.keycloakService.getUsers(0, 1000);
            const total = totalUsers.length;
            return {
                users,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        }
        catch (error) {
            this.logger.error('Erreur lors de la récupération des utilisateurs', error);
            throw error;
        }
    }
    async updateUser(userId, updateUserDto) {
        try {
            const keycloakUserData = {
                email: updateUserDto.email,
                firstName: updateUserDto.firstName,
                lastName: updateUserDto.lastName,
                enabled: updateUserDto.enabled,
            };
            if (updateUserDto.phone) {
                keycloakUserData.attributes = {
                    phone: [updateUserDto.phone],
                };
            }
            await this.keycloakService.updateUser(userId, keycloakUserData);
            return await this.keycloakService.getUserById(userId);
        }
        catch (error) {
            this.logger.error(`Erreur lors de la mise à jour de l'utilisateur ${userId}`, error);
            throw error;
        }
    }
    async disableUser(userId) {
        try {
            await this.keycloakService.disableUser(userId);
            return { message: 'Utilisateur désactivé avec succès' };
        }
        catch (error) {
            this.logger.error(`Erreur lors de la désactivation de l'utilisateur ${userId}`, error);
            throw error;
        }
    }
    async deleteUser(userId) {
        try {
            await this.keycloakService.deleteUser(userId);
            return { message: 'Utilisateur supprimé avec succès' };
        }
        catch (error) {
            this.logger.error(`Erreur lors de la suppression de l'utilisateur ${userId}`, error);
            throw error;
        }
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [keycloak_service_1.KeycloakService])
], UsersService);
//# sourceMappingURL=users.service.js.map