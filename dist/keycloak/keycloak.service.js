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
var KeycloakService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeycloakService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let KeycloakService = KeycloakService_1 = class KeycloakService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(KeycloakService_1.name);
        this.keycloakUrl = this.configService.get('KEYCLOAK_URL', 'http://localhost:8080');
        this.realm = this.configService.get('KEYCLOAK_REALM', 'senegalservices');
        this.adminClientId = this.configService.get('KEYCLOAK_ADMIN_CLIENT_ID', 'keycloak_admin_api');
        this.adminClientSecret = this.configService.get('KEYCLOAK_ADMIN_CLIENT_SECRET', 'KabivlQz5GVG5Rw9BEKVSqKfzm6OXPbY');
        this.userClientId = this.configService.get('KEYCLOAK_USER_CLIENT_ID', 'senegalservices_client');
        this.httpClient = axios_1.default.create({
            baseURL: this.keycloakUrl,
            timeout: 10000,
        });
    }
    async getAdminToken() {
        try {
            const response = await this.httpClient.post(`/realms/${this.realm}/protocol/openid-connect/token`, new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: this.adminClientId,
                client_secret: this.adminClientSecret,
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            const tokenData = response.data;
            return tokenData.access_token;
        }
        catch (error) {
            this.logger.error('Erreur lors de l\'obtention du token admin', error.response?.data);
            throw new common_1.UnauthorizedException('Impossible d\'obtenir le token d\'accès admin');
        }
    }
    async authenticateUser(identifier, password) {
        try {
            const response = await this.httpClient.post(`/realms/${this.realm}/protocol/openid-connect/token`, new URLSearchParams({
                grant_type: 'password',
                client_id: this.userClientId,
                username: identifier,
                password: password,
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            return response.data;
        }
        catch (error) {
            this.logger.error('Erreur lors de l\'authentification utilisateur', error.response?.data);
            const errorData = error.response?.data;
            throw new common_1.UnauthorizedException(errorData?.error_description || 'Identifiants invalides');
        }
    }
    async createUser(userData) {
        try {
            const adminToken = await this.getAdminToken();
            const response = await this.httpClient.post(`/admin/realms/${this.realm}/users`, userData, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const locationHeader = response.headers.location;
            const userId = locationHeader ? locationHeader.split('/').pop() : null;
            if (!userId) {
                throw new Error('Impossible de récupérer l\'ID de l\'utilisateur créé');
            }
            this.logger.log(`Utilisateur créé avec l'ID: ${userId}`);
            return userId;
        }
        catch (error) {
            this.logger.error('Erreur lors de la création de l\'utilisateur', error.response?.data);
            throw new common_1.BadRequestException('Impossible de créer l\'utilisateur dans Keycloak');
        }
    }
    async getUserById(userId) {
        try {
            const adminToken = await this.getAdminToken();
            const response = await this.httpClient.get(`/admin/realms/${this.realm}/users/${userId}`, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                },
            });
            return response.data;
        }
        catch (error) {
            this.logger.error(`Erreur lors de la récupération de l'utilisateur ${userId}`, error.response?.data);
            throw new common_1.BadRequestException('Utilisateur non trouvé');
        }
    }
    async getUsers(first = 0, max = 100) {
        try {
            const adminToken = await this.getAdminToken();
            const response = await this.httpClient.get(`/admin/realms/${this.realm}/users`, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                },
                params: {
                    first,
                    max,
                },
            });
            return response.data;
        }
        catch (error) {
            this.logger.error('Erreur lors de la récupération des utilisateurs', error.response?.data);
            throw new common_1.BadRequestException('Impossible de récupérer les utilisateurs');
        }
    }
    async updateUser(userId, userData) {
        try {
            const adminToken = await this.getAdminToken();
            await this.httpClient.put(`/admin/realms/${this.realm}/users/${userId}`, userData, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json',
                },
            });
            this.logger.log(`Utilisateur ${userId} mis à jour avec succès`);
        }
        catch (error) {
            this.logger.error(`Erreur lors de la mise à jour de l'utilisateur ${userId}`, error.response?.data);
            throw new common_1.BadRequestException('Impossible de mettre à jour l\'utilisateur');
        }
    }
    async disableUser(userId) {
        await this.updateUser(userId, { enabled: false });
    }
    async deleteUser(userId) {
        try {
            const adminToken = await this.getAdminToken();
            await this.httpClient.delete(`/admin/realms/${this.realm}/users/${userId}`, {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                },
            });
            this.logger.log(`Utilisateur ${userId} supprimé avec succès`);
        }
        catch (error) {
            this.logger.error(`Erreur lors de la suppression de l'utilisateur ${userId}`, error.response?.data);
            throw new common_1.BadRequestException('Impossible de supprimer l\'utilisateur');
        }
    }
};
exports.KeycloakService = KeycloakService;
exports.KeycloakService = KeycloakService = KeycloakService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], KeycloakService);
//# sourceMappingURL=keycloak.service.js.map