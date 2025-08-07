import { IsString, IsNotEmpty, IsOptional, IsArray, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateResourceDto {
  @ApiProperty({ 
    description: 'Nom unique de la ressource', 
    example: 'documents' 
  })
  @IsString()
  @IsNotEmpty({ message: 'Le nom de la ressource est obligatoire' })
  name: string;

  @ApiProperty({ 
    description: 'Description de la ressource', 
    example: 'Gestion des documents administratifs et commerciaux' 
  })
  @IsString()
  @IsNotEmpty({ message: 'La description de la ressource est obligatoire' })
  description: string;

  @ApiProperty({ 
    description: 'Actions possibles sur cette ressource', 
    example: ['read', 'create', 'update', 'delete'],
    type: [String]
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Au moins une action doit être définie' })
  @IsString({ each: true })
  actions: string[];

  @ApiProperty({ 
    description: 'Catégorie de la ressource', 
    example: 'administration',
    required: false 
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ 
    description: 'Portée par défaut pour les permissions générées', 
    example: 'own',
    required: false 
  })
  @IsOptional()
  @IsString()
  defaultScope?: string;
}