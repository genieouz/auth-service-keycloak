import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Indique si la requête a réussi' })
  success: boolean;

  @ApiProperty({ description: 'Message de réponse' })
  message: string;

  @ApiProperty({ description: 'Données de réponse' })
  data?: T;

  @ApiProperty({ description: 'Code d\'erreur en cas d\'échec', required: false })
  errorCode?: string;
}

export class PaginatedResponseDto<T> extends ApiResponseDto<T[]> {
  @ApiProperty({ description: 'Nombre total d\'éléments' })
  total: number;

  @ApiProperty({ description: 'Page actuelle' })
  page: number;

  @ApiProperty({ description: 'Nombre d\'éléments par page' })
  limit: number;

  @ApiProperty({ description: 'Nombre total de pages' })
  totalPages: number;
}

export class SessionResponseDto {
  @ApiProperty({ description: 'Token d\'accès JWT' })
  access_token: string;

  @ApiProperty({ description: 'Type de token' })
  token_type: string;

  @ApiProperty({ description: 'Durée de validité en secondes' })
  expires_in: number;

  @ApiProperty({ description: 'Token de rafraîchissement', required: false })
  refresh_token?: string;

  @ApiProperty({ description: 'Portée du token' })
  scope: string;

  @ApiProperty({ description: 'Date d\'émission du token' })
  issuedAt: string;

  @ApiProperty({ description: 'Date d\'expiration du token' })
  expiresAt: string;

  @ApiProperty({ description: 'Temps restant avant expiration (secondes)' })
  remainingTime: number;

  @ApiProperty({ description: 'Indique si le token expire bientôt (< 5 min)' })
  isExpiringSoon: boolean;

  @ApiProperty({ description: 'Audience du token' })
  audience: string[];
}

export class UserProfileDto {
  @ApiProperty({ description: 'Identifiant unique de l\'utilisateur' })
  id: string;

  @ApiProperty({ description: 'Nom d\'utilisateur' })
  username: string;

  @ApiProperty({ description: 'Adresse email' })
  email: string;

  @ApiProperty({ description: 'Prénom' })
  firstName: string;

  @ApiProperty({ description: 'Nom de famille' })
  lastName: string;

  @ApiProperty({ description: 'Compte activé' })
  enabled: boolean;

  @ApiProperty({ description: 'Email vérifié' })
  emailVerified: boolean;

  @ApiProperty({ description: 'Rôles realm' })
  roles: string[];

  @ApiProperty({ description: 'Rôles client' })
  clientRoles: string[];

  @ApiProperty({ description: 'Attributs utilisateur' })
  attributes: any;

  @ApiProperty({ description: 'Date d\'inscription' })
  registrationDate: string;
}

export class PermissionsDto {
  @ApiProperty({ description: 'Peut gérer les utilisateurs' })
  canManageUsers: boolean;

  @ApiProperty({ description: 'Peut voir les utilisateurs' })
  canViewUsers: boolean;

  @ApiProperty({ description: 'Est administrateur' })
  isAdmin: boolean;

  @ApiProperty({ description: 'Est modérateur' })
  isModerator: boolean;

  @ApiProperty({ description: 'Est utilisateur standard' })
  isUser: boolean;
}

export class VerifyOtpResponseDto extends ApiResponseDto<any> {
  @ApiProperty({ description: 'Identifiant de l\'utilisateur créé' })
  userId: string;

  @ApiProperty({ description: 'Informations de session', type: SessionResponseDto })
  session: SessionResponseDto;

  @ApiProperty({ description: 'Profil utilisateur', type: UserProfileDto })
  user: UserProfileDto;

  @ApiProperty({ description: 'Permissions calculées', type: PermissionsDto })
  permissions: PermissionsDto;
}