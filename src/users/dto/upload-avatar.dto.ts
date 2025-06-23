import { ApiProperty } from '@nestjs/swagger';

export class UploadAvatarDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Fichier image pour l\'avatar (JPG, PNG, WebP - max 5MB)',
    example: 'avatar.jpg'
  })
  avatar: any;
}

export class AvatarResponseDto {
  @ApiProperty({
    description: 'URL de l\'avatar uploadé',
    example: 'https://minio.example.com/bucket/avatars/user-id/avatar.jpg'
  })
  url: string;

  @ApiProperty({
    description: 'Nom du fichier dans le stockage',
    example: 'avatars/user-id/uuid.jpg'
  })
  fileName: string;

  @ApiProperty({
    description: 'Taille du fichier en octets',
    example: 45678
  })
  size: number;

  @ApiProperty({
    description: 'Type MIME du fichier',
    example: 'image/jpeg'
  })
  mimeType: string;

  @ApiProperty({
    description: 'Indique si l\'URL est signée temporairement',
    example: true
  })
  isSignedUrl: boolean;

  @ApiProperty({
    description: 'Date d\'expiration de l\'URL signée (si applicable)',
    example: '2024-01-15T10:30:00Z',
    required: false
  })
  expiresAt?: string;
}