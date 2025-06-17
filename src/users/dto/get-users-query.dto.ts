import { IsOptional, IsNumberString, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetUsersQueryDto {
  @ApiProperty({ 
    description: 'Numéro de page (commence à 0)', 
    example: 0,
    required: false,
    default: 0
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Min(0, { message: 'La page doit être supérieure ou égale à 0' })
  page?: number = 0;

  @ApiProperty({ 
    description: 'Nombre d\'utilisateurs par page (max 100)', 
    example: 20,
    required: false,
    default: 20
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Min(1, { message: 'La limite doit être supérieure à 0' })
  @Max(100, { message: 'La limite ne peut pas dépasser 100' })
  limit?: number = 20;
}