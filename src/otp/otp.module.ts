import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationModule } from '../notification/notification.module';
import { OtpService } from './otp.service';
import { Otp, OtpSchema } from './schemas/otp.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Otp.name, schema: OtpSchema }]),
    NotificationModule,
  ],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}