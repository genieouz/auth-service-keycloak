import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface SendSmsRequest {
  to: string;
  message: string;
  from?: string;
}

export interface SendEmailRequest {
  to: string;
  subject: string;
  message: string;
  from?: string;
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly httpClient: AxiosInstance;
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get('NOTIFICATION_SERVICE');

    this.httpClient = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Envoyer un SMS via l'API Topatoko
   */
  async sendSms(smsData: SendSmsRequest): Promise<NotificationResponse> {
    try {
      this.logger.log(`Envoi SMS vers ${smsData.to}`);

      const response = await this.httpClient.post('notifications/sms', {
        phone: smsData.to,
        message: smsData.message,
      });

      this.logger.log(`SMS envoyé avec succès vers ${smsData.to}`);
      
      return {
        success: true,
        message: 'SMS envoyé avec succès',
        data: response.data,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi SMS vers ${smsData.to}`, error.response?.data || error.message);
      
      // En mode développement, on simule l'envoi
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.warn(`MODE DEV: SMS simulé vers ${smsData.to}: ${smsData.message}`);
        return {
          success: true,
          message: 'SMS simulé en mode développement',
          data: { simulated: true },
        };
      }

      throw new BadRequestException('Impossible d\'envoyer le SMS');
    }
  }

  /**
   * Envoyer un email via l'API Topatoko
   */
  async sendEmail(emailData: SendEmailRequest): Promise<NotificationResponse> {
    try {
      this.logger.log(`Envoi email vers ${emailData.to}`);

      const response = await this.httpClient.post('notifications/email', {
        to: emailData.to,
        subject: emailData.subject, // objet du mail
        html: emailData.message, // format html
      });

      this.logger.log(`Email envoyé avec succès vers ${emailData.to}`);
      
      return {
        success: true,
        message: 'Email envoyé avec succès',
        data: response.data,
      };
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi email vers ${emailData.to}`, error.response?.data || error.message);
      
      // En mode développement, on simule l'envoi
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.warn(`MODE DEV: Email simulé vers ${emailData.to}: ${emailData.subject}`);
        return {
          success: true,
          message: 'Email simulé en mode développement',
          data: { simulated: true },
        };
      }

      throw new BadRequestException('Impossible d\'envoyer l\'email');
    }
  }

  /**
   * Envoyer un code OTP par SMS
   */
  async sendOtpSms(phone: string, code: string): Promise<NotificationResponse> {
    const message = `SenegalServices: Votre code de vérification est ${code}. Valide 5 min. Ne le partagez pas. "Dalal ak diam ci Guichet unique"`;
    
    return this.sendSms({
      to: phone,
      message
    });
  }

  /**
   * Envoyer un code OTP par email
   */
  async sendOtpEmail(email: string, code: string): Promise<NotificationResponse> {
    const subject = 'Code de vérification SenegalServices';
    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1e40af; margin: 0;">SenegalServices</h1>
          <p style="color: #64748b; margin: 5px 0;">"Dalal ak diam ci Guichet unique"</p>
        </div>
        
      <h2>Code de vérification</h2>
      <p>Votre code de vérification SenegalServices est:</p>
      <h1 style="color: #007bff; font-size: 32px; text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">${code}</h1>
      <p><strong>Ce code expire dans 5 minutes.</strong></p>
      <p>Utilisez ce code pour finaliser la création de votre compte et accéder à tous nos services administratifs en ligne.</p>
      <p>Si vous n'avez pas demandé ce code, ignorez ce message.</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="color: #64748b; font-size: 14px;">
          Effectuez vos démarches administratives en ligne, sans vous déplacer
        </p>
        <p style="color: #64748b; font-size: 12px;">
          © 2024 SenegalServices - Service d'authentification
        </p>
      </div>
      </div>
    `;
    
    return this.sendEmail({
      to: email,
      subject,
      message,
      from: 'noreply@senegalservices.com',
    });
  }

  /**
   * Vérifier la santé du service de notification
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/api/health');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Service de notification indisponible', error.message);
      return false;
    }
  }

  /**
   * Envoyer un code de réinitialisation par SMS
   */
  async sendPasswordResetSms(phone: string, code: string): Promise<NotificationResponse> {
    const message = `SenegalServices: Code de réinitialisation ${code}. Valide 10 min. Sécurisez votre compte. Ne le partagez pas.`;
    
    return this.sendSms({
      to: phone,
      message,
      from: 'SenegalServices',
    });
  }

  /**
   * Envoyer un code de réinitialisation par email
   */
  async sendPasswordResetEmail(email: string, code: string): Promise<NotificationResponse> {
    const subject = 'Réinitialisation de mot de passe - SenegalServices';
    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #dc2626; margin: 0;">🔒 SenegalServices</h1>
          <p style="color: #64748b; margin: 5px 0;">"Dalal ak diam ci Guichet unique"</p>
        </div>
        
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #dc2626; margin-top: 0;">Réinitialisation de mot de passe</h2>
          <p>Une demande de réinitialisation de mot de passe a été effectuée pour votre compte.</p>
        </div>
        
        <p>Votre code de réinitialisation est :</p>
        <h1 style="color: #dc2626; font-size: 32px; text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border: 2px solid #dc2626;">${code}</h1>
        
        <div style="background-color: #fffbeb; border: 1px solid #fed7aa; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>⚠️ Important :</strong></p>
          <ul style="margin: 10px 0;">
            <li>Ce code expire dans <strong>10 minutes</strong></li>
            <li>Ne partagez jamais ce code avec personne</li>
            <li>Si vous n'avez pas demandé cette réinitialisation, ignorez ce message</li>
          </ul>
        </div>
        
        <p>Utilisez ce code pour définir votre nouveau mot de passe et sécuriser votre accès aux services administratifs.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #64748b; font-size: 14px;">
            Sécurisez vos démarches administratives en ligne
          </p>
          <p style="color: #64748b; font-size: 12px;">
            © 2024 SenegalServices - Service d'authentification sécurisé
          </p>
        </div>
      </div>
    `;
    
    return this.sendEmail({
      to: email,
      subject,
      message,
      from: 'security@senegalservices.com',
    });
  }

  /**
   * Envoyer un email de bienvenue avec mot de passe temporaire
   */
  async sendWelcomeEmail(email: string, firstName: string, temporaryPassword: string): Promise<NotificationResponse> {
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
    
    return this.sendEmail({
      to: email,
      subject,
      message,
      from: 'welcome@senegalservices.com',
    });
  }
}