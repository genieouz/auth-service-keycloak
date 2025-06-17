import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { OtpService } from '../otp/otp.service';
import { KeycloakService } from '../keycloak/keycloak.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from '../otp/dto/verify-otp.dto';
import { KeycloakUser, KeycloakTokenResponse } from '../common/interfaces/keycloak.interface';

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

    try {
      // Vérifier si l'utilisateur existe déjà dans Keycloak
      const users = await this.keycloakService.getUsers();
      const existingUser = users.find(user => 
        user.email === email || 
        (user.attributes?.phone && user.attributes.phone.includes(phone))
      );

      if (existingUser) {
        throw new ConflictException('Un utilisateur avec cet email ou téléphone existe déjà');
      }

      // Générer et envoyer le code OTP
      const otpResult = await this.otpService.generateOtp(registerDto);
      
      // TODO: Intégrer service d'envoi SMS/Email
      this.logger.log(`Code OTP pour inscription: ${otpResult.code}`);
      
      return {
        message: `Code OTP envoyé avec succès ${email ? 'par email' : 'par SMS'}`,
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
  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{ message: string; userId: string }> {
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
        attributes: phone ? { phone: [phone] } : {},
        credentials: [{
          type: 'password',
          value: password,
          temporary: false,
        }],
      };

      // Créer l'utilisateur dans Keycloak
      const userId = await this.keycloakService.createUser(keycloakUser);
      
      this.logger.log(`Utilisateur créé avec succès: ${userId}`);
      
      return {
        message: 'Utilisateur créé avec succès',
        userId,
      };
    } catch (error) {
      this.logger.error('Erreur lors de la vérification OTP', error);
      throw error;
    }
  }

  /**
   * Connecter un utilisateur
   */
  async login(loginDto: LoginDto): Promise<KeycloakTokenResponse> {
    const { email, phone, password } = loginDto;
    
    if (!email && !phone) {
      throw new BadRequestException('Email ou téléphone requis pour la connexion');
    }

    const identifier = email || phone;
    
    try {
      return await this.keycloakService.authenticateUser(identifier, password);
    } catch (error) {
      this.logger.error('Erreur lors de la connexion', error);
      throw error;
    }
  }
}