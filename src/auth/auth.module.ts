import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpModule } from '../otp/otp.module';
import { KeycloakModule } from '../keycloak/keycloak.module';

@Module({
  imports: [OtpModule, KeycloakModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}