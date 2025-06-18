import { IsString, IsOptional, IsEmail, IsBoolean, Matches, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
  @ApiProperty({ 
    description: 'Email de l\'utilisateur', 
    example: 'user@example.com',
    required: false 
  })
  @IsOptional()
  @IsEmail({}, { message: 'Format d\'email invalide' })
  email?: string;

  @ApiProperty({ 
    description: 'Prénom de l\'utilisateur', 
    example: 'Amadou',
    required: false 
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ 
    description: 'Nom de famille de l\'utilisateur', 
    example: 'Diallo',
    required: false 
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ 
    description: 'Numéro de téléphone de l\'utilisateur', 
    example: '+221771234567',
    required: false 
  })
  @IsOptional()
  @Matches(/^\+221[0-9]{9}$/, { message: 'Format de téléphone invalide (ex: +221771234567)' })
  phone?: string;

  @ApiProperty({ 
    description: 'Date de naissance (format ISO: YYYY-MM-DD)', 
    example: '1990-01-15',
    required: false 
  })
  @IsOptional()
  @IsDateString({}, { message: 'Format de date invalide (YYYY-MM-DD)' })
  birthDate?: string;

  @ApiProperty({ 
    description: 'Genre de l\'utilisateur', 
    example: 'M',
    enum: ['M', 'F', 'Autre'],
    required: false 
  })
  @IsOptional()
  @IsString()
  @Matches(/^(M|F|Autre)$/, { message: 'Le genre doit être M, F ou Autre' })
  gender?: string;

  @ApiProperty({ 
    description: 'Adresse de l\'utilisateur', 
    example: 'Dakar, Sénégal',
    required: false 
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ 
    description: 'Ville de résidence', 
    example: 'Dakar',
    required: false 
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ 
    description: 'Code postal', 
    example: '10000',
    required: false 
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ 
    description: 'Pays de résidence', 
    example: 'Sénégal',
    required: false 
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ 
    description: 'Profession de l\'utilisateur', 
    example: 'Développeur',
    required: false 
  })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiProperty({ 
    description: 'Statut d\'activation du compte', 
    example: true,
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ 
    description: 'Consentement pour recevoir des communications marketing', 
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  acceptMarketing?: boolean;
}