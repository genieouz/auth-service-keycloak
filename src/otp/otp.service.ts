import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationService } from '../notification/notification.service';
import { Otp, OtpDocument } from './schemas/otp.schema';
import { GenerateOtpDto } from './dto/generate-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectModel(Otp.name) private otpModel: Model<OtpDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Générer un code OTP à 6 chiffres
   */
  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Créer et stocker un code OTP
   */
  async generateOtp(generateOtpDto: GenerateOtpDto): Promise<{ code: string; expiresAt: Date; sent: boolean }> {
    const { email, phone, ...userData } = generateOtpDto;
    
    if (!email && !phone) {
      throw new BadRequestException('Email ou téléphone requis');
    }

    const identifier = email || phone;
    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Supprimer les anciens codes OTP pour cet identifiant
    await this.otpModel.deleteMany({ identifier });

    // Créer le nouveau code OTP
    const otp = new this.otpModel({
      identifier,
      code,
      expiresAt,
      userData: {
        email,
        phone,
        ...userData,
      },
    });

    await otp.save();

    this.logger.log(`Code OTP généré pour ${identifier}`);
    
    // Envoyer le code OTP via le service de notification
    let sent = false;
    try {
      if (email) {
        await this.notificationService.sendOtpEmail(email, code);
        this.logger.log(`Code OTP envoyé par email à ${email}`);
        sent = true;
      } else if (phone) {
        await this.notificationService.sendOtpSms(phone, code);
        this.logger.log(`Code OTP envoyé par SMS à ${phone}`);
        sent = true;
      }
    } catch (error) {
      this.logger.error('Erreur lors de l\'envoi du code OTP', error);
      // En cas d'erreur d'envoi, on log le code pour les tests en développement
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn(`CODE OTP POUR TESTS: ${code}`);
      }
    }
    
    return { code: process.env.NODE_ENV === 'development' ? code : '******', expiresAt, sent };
  }

  /**
   * Vérifier un code OTP
   */
  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<OtpDocument> {
    const { email, phone, code } = verifyOtpDto;
    
    if (!email && !phone) {
      throw new BadRequestException('Email ou téléphone requis');
    }

    const identifier = email || phone;

    const otp = await this.otpModel.findOne({
      identifier,
      code,
      verified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otp) {
      throw new NotFoundException('Code OTP invalide ou expiré');
    }

    // Marquer le code comme vérifié
    otp.verified = true;
    await otp.save();

    this.logger.log(`Code OTP vérifié avec succès pour ${identifier}`);
    return otp;
  }

  /**
   * Nettoyer les codes OTP expirés (appelé périodiquement)
   */
  async cleanupExpiredOtp(): Promise<void> {
    const result = await this.otpModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    this.logger.log(`${result.deletedCount} codes OTP expirés supprimés`);
  }
}