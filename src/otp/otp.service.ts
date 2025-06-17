import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Otp, OtpDocument } from './schemas/otp.schema';
import { GenerateOtpDto } from './dto/generate-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectModel(Otp.name) private otpModel: Model<OtpDocument>,
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
  async generateOtp(generateOtpDto: GenerateOtpDto): Promise<{ code: string; expiresAt: Date }> {
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

    this.logger.log(`Code OTP généré pour ${identifier}: ${code}`);
    
    // TODO: Intégrer un service d'envoi SMS/Email
    // En attendant, on retourne le code pour les tests
    return { code, expiresAt };
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