import { NotificationModule } from "./notification/notification.module";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";
import { OtpModule } from "./otp/otp.module";
import { UsersModule } from "./users/users.module";
import { KeycloakModule } from "./keycloak/keycloak.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesModule } from "./roles/roles.module";

@Module({
  imports: [
    NotificationModule,
    // Configuration des variables d'environnement
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),

    // Configuration du rate limiting
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.RATE_LIMIT_TTL) || 60000, // 1 minute
      limit: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 100 requêtes par minute
    }]),

    // Configuration MongoDB
    MongooseModule.forRoot(process.env.MONGODB_URL),

    // Modules de l'application
    AuthModule,
    OtpModule,
    UsersModule,
    KeycloakModule,
    NotificationModule,
    RolesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
