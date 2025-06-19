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
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly otpService: OtpService,
    private readonly keycloakService: KeycloakService,
    private readonly configService: ConfigService,
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
    session: any;
    user: any;
    permissions: any;
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
        emailVerified: !!email,
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
      
      // Authentifier automatiquement l'utilisateur après création
      const identifier = email || phone;
      const tokenResponse = await this.keycloakService.authenticateUser(identifier, password);
      
      // Récupérer les informations complètes de l'utilisateur
      const userProfile = await this.keycloakService.getUserById(userId);
      
      // Calculer les permissions
      const permissions = this.calculatePermissions(userProfile);
      
      // Formater la session
      const session = this.formatSessionResponse(tokenResponse);
      
      // Formater le profil utilisateur
      const user = this.formatUserProfile(userProfile);
      
      return {
        message: 'Utilisateur créé avec succès',
        userId,
        session,
        user,
        permissions,
      };
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
    session: any;
    user: any;
    permissions: any;
  }> {
    const { email, phone, password } = loginDto;
    
    if (!email && !phone) {
      throw new BadRequestException('Email ou téléphone requis pour la connexion');
    }

    const identifier = email || phone;
    
    try {
      const tokenResponse = await this.keycloakService.authenticateUser(identifier, password);
      
      // Décoder le token pour obtenir l'ID utilisateur
      const decodedToken = this.decodeToken(tokenResponse.access_token);
      const userId = decodedToken.sub;
      
      // Récupérer les informations complètes de l'utilisateur
      const userProfile = await this.keycloakService.getUserById(userId);
      
      // Calculer les permissions
      const permissions = this.calculatePermissions(userProfile);
      
      // Formater la session
      const session = this.formatSessionResponse(tokenResponse);
      
      // Formater le profil utilisateur
      const user = this.formatUserProfile(userProfile);
      
      this.logger.log(`Connexion réussie pour l'utilisateur: ${identifier}`);
      
      return {
        message: 'Connexion réussie',
        session,
        user,
        permissions,
      };
    } catch (error) {
      this.logger.error('Erreur lors de la connexion', error);
      throw error;
    }
  }

  /**
   * Décoder un token JWT sans vérification (pour extraire les claims)
   */
  private decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(Buffer.from(payload, 'base64').toString());
    } catch (error) {
      throw new BadRequestException('Token invalide');
    }
  }

  /**
   * Calculer les permissions d'un utilisateur
   */
  private calculatePermissions(user: KeycloakUser): any {
    // Récupérer les rôles depuis les attributs ou une logique métier
    const roles = user.attributes?.roles || [];
    
    return {
      canManageUsers: roles.includes('admin') || roles.includes('user_manager'),
      canViewUsers: roles.includes('admin') || roles.includes('moderator') || roles.includes('user_manager'),
      isAdmin: roles.includes('admin'),
      isModerator: roles.includes('moderator'),
      isUser: true, // Tous les utilisateurs authentifiés sont des "users"
    };
  }

  /**
   * Formater la réponse de session
   */
  private formatSessionResponse(tokenResponse: KeycloakTokenResponse): any {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (tokenResponse.expires_in * 1000));
    const remainingTime = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
    const isExpiringSoon = remainingTime < 300; // Moins de 5 minutes

    return {
      access_token: tokenResponse.access_token,
      token_type: tokenResponse.token_type || 'Bearer',
      expires_in: tokenResponse.expires_in,
      refresh_token: tokenResponse.refresh_token || null,
      scope: tokenResponse.scope,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      remainingTime,
      isExpiringSoon,
      audience: ['account', this.configService.get('KEYCLOAK_USER_CLIENT_ID')],
    };
  }

  /**
   * Formater le profil utilisateur
   */
  private formatUserProfile(user: KeycloakUser): any {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      enabled: user.enabled,
      emailVerified: user.emailVerified,
      roles: user.attributes?.roles || [],
      clientRoles: user.attributes?.clientRoles || [],
      attributes: {
        phone: user.attributes?.phone?.[0],
        birthDate: user.attributes?.birthDate?.[0],
        gender: user.attributes?.gender?.[0],
        address: user.attributes?.address?.[0],
        city: user.attributes?.city?.[0],
        postalCode: user.attributes?.postalCode?.[0],
        country: user.attributes?.country?.[0],
        profession: user.attributes?.profession?.[0],
        acceptTerms: user.attributes?.acceptTerms?.[0] === 'true',
        acceptPrivacyPolicy: user.attributes?.acceptPrivacyPolicy?.[0] === 'true',
        acceptMarketing: user.attributes?.acceptMarketing?.[0] === 'true',
      },
      registrationDate: user.attributes?.registrationDate?.[0],
    };
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