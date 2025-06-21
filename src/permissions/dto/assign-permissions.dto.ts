import { IsArray, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignPermissionsDto {
  @ApiProperty({ 
    description: 'Liste des permissions à assigner', 
    example: ['documents:read', 'documents:create', 'services:read'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  permissions: string[];
}

export class AddPermissionsToRoleDto {
  @ApiProperty({ 
    description: 'Liste des permissions à ajouter au rôle', 
    example: ['documents:delete', 'documents:approve'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  permissions: string[];
}