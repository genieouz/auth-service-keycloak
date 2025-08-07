import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateResourceDto {
  @ApiProperty({ 
    description: 'Description de la ressource', 
    example: 'Gestion des documents administratifs et commerciaux mise à jour',
    required: false 
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Actions possibles sur cette ressource', 
    example: ['read', 'create', 'update', 'delete', 'approve'],
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actions?: string[];

  @ApiProperty({ 
    description: 'Catégorie de la ressource', 
    example: 'business',
    required: false 
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ 
    description: 'Portée par défaut pour les permissions générées', 
    example: 'all',
    required: false 
  })
  @IsOptional()
  @IsString()
  defaultScope?: string;
}