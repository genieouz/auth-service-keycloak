import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePermissionDto {
  @ApiProperty({ 
    description: 'Description de la permission', 
    example: 'Permet de lire tous les documents',
    required: false 
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Portée de la permission', 
    example: 'all',
    required: false 
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiProperty({ 
    description: 'Catégorie de la permission', 
    example: 'business',
    required: false 
  })
  @IsOptional()
  @IsString()
  category?: string;
}