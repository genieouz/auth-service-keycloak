import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiProperty({ 
    description: 'Description du rôle', 
    example: 'Gestionnaire des documents administratifs mis à jour',
    required: false 
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Permissions associées au rôle', 
    example: ['documents:read', 'documents:create', 'documents:update', 'documents:delete'],
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiProperty({ 
    description: 'Rôle composite (contient d\'autres rôles)', 
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  composite?: boolean;

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
    example: { 'department': 'administration', 'level': 'senior_manager' },
    required: false 
  })
  @IsOptional()
  attributes?: { [key: string]: string };
}