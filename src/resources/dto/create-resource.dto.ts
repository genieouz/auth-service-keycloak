import { IsString, IsNotEmpty, IsOptional, IsArray, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateResourceDto {
  @ApiProperty({ 
    description: 'Nom unique de la ressource', 
    example: 'documents',
    minLength: 2,
    maxLength: 50,
    pattern: '^[a-z_]+$'
    minLength: 2,
    maxLength: 50
  })
  @IsString()
  @IsNotEmpty({ message: 'Le nom de la ressource est obligatoire' })
  @Matches(/^[a-z_]+$/, { message: 'Le nom ne peut contenir que des lettres minuscules et des underscores' })
  name: string;

  @ApiProperty({ 
    description: 'Description de la ressource', 
    example: 'Gestion des documents administratifs et commerciaux',
    minLength: 10,
    maxLength: 500
    minLength: 10,
    maxLength: 500
  })
  @IsString()
  @IsNotEmpty({ message: 'La description de la ressource est obligatoire' })
  @Length(10, 500, { message: 'La description doit contenir entre 10 et 500 caractères' })
  description: string;

  @ApiProperty({ 
    description: 'Actions possibles sur cette ressource', 
    type: 'array',
    items: { type: 'string' },
    example: ['read', 'create', 'update', 'delete', 'approve', 'publish'],
    minItems: 1,
    maxItems: 20,
    uniqueItems: true,
    description: 'Liste des actions possibles. Actions communes: read, create, update, delete, manage, approve, publish, archive'
    example: ['read', 'create', 'update', 'delete'],
    minItems: 1,
    maxItems: 20,
    uniqueItems: true
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Au moins une action doit être définie' })
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'Au moins une action est requise' })
  @ArrayMaxSize(20, { message: 'Maximum 20 actions autorisées' })
  actions: string[];

  @ApiProperty({ 
    description: 'Catégorie de la ressource', 
    example: 'business',
    required: false,
    enum: ['system', 'business', 'administration', 'finance', 'hr', 'custom'],
    default: 'custom',
    enumName: 'ResourceCategory'
    enum: ['system', 'business', 'administration', 'finance', 'hr', 'custom'],
    default: 'custom'
  })
  @IsOptional()
  @IsString()
  @IsIn(['system', 'business', 'administration', 'finance', 'hr', 'custom'], { 
    message: 'La catégorie doit être une des valeurs: system, business, administration, finance, hr, custom' 
  })
  category?: string;

  @ApiProperty({ 
    description: 'Portée par défaut pour les permissions générées', 
    example: 'own',
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