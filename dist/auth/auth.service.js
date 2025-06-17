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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const otp_service_1 = require("../otp/otp.service");
const keycloak_service_1 = require("../keycloak/keycloak.service");
let AuthService = AuthService_1 = class AuthService {
    constructor(otpService, keycloakService) {
        this.otpService = otpService;
        this.keycloakService = keycloakService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async register(registerDto) {
        const { email, phone } = registerDto;
        if (!email && !phone) {
            throw new common_1.BadRequestException('Email ou téléphone requis pour l\'inscription');
        }
        try {
            const users = await this.keycloakService.getUsers();
            const existingUser = users.find(user => user.email === email ||
                (user.attributes?.phone && user.attributes.phone.includes(phone)));
            if (existingUser) {
                throw new common_1.ConflictException('Un utilisateur avec cet email ou téléphone existe déjà');
            }
            const otpResult = await this.otpService.generateOtp(registerDto);
            this.logger.log(`Code OTP pour inscription: ${otpResult.code}`);
            return {
                message: `Code OTP envoyé avec succès ${email ? 'par email' : 'par SMS'}`,
                expiresAt: otpResult.expiresAt,
            };
        }
        catch (error) {
            if (error instanceof common_1.ConflictException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            this.logger.error('Erreur lors de l\'inscription', error);
            throw new common_1.BadRequestException('Erreur lors du processus d\'inscription');
        }
    }
    async verifyOtp(verifyOtpDto) {
        try {
            const otpRecord = await this.otpService.verifyOtp(verifyOtpDto);
            const { email, phone, password, firstName, lastName } = otpRecord.userData;
            const keycloakUser = {
                username: email || phone,
                email: email,
                firstName: firstName,
                lastName: lastName,
                enabled: true,
                emailVerified: !!email,
                attributes: phone ? { phone: [phone] } : {},
                credentials: [{
                        type: 'password',
                        value: password,
                        temporary: false,
                    }],
            };
            const userId = await this.keycloakService.createUser(keycloakUser);
            this.logger.log(`Utilisateur créé avec succès: ${userId}`);
            return {
                message: 'Utilisateur créé avec succès',
                userId,
            };
        }
        catch (error) {
            this.logger.error('Erreur lors de la vérification OTP', error);
            throw error;
        }
    }
    async login(loginDto) {
        const { email, phone, password } = loginDto;
        if (!email && !phone) {
            throw new common_1.BadRequestException('Email ou téléphone requis pour la connexion');
        }
        const identifier = email || phone;
        try {
            return await this.keycloakService.authenticateUser(identifier, password);
        }
        catch (error) {
            this.logger.error('Erreur lors de la connexion', error);
            throw error;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [otp_service_1.OtpService,
        keycloak_service_1.KeycloakService])
], AuthService);
//# sourceMappingURL=auth.service.js.map