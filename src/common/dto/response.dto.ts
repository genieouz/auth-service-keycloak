import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ 
    description: 'Indique si la requête a réussi',
    example: true
  })
  success: boolean;

  @ApiProperty({ 
    description: 'Message de réponse',
    example: 'Opération réussie'
  })
  message: string;

  @ApiProperty({ 
    description: 'Données de réponse',
    required: false
  })
  data?: T;

  @ApiProperty({ 
    description: 'Code d\'erreur en cas d\'échec', 
    required: false,
    example: 'VALIDATION_ERROR'
  })
  errorCode?: string;
}

export class PaginatedResponseDto<T> extends ApiResponseDto<T[]> {
  @ApiProperty({ 
    description: 'Nombre total d\'éléments',
    example: 150
  })
  total: number;

  @ApiProperty({ 
    description: 'Page actuelle (commence à 0)',
    example: 0
  })
  page: number;

  @ApiProperty({ 
    description: 'Nombre d\'éléments par page',
    example: 20
  })
  limit: number;

  @ApiProperty({ 
    description: 'Nombre total de pages',
    example: 8
  })
  totalPages: number;
}

export class SessionResponseDto {
  @ApiProperty({ 
    description: 'Token d\'accès JWT',
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJrZXlJZCJ9...'
  })
  access_token: string;

  @ApiProperty({ 
    description: 'Type de token',
    example: 'Bearer'
  })
  token_type: string;

  @ApiProperty({ 
    description: 'Durée de validité en secondes',
    example: 3600
  })
  expires_in: number;

  @ApiProperty({ 
    description: 'Token de rafraîchissement', 
    required: false,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJyZWZyZXNoS2V5In0...'
  })
  refresh_token?: string;

  @ApiProperty({ 
    description: 'Portée du token',
    example: 'openid profile email offline_access'
  })
  scope: string;

  @ApiProperty({ 
    description: 'Date d\'émission du token (ISO 8601)',
    example: '2024-01-15T10:30:00.000Z'
  })
  issuedAt: string;

  @ApiProperty({ 
    description: 'Date d\'expiration du token (ISO 8601)',
    example: '2024-01-15T11:30:00.000Z'
  })
  expiresAt: string;

  @ApiProperty({ 
    description: 'Temps restant avant expiration (secondes)',
    example: 3540
  })
  remainingTime: number;

  @ApiProperty({ 
    description: 'Indique si le token expire bientôt (< 5 min)',
    example: false
  })
  isExpiringSoon: boolean;

  @ApiProperty({ 
    description: 'Audience du token',
    example: ['account', 'senegalservices_client'],
    type: [String]
  })
  audience: string[];
}

