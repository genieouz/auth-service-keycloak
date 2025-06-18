import { IsString, IsNotEmpty, IsOptional, IsEmail, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendSmsDto {
  @ApiProperty({ 
    description: 'Numéro de téléphone destinataire', 
    example: '+221771234567' 
  })
  @IsString()
  @IsNotEmpty({ message: 'Le numéro de téléphone est obligatoire' })
  @Matches(/^\+221[0-9]{9}$/, { message: 'Format de téléphone invalide (ex: +221771234567)' })
  to: string;

  @ApiProperty({ 
    description: 'Message à envoyer', 
    example: 'Votre code de vérification est: 123456' 
  })
  @IsString()
  @IsNotEmpty({ message: 'Le message est obligatoire' })
  message: string;

  @ApiProperty({ 
    description: 'Expéditeur du SMS', 
    example: 'SenegalServices',
    required: false 
  })
  @IsOptional()
  @IsString()
  from?: string;
}

export class SendEmailDto {
  @ApiProperty({ 
    description: 'Adresse email destinataire', 
    example: 'user@example.com' 
  })
  @IsEmail({}, { message: 'Format d\'email invalide' })
  @IsNotEmpty({ message: 'L\'email est obligatoire' })
  to: string;

  @ApiProperty({ 
    description: 'Sujet de l\'email', 
    example: 'Code de vérification' 
  })
  @IsString()
  @IsNotEmpty({ message: 'Le sujet est obligatoire' })
  subject: string;

  @ApiProperty({ 
    description: 'Contenu de l\'email (HTML supporté)', 
    example: '<h1>Votre code: 123456</h1>' 
  })
  @IsString()
  @IsNotEmpty({ message: 'Le message est obligatoire' })
  message: string;

  @ApiProperty({ 
    description: 'Expéditeur de l\'email', 
    example: 'noreply@senegalservices.com',
    required: false 
  })
  @IsOptional()
  @IsEmail({}, { message: 'Format d\'email expéditeur invalide' })
  from?: string;
}