import { IsString, IsNotEmpty, IsOptional, IsArray, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateResourceDto {
  @ApiProperty({ 
    description: 'Nom unique de la ressource', 
    example: 'documents',
    minLength: 2,
    maxLength: 50
  })
  @IsString()
  @IsNotEmpty({ message: 'Le nom de la ressource est obligatoire' })
  name: string;

  @ApiProperty({ 
    description: 'Description de la ressource', 
    example: 'Gestion des documents administratifs et commerciaux',
    minLength: 10,
    maxLength: 500
  })
  @IsString()
  @IsNotEmpty({ message: 'La description de la ressource est obligatoire' })
  description: string;

  @ApiProperty({ 
    description: 'Actions possibles sur cette ressource', 
    type: 'array',
    items: { type: 'string' },
    example: ['read', 'create', 'update', 'delete'],
    minItems: 1,
    maxItems: 20,
    uniqueItems: true
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Au moins une action doit être définie' })
  @IsString({ each: true })
  actions: string[];

  @ApiProperty({ 
    description: 'Catégorie de la ressource', 
    example: 'business',
    required: false,
    enum: ['system', 'business', 'administration', 'finance', 'hr', 'custom'],
    default: 'custom'
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ 
    description: 'Portée par défaut pour les permissions générées', 
    example: 'own',
    required: false,
    enum: ['own', 'all', 'department', 'team'],
    nullable: true
  })
  @IsOptional()
  @IsString()
  defaultScope?: string;
}