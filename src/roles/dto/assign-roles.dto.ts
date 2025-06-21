import { IsArray, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRolesDto {
  @ApiProperty({ 
    description: 'Liste des rôles à assigner', 
    example: ['user', 'gestionnaire_documents', 'moderator'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  roles: string[];
}

export class RemoveRolesDto {
  @ApiProperty({ 
    description: 'Liste des rôles à retirer', 
    example: ['moderator'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  roles: string[];
}