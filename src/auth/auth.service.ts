import { Injectable, Logger, BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { OtpService } from '../otp/otp.service';
import { KeycloakService } from '../keycloak/keycloak.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from '../otp/dto/verify-otp.dto';
import { KeycloakUser, KeycloakTokenResponse } from '../common/interfaces/keycloak.interface';
import { SessionResponseDto, UserProfileDto, PermissionsDto } from '../common/dto/response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly otpService: OtpService,
    private readonly keycloakService: KeycloakService,
  ) {}

  /**
   * Démarrer le processus d'inscription
   */
  async register(registerDto: RegisterDto): Promise<{ message: string; expiresAt: Date }> {
    const { email, phone } = registerDto;
    
    if (!email && !phone) {
      throw new BadRequestException('Email ou téléphone requis pour l\'inscription');
    }

    // Validation des conditions générales
    if (!registerDto.acceptTerms) {
      throw new BadRequestException('L\'acceptation des conditions générales est obligatoire');
    }

    if (!registerDto.acceptPrivacyPolicy) {
      throw new BadRequestException('L\'acceptation de la politique de confidentialité est obligatoire');
    }

    // Validation de l'âge si la date de naissance est fournie (minimum 13 ans)
    if (registerDto.birthDate) {
      const birthDate = new Date(registerDto.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 13) {
        throw new BadRequestException('Vous devez avoir au moins 13 ans pour créer un compte');
      }
    }

    try {
      // Vérifier si l'utilisateur existe déjà dans Keycloak (optimisé)
      const userExists = await this.keycloakService.userExists(email, phone);
      
      if (userExists) {
        throw new ConflictException('Un utilisateur avec cet email ou téléphone existe déjà');
      }

      // Générer et envoyer le code OTP
      const otpResult = await this.otpService.generateOtp(registerDto);
      
      const deliveryMethod = email ? 'email' : 'SMS';
      const deliveryStatus = otpResult.sent ? 'envoyé' : 'généré (erreur d\'envoi)';
      
      return {
        message: `Code OTP ${deliveryStatus} par ${deliveryMethod}`,
        expiresAt: otpResult.expiresAt,
      };
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Erreur lors de l\'inscription', error);
      throw new BadRequestException('Erreur lors du processus d\'inscription');
    }
  }

  /**
   * Vérifier le code OTP et créer l'utilisateur
   */
  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{
    message: string;
    userId: string;
    session?: SessionResponseDto;
    user?: UserProfileDto;
    permissions?: PermissionsDto;
  }> {
    try {
      // Vérifier le code OTP
      const otpRecord = await this.otpService.verifyOtp(verifyOtpDto);
      
      // Préparer les données utilisateur pour Keycloak
      const { email, phone, password, firstName, lastName } = otpRecord.userData;
      
      const keycloakUser: KeycloakUser = {
        username: email || phone,
        email: email,
        firstName: firstName,
        lastName: lastName,
        enabled: true,
        emailVerified: !!email, // Seulement si un vrai email est fourni
        attributes: {
          ...(phone && { phone: [phone] }),
          ...(otpRecord.userData.birthDate && { birthDate: [otpRecord.userData.birthDate] }),
          ...(otpRecord.userData.gender && { gender: [otpRecord.userData.gender] }),
          ...(otpRecord.userData.address && { address: [otpRecord.userData.address] }),
          ...(otpRecord.userData.city && { city: [otpRecord.userData.city] }),
          ...(otpRecord.userData.postalCode && { postalCode: [otpRecord.userData.postalCode] }),
          ...(otpRecord.userData.country && { country: [otpRecord.userData.country] }),
          ...(otpRecord.userData.profession && { profession: [otpRecord.userData.profession] }),
          acceptTerms: [otpRecord.userData.acceptTerms.toString()],
          acceptPrivacyPolicy: [otpRecord.userData.acceptPrivacyPolicy.toString()],
          ...(otpRecord.userData.acceptMarketing !== undefined && { 
            acceptMarketing: [otpRecord.userData.acceptMarketing.toString()] 
          }),
          registrationDate: [new Date().toISOString()],
          // Marquer le type de compte pour faciliter la gestion
          accountType: [email ? 'email' : 'phone'],
        },
        credentials: [{
          type: 'password',
          value: password,
          temporary: false,
        }],
      };

      // Créer l'utilisateur dans Keycloak
      const userId = await this.keycloakService.createUser(keycloakUser);
      
      this.logger.log(`Utilisateur créé avec succès: ${userId}`);

      // Attendre un peu plus pour les comptes téléphone avant l'authentification
      if (!email && phone) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Tentative d'authentification automatique après création  
      try {
        const identifier = email || phone;
        const authResult = await this.authenticateAndBuildResponse(identifier, password);
        
        return {
          message: 'Utilisateur créé et connecté avec succès',
          userId,
          session: authResult.session,
          user: authResult.user,
          permissions: authResult.permissions,
        };
      } catch (authError) {
        this.logger.warn(`Authentification automatique échouée pour ${userId}:`, authError.message);
        
        return {
          message: 'Utilisateur créé avec succès. Veuillez vous connecter dans quelques instants.',
          userId,
        };
      }
    } catch (error) {
      this.logger.error('Erreur lors de la vérification OTP', error);
      throw error;
    }
  }

  /**
   * Connecter un utilisateur
   */
  async login(loginDto: LoginDto): Promise<{
    message: string;
    session: SessionResponseDto;
    user: UserProfileDto;
    permissions: PermissionsDto;
  }> {
    const { email, phone, password } = loginDto;
    
    if (!email && !phone) {
      throw new BadRequestException('Email ou téléphone requis pour la connexion');
    }

    const identifier = email || phone;
    
    try {
      const result = await this.authenticateAndBuildResponse(identifier, password);
      
      return {
        message: 'Connexion réussie',
        ...result,
      };
    } catch (error) {
      this.logger.error('Erreur lors de la connexion', error);
      throw error;
    }
  }

  /**
   * Authentifier et construire la réponse complète
   */
  private async authenticateAndBuildResponse(identifier: string, password: string): Promise<{
    session: SessionResponseDto;
    user: UserProfileDto;
    permissions: PermissionsDto;
  }> {
    // Authentifier avec Keycloak
    const tokenResponse = await this.keycloakService.authenticateUser(identifier, password);
    
    // Décoder le token pour obtenir les informations utilisateur
    const decodedToken = await this.keycloakService.verifyToken(tokenResponse.access_token);
    
    // Récupérer les détails complets de l'utilisateur
    const userDetails = await this.keycloakService.getUserById(decodedToken.sub);
    
    // Construire la réponse de session
    const session: SessionResponseDto = {
      access_token: tokenResponse.access_token,
      token_type: tokenResponse.token_type,
      expires_in: tokenResponse.expires_in,
      refresh_token: tokenResponse.refresh_token,
      scope: tokenResponse.scope,
      issuedAt: new Date(decodedToken.iat * 1000).toISOString(),
      expiresAt: new Date(decodedToken.exp * 1000).toISOString(),
      remainingTime: decodedToken.exp - Math.floor(Date.now() / 1000),
      isExpiringSoon: (decodedToken.exp - Math.floor(Date.now() / 1000)) < 300, // < 5 minutes
      audience: Array.isArray(decodedToken.aud) ? decodedToken.aud : [decodedToken.aud],
    };

    // Construire le profil utilisateur
    const user: UserProfileDto = {
      id: userDetails.id,
      username: userDetails.username,
      email: userDetails.email,
      firstName: userDetails.firstName,
      lastName: userDetails.lastName,
      enabled: userDetails.enabled,
      emailVerified: userDetails.emailVerified,
      roles: decodedToken.realm_access?.roles || [],
      clientRoles: decodedToken.resource_access?.[process.env.KEYCLOAK_USER_CLIENT_ID]?.roles || [],
      attributes: userDetails.attributes || {},
      registrationDate: userDetails.attributes?.registrationDate?.[0] || new Date().toISOString(),
    };

    // Calculer les permissions
    const permissions: PermissionsDto = {
      canManageUsers: user.roles.includes('admin'),
      canViewUsers: user.roles.includes('admin') || user.roles.includes('moderator'),
      isAdmin: user.roles.includes('admin'),
      isModerator: user.roles.includes('moderator'),
      isUser: user.roles.includes('user') || user.roles.length === 0,
    };

    return { session, user, permissions };
  }

  /**
   * Rafraîchir le token d'accès
   */
  async refreshToken(refreshToken: string): Promise<KeycloakTokenResponse> {
    try {
      return await this.keycloakService.refreshToken(refreshToken);
    } catch (error) {
      this.logger.error('Erreur lors du rafraîchissement du token', error);
      throw new UnauthorizedException('Token de rafraîchissement invalide');
    }
  }

  /**
   * Changer le mot de passe d'un utilisateur
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    try {
      // Vérifier l'ancien mot de passe en tentant une authentification
      const user = await this.keycloakService.getUserById(userId);
      const identifier = user.email || user.attributes?.phone?.[0];
      
      if (!identifier) {
        throw new BadRequestException('Impossible de vérifier l\'identité de l\'utilisateur');
      }

      // Tenter l'authentification avec l'ancien mot de passe
      try {
        await this.keycloakService.authenticateUser(identifier, changePasswordDto.currentPassword);
      } catch (error) {
        throw new BadRequestException('Mot de passe actuel incorrect');
      }

      // Changer le mot de passe
      await this.keycloakService.changeUserPassword(userId, changePasswordDto.newPassword);
      
      this.logger.log(`Mot de passe changé pour l'utilisateur ${userId}`);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Erreur lors du changement de mot de passe', error);
      throw new BadRequestException('Impossible de changer le mot de passe');
    }
  }

  /**
   * Demander la réinitialisation du mot de passe
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string; expiresAt: Date }> {
    const { email, phone } = forgotPasswordDto;
    
    if (!email && !phone) {
      throw new BadRequestException('Email ou téléphone requis');
    }
    try {
      // Vérifier si l'utilisateur existe
      const userExists = await this.keycloakService.userExists(email, phone);
      
      if (!userExists) {
        throw new NotFoundException('Aucun utilisateur trouvé avec cet email ou téléphone');
      }

      // Générer un code OTP pour la réinitialisation
      const otpResult = await this.otpService.generatePasswordResetOtp({ email, phone });
      
      const deliveryMethod = email ? 'email' : 'SMS';
      
      return {
        message: `Code de réinitialisation envoyé par ${deliveryMethod}`,
        expiresAt: otpResult.expiresAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Erreur lors de la demande de réinitialisation', error);
      throw new BadRequestException('Erreur lors du processus de réinitialisation');
    }
  }

  /**
   * Réinitialiser le mot de passe avec le code OTP
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    try {
      // Vérifier le code OTP de réinitialisation
      const otpRecord = await this.otpService.verifyPasswordResetOtp(resetPasswordDto);
      
      // Trouver l'utilisateur dans Keycloak
      const identifier = resetPasswordDto.email || resetPasswordDto.phone;
      const user = await this.keycloakService.findUserByIdentifier(identifier);
      
      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      // Réinitialiser le mot de passe
      await this.keycloakService.changeUserPassword(user.id, resetPasswordDto.newPassword);
      
      this.logger.log(`Mot de passe réinitialisé pour l'utilisateur ${user.id}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Erreur lors de la réinitialisation du mot de passe', error);
      throw error;
    }
  }

  /**
   * Déconnecter un utilisateur (invalider les sessions)
   */
  async logout(userId: string): Promise<void> {
    try {
      await this.keycloakService.logoutUser(userId);
      this.logger.log(`Utilisateur ${userId} déconnecté`);
    } catch (error) {
      this.logger.error('Erreur lors de la déconnexion', error);
      // Ne pas faire échouer la déconnexion côté client même si Keycloak échoue
    }
  }
}