export class UserProfileDto {
  @ApiProperty({ 
    description: 'Identifiant unique de l\'utilisateur',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  id: string;

  @ApiProperty({ 
    description: 'Nom d\'utilisateur (email ou téléphone)',
    example: 'amadou.diallo@example.com'
  })
  username: string;

  @ApiProperty({ 
    description: 'Adresse email', 
    required: false,
    example: 'amadou.diallo@example.com'
  })
  email?: string;

  @ApiProperty({ 
    description: 'Prénom',
    example: 'Amadou'
  })
  firstName: string;

  @ApiProperty({ 
    description: 'Nom de famille',
    example: 'Diallo'
  })
  lastName: string;

  @ApiProperty({ 
    description: 'Compte activé',
    example: true
  })
  enabled: boolean;

  @ApiProperty({ 
    description: 'Email vérifié',
    example: true
  })
  emailVerified: boolean;

  @ApiProperty({ 
    description: 'Rôles realm assignés à l\'utilisateur',
    example: ['user', 'gestionnaire_documents'],
    type: [String]
  })
  roles: string[];

  @ApiProperty({ 
    description: 'Rôles client spécifiques à l\'application',
    example: ['app_user'],
    type: [String]
  })
  clientRoles: string[];

  @ApiProperty({ 
    description: 'Date d\'inscription (ISO 8601)',
    example: '2024-01-10T08:00:00.000Z'
  })
  registrationDate: string;

  // Attributs aplatis pour une meilleure expérience développeur
  @ApiProperty({ 
    description: 'Numéro de téléphone au format international', 
    required: false,
    example: '+221771234567'
  })
  phone?: string;

  @ApiProperty({ 
    description: 'Date de naissance au format YYYY-MM-DD', 
    required: false,
    example: '1990-05-15'
  })
  birthDate?: string;

  @ApiProperty({ 
    description: 'Genre de l\'utilisateur', 
    required: false,
    example: 'M',
    enum: ['M', 'F', 'Autre']
  })
  gender?: string;

  @ApiProperty({ 
    description: 'Adresse complète de résidence', 
    required: false,
    example: '123 Avenue Bourguiba, Plateau'
  })
  address?: string;

  @ApiProperty({ 
    description: 'Ville de résidence', 
    required: false,
    example: 'Dakar'
  })
  city?: string;

  @ApiProperty({ 
    description: 'Code postal', 
    required: false,
    example: '10000'
  })
  postalCode?: string;

  @ApiProperty({ 
    description: 'Pays de résidence', 
    required: false,
    example: 'Sénégal'
  })
  country?: string;

  @ApiProperty({ 
    description: 'Profession ou métier', 
    required: false,
    example: 'Développeur Full Stack'
  })
  profession?: string;

  @ApiProperty({ 
    description: 'Acceptation des conditions générales d\'utilisation',
    example: true
  })
  acceptTerms: boolean;

  @ApiProperty({ 
    description: 'Acceptation de la politique de confidentialité',
    example: true
  })
  acceptPrivacyPolicy: boolean;

  @ApiProperty({ 
    description: 'Consentement pour recevoir des communications marketing', 
    required: false,
    example: false
  })
  acceptMarketing?: boolean;

  @ApiProperty({ 
    description: 'Type de compte selon le mode d\'inscription', 
    required: false,
    example: 'email',
    enum: ['email', 'phone']
  })
  accountType?: string;

  @ApiProperty({ 
    description: 'URL de l\'avatar de l\'utilisateur', 
    required: false,
    example: 'https://minio.example.com/senegalservices-avatars/avatars/user-id/avatar.jpg'
  })
  avatarUrl?: string;

  // Attributs personnalisés non mappés (pour extensibilité)
  @ApiProperty({ 
    description: 'Autres attributs personnalisés définis par l\'application', 
    required: false,
    example: { 
      'directPermissions': ['users:read', 'users:create'],
      'departement': 'IT', 
      'niveau_acces': 'standard' 
    }
  })
  customAttributes?: { [key: string]: any };
}

export class PermissionsDto {
  @ApiProperty({ 
    description: 'Toutes les permissions effectives de l\'utilisateur (rôles + directes)', 
    type: [String],
    example: ['users:read', 'users:create', 'documents:read']
  })
  effectivePermissions: string[];

  @ApiProperty({ 
    description: 'Permissions héritées des rôles', 
    type: [String],
    example: ['documents:read']
  })
  rolePermissions: string[];

  @ApiProperty({ 
    description: 'Permissions assignées directement à l\'utilisateur', 
    type: [String],
    example: ['users:read', 'users:create']
  })
  directPermissions: string[];

  @ApiProperty({ 
    description: 'Rôles de l\'utilisateur', 
    type: [String],
    example: ['default-roles-senegal services', 'admin']
  })
  roles: string[];

  @ApiProperty({ 
    description: 'Peut gérer les utilisateurs',
    example: true
  })
  canManageUsers: boolean;

  @ApiProperty({ 
    description: 'Peut voir les utilisateurs',
    example: true
  })
  canViewUsers: boolean;

  @ApiProperty({ 
    description: 'Est administrateur',
    example: true
  })
  isAdmin: boolean;

  @ApiProperty({ 
    description: 'Est modérateur',
    example: false
  })
  isModerator: boolean;

  @ApiProperty({ 
    description: 'Est utilisateur standard',
    example: false
  })
  isUser: boolean;
}

export class ResourceDefinitionDto {
  @ApiProperty({ 
    description: 'Identifiant unique de la ressource',
    example: 'res_1234567890_abc123def'
  })
  id: string;

  @ApiProperty({ 
    description: 'Nom unique de la ressource',
    example: 'documents'
  })
  name: string;

  @ApiProperty({ 
    description: 'Description de la ressource',
    example: 'Gestion des documents administratifs et commerciaux'
  })
  description: string;

  @ApiProperty({ 
    description: 'Actions possibles sur cette ressource',
    type: [String],
    example: ['read', 'create', 'update', 'delete', 'approve']
  })
  actions: string[];

  @ApiProperty({ 
    description: 'Catégorie de la ressource',
    example: 'business',
    enum: ['system', 'business', 'administration', 'finance', 'hr', 'custom'],
    required: false
  })
  category?: string;

  @ApiProperty({ 
    description: 'Portée par défaut pour les permissions générées',
    example: 'own',
    enum: ['own', 'all', 'department', 'team'],
    required: false
  })
  defaultScope?: string;

  @ApiProperty({ 
    description: 'Indique si c\'est une ressource système',
    example: false
  })
  isSystem: boolean;

  @ApiProperty({ 
    description: 'Date de création de la ressource',
    example: '2025-01-15T10:30:00.000Z'
  })
  createdAt: string;

  @ApiProperty({ 
    description: 'Date de dernière mise à jour',
    example: '2025-01-15T11:45:00.000Z'
  })
  updatedAt: string;
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