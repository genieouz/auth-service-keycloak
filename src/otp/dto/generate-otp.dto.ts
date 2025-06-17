import { IsString, IsNotEmpty, IsOptional, IsEmail, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateOtpDto {
  @ApiProperty({ 
    description: 'Email de l\'utilisateur', 
    example: 'user@example.com',
    required: false 
  })
  @IsOptional()
  @IsEmail({}, { message: 'Format d\'email invalide' })
  email?: string;

  @ApiProperty({ 
    description: 'Numéro de téléphone de l\'utilisateur', 
    example: '+221771234567',
    required: false 
  })
  @IsOptional()
  @Matches(/^\+221[0-9]{9}$/, { message: 'Format de téléphone invalide (ex: +221771234567)' })
  phone?: string;

  @ApiProperty({ 
    description: 'Mot de passe de l\'utilisateur', 
    example: 'MonMotDePasse123!' 
  })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire' })
  password: string;

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
}