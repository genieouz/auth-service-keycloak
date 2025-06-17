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
var OtpService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const otp_schema_1 = require("./schemas/otp.schema");
let OtpService = OtpService_1 = class OtpService {
    constructor(otpModel) {
        this.otpModel = otpModel;
        this.logger = new common_1.Logger(OtpService_1.name);
    }
    generateOtpCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async generateOtp(generateOtpDto) {
        const { email, phone, ...userData } = generateOtpDto;
        if (!email && !phone) {
            throw new common_1.BadRequestException('Email ou téléphone requis');
        }
        const identifier = email || phone;
        const code = this.generateOtpCode();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await this.otpModel.deleteMany({ identifier });
        const otp = new this.otpModel({
            identifier,
            code,
            expiresAt,
            userData: {
                email,
                phone,
                ...userData,
            },
        });
        await otp.save();
        this.logger.log(`Code OTP généré pour ${identifier}: ${code}`);
        return { code, expiresAt };
    }
    async verifyOtp(verifyOtpDto) {
        const { email, phone, code } = verifyOtpDto;
        if (!email && !phone) {
            throw new common_1.BadRequestException('Email ou téléphone requis');
        }
        const identifier = email || phone;
        const otp = await this.otpModel.findOne({
            identifier,
            code,
            verified: false,
            expiresAt: { $gt: new Date() },
        });
        if (!otp) {
            throw new common_1.NotFoundException('Code OTP invalide ou expiré');
        }
        otp.verified = true;
        await otp.save();
        this.logger.log(`Code OTP vérifié avec succès pour ${identifier}`);
        return otp;
    }
    async cleanupExpiredOtp() {
        const result = await this.otpModel.deleteMany({
            expiresAt: { $lt: new Date() },
        });
        this.logger.log(`${result.deletedCount} codes OTP expirés supprimés`);
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = OtpService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(otp_schema_1.Otp.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], OtpService);
//# sourceMappingURL=otp.service.js.map