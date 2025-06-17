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
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const register_dto_1 = require("./dto/register.dto");
const login_dto_1 = require("./dto/login.dto");
const verify_otp_dto_1 = require("../otp/dto/verify-otp.dto");
const response_dto_1 = require("../common/dto/response.dto");
let AuthController = AuthController_1 = class AuthController {
    constructor(authService) {
        this.authService = authService;
        this.logger = new common_1.Logger(AuthController_1.name);
    }
    async register(registerDto) {
        try {
            const result = await this.authService.register(registerDto);
            return {
                success: true,
                message: result.message,
                data: {
                    expiresAt: result.expiresAt,
                },
            };
        }
        catch (error) {
            this.logger.error('Erreur lors de l\'inscription', error);
            throw error;
        }
    }
    async verifyOtp(verifyOtpDto) {
        try {
            const result = await this.authService.verifyOtp(verifyOtpDto);
            return {
                success: true,
                message: result.message,
                data: {
                    userId: result.userId,
                },
            };
        }
        catch (error) {
            this.logger.error('Erreur lors de la vérification OTP', error);
            throw error;
        }
    }
    async login(loginDto) {
        try {
            const tokenData = await this.authService.login(loginDto);
            return {
                success: true,
                message: 'Connexion réussie',
                data: {
                    access_token: tokenData.access_token,
                    token_type: tokenData.token_type,
                    expires_in: tokenData.expires_in,
                    scope: tokenData.scope,
                },
            };
        }
        catch (error) {
            this.logger.error('Erreur lors de la connexion', error);
            throw error;
        }
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Démarrer l\'inscription d\'un utilisateur',
        description: 'Génère et envoie un code OTP pour vérifier l\'email ou le téléphone avant de créer le compte utilisateur'
    }),
    (0, swagger_1.ApiBody)({ type: register_dto_1.RegisterDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Code OTP envoyé avec succès',
        type: response_dto_1.ApiResponseDto
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Données d\'inscription invalides'
    }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: 'Utilisateur déjà existant'
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('verify-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Vérifier le code OTP et créer l\'utilisateur',
        description: 'Vérifie le code OTP reçu et crée définitivement le compte utilisateur dans Keycloak'
    }),
    (0, swagger_1.ApiBody)({ type: verify_otp_dto_1.VerifyOtpDto }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Utilisateur créé avec succès',
        type: response_dto_1.ApiResponseDto
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Code OTP invalide ou données incorrectes'
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Code OTP non trouvé ou expiré'
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_otp_dto_1.VerifyOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Connecter un utilisateur',
        description: 'Authentifier un utilisateur avec son email/téléphone et mot de passe via Keycloak'
    }),
    (0, swagger_1.ApiBody)({ type: login_dto_1.LoginDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Connexion réussie',
        type: response_dto_1.ApiResponseDto
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Données de connexion invalides'
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Identifiants incorrects'
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, swagger_1.ApiTags)('authentification'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map