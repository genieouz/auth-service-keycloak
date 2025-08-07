import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateResourceDto {
  @ApiProperty({ 
    description: 'Description de la ressource', 
    example: 'Gestion des documents administratifs et commerciaux mise à jour',
    required: false,
    minLength: 10,
    maxLength: 500
    minLength: 10,
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Actions possibles sur cette ressource', 
    type: 'array',
    type: 'array',
    items: { type: 'string' },
    example: ['read', 'create', 'update', 'delete', 'approve'],
    minItems: 1,
    maxItems: 20,
    uniqueItems: true
    example: ['read', 'create', 'update', 'delete', 'approve'],
    minItems: 1,
    maxItems: 20,
    uniqueItems: true
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actions?: string[];

  @ApiProperty({ 
    description: 'Catégorie de la ressource', 
    example: 'business',
    required: false,
    enum: ['system', 'business', 'administration', 'finance', 'hr', 'custom']
    enum: ['system', 'business', 'administration', 'finance', 'hr', 'custom']
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ 
    description: 'Portée par défaut pour les permissions générées', 
    example: 'all',
    required: false,
    enum: ['own', 'all', 'department', 'team'],
    nullable: true
    enum: ['own', 'all', 'department', 'team'],
    nullable: true
  })
  @IsOptional()
  @IsString()
  defaultScope?: string;
}