import { IsString, IsOptional, IsArray, IsIn, Length, ArrayMinSize, ArrayMaxSize } from 'class-validator';
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
  @Length(10, 500, { message: 'La description doit contenir entre 10 et 500 caractères' })
  description?: string;

  @ApiProperty({ 
    description: 'Actions possibles sur cette ressource', 
    type: 'array',
    type: 'array',
    items: { type: 'string' },
    example: ['read', 'create', 'update', 'delete', 'approve', 'publish'],
    minItems: 1,
    maxItems: 20,
    uniqueItems: true,
    required: false
    example: ['read', 'create', 'update', 'delete', 'approve'],
    minItems: 1,
    maxItems: 20,
    uniqueItems: true
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'Au moins une action est requise si le champ est fourni' })
  @ArrayMaxSize(20, { message: 'Maximum 20 actions autorisées' })
  actions?: string[];

  @ApiProperty({ 
    description: 'Catégorie de la ressource', 
    example: 'business',
    required: false,
    enum: ['system', 'business', 'administration', 'finance', 'hr', 'custom'],
    enumName: 'ResourceCategory'
    enum: ['system', 'business', 'administration', 'finance', 'hr', 'custom']
  })
  @IsOptional()
  @IsString()
  @IsIn(['system', 'business', 'administration', 'finance', 'hr', 'custom'], { 
    message: 'La catégorie doit être une des valeurs: system, business, administration, finance, hr, custom' 
  })
  category?: string;

  @ApiProperty({ 
    description: 'Portée par défaut pour les permissions générées', 
    example: 'all',
    required: false,
    enum: ['own', 'all', 'department', 'team'],
    nullable: true,
    enumName: 'ResourceScope'
    enum: ['own', 'all', 'department', 'team'],
    nullable: true
  })
  @IsOptional()
  @IsString()
  @IsIn(['own', 'all', 'department', 'team'], { 
    message: 'La portée doit être une des valeurs: own, all, department, team' 
  })
  defaultScope?: string;
}