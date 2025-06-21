import { Injectable, Logger, BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { UserMapperUtil } from '../common/utils/user-mapper.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
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
        email: email || undefined, // CRITIQUE: undefined pour téléphone uniquement
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
          accountType: [email ? 'email' : 'phone'],
          // Ajouter les attributs personnalisés s'ils existent
          ...(otpRecord.userData.customAttributes && this.processCustomAttributes(otpRecord.userData.customAttributes)),
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

      // Attendre que Keycloak finalise la création
      await new Promise(resolve => setTimeout(resolve, 2000));

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
   * Créer un utilisateur directement (sans OTP) - réservé aux administrateurs
   */
  async createUser(createUserDto: any): Promise<{ 
    message: string; 
    userId: string; 
    temporaryPassword: string;
    passwordResetRequired: boolean;
  }> {
    try {
      // Vérifier si l'utilisateur existe déjà
      const userExists = await this.keycloakService.userExists(createUserDto.email);
      
      if (userExists) {
        throw new ConflictException('Un utilisateur avec cet email existe déjà');
      }

      // Générer un mot de passe temporaire sécurisé
      const temporaryPassword = this.generateSecurePassword();
      
      // Utiliser le mapper pour créer l'objet Keycloak
      const keycloakUser = UserMapperUtil.mapCreateDtoToKeycloak(createUserDto, temporaryPassword);
      
      // Créer l'utilisateur dans Keycloak
      const userId = await this.keycloakService.createUser(keycloakUser);
      
      // Assigner les rôles si spécifiés
      if (createUserDto.roles && createUserDto.roles.length > 0) {
        await this.keycloakService.assignRolesToUser(userId, createUserDto.roles);
      }
      
      // Envoyer l'email avec le mot de passe temporaire
      try {
        await this.sendWelcomeEmail(createUserDto.email, createUserDto.firstName, temporaryPassword);
      } catch (emailError) {
        this.logger.error('Erreur lors de l\'envoi de l\'email de bienvenue', emailError);
        // Ne pas faire échouer la création si l'email échoue
      }
      
      this.logger.log(`Utilisateur créé par admin avec succès: ${userId}`);
      
      return {
        message: 'Utilisateur créé avec succès. Un email avec les informations de connexion a été envoyé.',
        userId,
        temporaryPassword: process.env.NODE_ENV === 'development' ? temporaryPassword : '***',
        passwordResetRequired: createUserDto.requirePasswordReset !== false,
      };
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Erreur lors de la création d\'utilisateur', error);
      throw new BadRequestException('Erreur lors de la création de l\'utilisateur');
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
    const user: UserProfileDto = UserMapperUtil.mapKeycloakUserToProfile(
      userDetails,
      decodedToken.realm_access?.roles || [],
      decodedToken.resource_access?.[process.env.KEYCLOAK_USER_CLIENT_ID]?.roles || []
    );

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

  /**
   * Générer un mot de passe sécurisé
   */
  private generateSecurePassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Assurer au moins un caractère de chaque type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Majuscule
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Minuscule
    password += '0123456789'[Math.floor(Math.random() * 10)]; // Chiffre
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Caractère spécial
    
    // Compléter avec des caractères aléatoires
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Mélanger les caractères
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Envoyer un email de bienvenue avec mot de passe temporaire
   */
  private async sendWelcomeEmail(email: string, firstName: string, temporaryPassword: string): Promise<void> {
    // Importer dynamiquement le service de notification pour éviter les dépendances circulaires
    const { NotificationService } = await import('../notification/notification.service');
    const notificationService = new NotificationService(this.configService);
    
    const subject = 'Bienvenue sur SenegalServices - Vos informations de connexion';
    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1e40af; margin: 0;">🎉 Bienvenue sur SenegalServices</h1>
          <p style="color: #64748b; margin: 5px 0;">"Dalal ak diam ci Guichet unique"</p>
        </div>
        
        <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #0369a1; margin-top: 0;">Bonjour ${firstName},</h2>
          <p>Votre compte SenegalServices a été créé avec succès ! Vous pouvez maintenant accéder à tous nos services administratifs en ligne.</p>
        </div>
        
        <div style="background-color: #fefce8; border: 1px solid #eab308; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #a16207; margin-top: 0;">🔐 Vos informations de connexion :</h3>
          <p><strong>Email :</strong> ${email}</p>
          <p><strong>Mot de passe temporaire :</strong> <code style="background-color: #fbbf24; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${temporaryPassword}</code></p>
        </div>
        
        <div style="background-color: #fef2f2; border: 1px solid #f87171; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>⚠️ Important :</strong></p>
          <ul style="margin: 10px 0;">
            <li>Ce mot de passe est temporaire et doit être changé lors de votre première connexion</li>
            <li>Gardez ces informations confidentielles</li>
            <li>Connectez-vous dès que possible pour sécuriser votre compte</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://senegalservices.com'}/login" 
             style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Se connecter maintenant
          </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #64748b; font-size: 14px;">
            Simplifiez vos démarches administratives avec SenegalServices
          </p>
          <p style="color: #64748b; font-size: 12px;">
            © 2024 SenegalServices - Service d'authentification sécurisé
          </p>
        </div>
      </div>
    `;
    
    await notificationService.sendEmail({
      to: email,
      subject,
      message,
      from: 'welcome@senegalservices.com',
    });
  }

  /**
   * Traiter les attributs personnalisés pour Keycloak
   */
  private processCustomAttributes(customAttributes: { [key: string]: string | string[] }): { [key: string]: string[] } {
    const processed: { [key: string]: string[] } = {};
    
    Object.keys(customAttributes).forEach(key => {
      const value = customAttributes[key];
      processed[key] = Array.isArray(value) ? value : [value];
    });
    
    return processed;
  }

  /**
   * Construire un objet utilisateur optimisé pour Keycloak
   */
  private buildKeycloakUserObject(userData: any): KeycloakUser {
    const { email, phone, password, firstName, lastName, ...otherData } = userData;
    
    // Champs principaux au niveau racine (recommandé par Keycloak)
    const baseUser: KeycloakUser = {
      username: email || phone,
      email: email || undefined, // undefined pour téléphone uniquement
      firstName: firstName,
      lastName: lastName,
      enabled: true,
      emailVerified: !!email,
    };

    // Attributs personnalisés (seulement ce qui est nécessaire)
    const customAttributes: { [key: string]: string[] } = {};
    
    // Informations de contact
    if (phone) customAttributes.phone = [phone];
    
    // Informations personnelles (optionnelles)
    if (otherData.birthDate) customAttributes.birthDate = [otherData.birthDate];
    if (otherData.gender) customAttributes.gender = [otherData.gender];
    
    // Adresse (optionnelle)
    if (otherData.address) customAttributes.address = [otherData.address];
    if (otherData.city) customAttributes.city = [otherData.city];
    if (otherData.postalCode) customAttributes.postalCode = [otherData.postalCode];
    if (otherData.country) customAttributes.country = [otherData.country];
    
    // Profession (optionnelle)
    if (otherData.profession) customAttributes.profession = [otherData.profession];
    
    // Consentements (obligatoires)
    customAttributes.acceptTerms = [otherData.acceptTerms.toString()];
    customAttributes.acceptPrivacyPolicy = [otherData.acceptPrivacyPolicy.toString()];
    
    // Marketing (optionnel)
    if (otherData.acceptMarketing !== undefined) {
      customAttributes.acceptMarketing = [otherData.acceptMarketing.toString()];
    }
    
    // Métadonnées du compte
    customAttributes.registrationDate = [new Date().toISOString()];
    customAttributes.accountType = [email ? 'email' : 'phone'];
    customAttributes.accountSetupComplete = ['true'];
    
    // Ajouter les attributs seulement s'il y en a
    if (Object.keys(customAttributes).length > 0) {
      baseUser.attributes = customAttributes;
    }

    // Credentials
    baseUser.credentials = [{
      type: 'password',
      value: password,
      temporary: false,
    }];

    return baseUser;
  }
}