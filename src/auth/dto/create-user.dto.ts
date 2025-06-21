import { IsString, IsNotEmpty, IsOptional, IsEmail, Matches, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({ 
    description: 'Email de l\'utilisateur (obligatoire pour ce type de création)', 
    example: 'admin@example.com'
  })
  @IsEmail({}, { message: 'Format d\'email invalide' })
  @IsNotEmpty({ message: 'L\'email est obligatoire' })
  email: string;

  @ApiProperty({ 
    description: 'Prénom de l\'utilisateur', 
    example: 'Amadou' 
  })
  @IsString()
  @IsNotEmpty({ message: 'Le prénom est obligatoire' })
  firstName: string;

  @ApiProperty({ 
    description: 'Nom de famille de l\'utilisateur', 
    example: 'Diallo' 
  })
  @IsString()
  @IsNotEmpty({ message: 'Le nom de famille est obligatoire' })
  lastName: string;

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
    required: false,
    default: 'Sénégal'
  })
  @IsOptional()
  @IsString()
  country?: string = 'Sénégal';

  @ApiProperty({ 
    description: 'Profession de l\'utilisateur', 
    example: 'Développeur',
    required: false 
  })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiProperty({ 
    description: 'Rôles à assigner à l\'utilisateur', 
    example: ['user', 'moderator'],
    required: false,
    type: [String]
  })
  @IsOptional()
  roles?: string[];

  @ApiProperty({ 
    description: 'Attributs personnalisés de l\'application', 
    example: { 'departement': 'IT', 'niveau_acces': 'standard' },
    required: false 
  })
  @IsOptional()
  customAttributes?: { [key: string]: string | string[] };

  @ApiProperty({ 
    description: 'Forcer la réinitialisation du mot de passe à la première connexion', 
    example: true,
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  requirePasswordReset?: boolean = true;
}