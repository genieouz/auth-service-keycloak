import { IsString, IsNotEmpty, Length, IsEmail, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
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
    description: 'Code OTP à 6 chiffres', 
    example: '123456' 
  })
  @IsString()
  @IsNotEmpty({ message: 'Le code OTP est obligatoire' })
  @Length(6, 6, { message: 'Le code OTP doit contenir exactement 6 chiffres' })
  @Matches(/^[0-9]{6}$/, { message: 'Le code OTP doit contenir uniquement des chiffres' })
  code: string;
}