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
exports.GetUsersQueryDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class GetUsersQueryDto {
    constructor() {
        this.page = 0;
        this.limit = 20;
    }
}
exports.GetUsersQueryDto = GetUsersQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Numéro de page (commence à 0)',
        example: 0,
        required: false,
        default: 0
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value)),
    (0, class_validator_1.Min)(0, { message: 'La page doit être supérieure ou égale à 0' }),
    __metadata("design:type", Number)
], GetUsersQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Nombre d\'utilisateurs par page (max 100)',
        example: 20,
        required: false,
        default: 20
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value)),
    (0, class_validator_1.Min)(1, { message: 'La limite doit être supérieure à 0' }),
    (0, class_validator_1.Max)(100, { message: 'La limite ne peut pas dépasser 100' }),
    __metadata("design:type", Number)
], GetUsersQueryDto.prototype, "limit", void 0);
//# sourceMappingURL=get-users-query.dto.js.map