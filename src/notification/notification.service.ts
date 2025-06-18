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
        to: smsData.to,
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
      message,
      from: 'SenegalServices',
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
}