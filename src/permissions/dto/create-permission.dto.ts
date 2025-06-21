import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({ 
    description: 'Nom de la permission (format: resource:action ou resource:action:scope)', 
    example: 'documents:read' 
  })
  @IsString()
  @IsNotEmpty({ message: 'Le nom de la permission est obligatoire' })
  @Matches(/^[a-z_]+:[a-z_]+(?::[a-z_]+)?$/, { 
    message: 'Format de permission invalide. Format attendu: resource:action ou resource:action:scope' 
  })
  name: string;

  @ApiProperty({ 
    description: 'Description de la permission', 
    example: 'Permet de lire les documents' 
  })
  @IsString()
  @IsNotEmpty({ message: 'La description de la permission est obligatoire' })
  description: string;

  @ApiProperty({ 
    description: 'Ressource concernée par la permission', 
    example: 'documents' 
  })
  @IsString()
  @IsNotEmpty({ message: 'La ressource est obligatoire' })
  resource: string;

  @ApiProperty({ 
    description: 'Action autorisée par la permission', 
    example: 'read' 
  })
  @IsString()
  @IsNotEmpty({ message: 'L\'action est obligatoire' })
  action: string;

  @ApiProperty({ 
    description: 'Portée de la permission (optionnel)', 
    example: 'own',
    required: false 
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiProperty({ 
    description: 'Catégorie de la permission', 
    example: 'system',
    required: false 
  })
  @IsOptional()
  @IsString()
  category?: string;
}