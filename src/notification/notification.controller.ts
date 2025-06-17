import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { SendSmsDto, SendEmailDto } from './dto/notification.dto';
import { ApiResponseDto } from '../common/dto/response.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  @Post('sms/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Envoyer un SMS',
    description: 'Envoie un SMS via le service de notification Topatoko'
  })
  @ApiBody({ type: SendSmsDto })
  @ApiResponse({ 
    status: 200, 
    description: 'SMS envoyé avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données SMS invalides ou erreur d\'envoi' 
  })
  async sendSms(@Body() sendSmsDto: SendSmsDto) {
    try {
      const result = await this.notificationService.sendSms(sendSmsDto);
      return {
        success: result.success,
        message: result.message,
        data: result.data,
      };
    } catch (error) {
      this.logger.error('Erreur lors de l\'envoi SMS', error);
      throw error;
    }
  }

  @Post('email/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Envoyer un email',
    description: 'Envoie un email via le service de notification Topatoko'
  })
  @ApiBody({ type: SendEmailDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Email envoyé avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données email invalides ou erreur d\'envoi' 
  })
  async sendEmail(@Body() sendEmailDto: SendEmailDto) {
    try {
      const result = await this.notificationService.sendEmail(sendEmailDto);
      return {
        success: result.success,
        message: result.message,
        data: result.data,
      };
    } catch (error) {
      this.logger.error('Erreur lors de l\'envoi email', error);
      throw error;
    }
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Vérifier la santé du service de notification',
    description: 'Vérifie si le service de notification Topatoko est disponible'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Statut du service de notification',
    type: ApiResponseDto 
  })
  async checkHealth() {
    try {
      const isHealthy = await this.notificationService.checkHealth();
      return {
        success: true,
        message: isHealthy ? 'Service de notification disponible' : 'Service de notification indisponible',
        data: { healthy: isHealthy },
      };
    } catch (error) {
      this.logger.error('Erreur lors de la vérification de santé', error);
      return {
        success: false,
        message: 'Erreur lors de la vérification du service',
        data: { healthy: false },
      };
    }
  }
}