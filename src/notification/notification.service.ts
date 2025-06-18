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
        subject: emailData.subject,
        html: emailData.message,
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
    const message = `Votre code de vérification SenegalServices est: ${code}. Ce code expire dans 5 minutes. Ne le partagez avec personne.`;
    
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
      <h2>Code de vérification</h2>
      <p>Votre code de vérification SenegalServices est:</p>
      <h1 style="color: #007bff; font-size: 32px; text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">${code}</h1>
      <p><strong>Ce code expire dans 5 minutes.</strong></p>
      <p>Si vous n'avez pas demandé ce code, ignorez ce message.</p>
      <hr>
      <p><small>SenegalServices - Service d'authentification</small></p>
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