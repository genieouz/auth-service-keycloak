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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifyOtpDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class VerifyOtpDto {
}
exports.VerifyOtpDto = VerifyOtpDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Email de l\'utilisateur',
        example: 'user@example.com',
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)({}, { message: 'Format d\'email invalide' }),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Numéro de téléphone de l\'utilisateur',
        example: '+221771234567',
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^\+221[0-9]{9}$/, { message: 'Format de téléphone invalide (ex: +221771234567)' }),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Code OTP à 6 chiffres',
        example: '123456'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Le code OTP est obligatoire' }),
    (0, class_validator_1.Length)(6, 6, { message: 'Le code OTP doit contenir exactement 6 chiffres' }),
    (0, class_validator_1.Matches)(/^[0-9]{6}$/, { message: 'Le code OTP doit contenir uniquement des chiffres' }),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "code", void 0);
//# sourceMappingURL=verify-otp.dto.js.map