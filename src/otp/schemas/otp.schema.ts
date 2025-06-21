import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OtpDocument = Otp & Document;

@Schema({ timestamps: true })
export class Otp {
  @Prop({ required: true, index: true })
  identifier: string; // Email ou téléphone

  @Prop({ required: true })
  code: string;

  @Prop({ required: true, index: { expires: '5m' } })
  expiresAt: Date;

  @Prop({ default: false })
  verified: boolean;

  @Prop({ required: true, type: Object })
  userData: {
    email?: string;
    phone?: string;
    password: string;
    firstName: string;
    lastName: string;
    birthDate?: string;
    gender?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    profession?: string;
    acceptTerms: boolean;
    acceptPrivacyPolicy: boolean;
    acceptMarketing?: boolean;
    customAttributes?: { [key: string]: string | string[] };
  };
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

// Index pour l'auto-suppression après expiration
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });