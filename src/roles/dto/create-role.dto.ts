import { IsString, IsNotEmpty, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ 
    description: 'Nom du rôle', 
    example: 'gestionnaire_documents' 
  })
  @IsString()
  @IsNotEmpty({ message: 'Le nom du rôle est obligatoire' })
  name: string;

  @ApiProperty({ 
    description: 'Description du rôle', 
    example: 'Gestionnaire des documents administratifs' 
  })
  @IsString()
  @IsNotEmpty({ message: 'La description du rôle est obligatoire' })
  description: string;

  @ApiProperty({ 
    description: 'Permissions associées au rôle', 
    example: ['documents:read', 'documents:create', 'documents:update'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @ApiProperty({ 
    description: 'Rôle composite (contient d\'autres rôles)', 
    example: false,
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  composite?: boolean = false;

  @ApiProperty({ 
    description: 'Rôles enfants si composite', 
    example: ['user', 'viewer'],
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  childRoles?: string[];

  @ApiProperty({ 
    description: 'Attributs personnalisés du rôle', 
    example: { 'department': 'administration', 'level': 'manager' },
    required: false 
  })
  @IsOptional()
  attributes?: { [key: string]: string };
}