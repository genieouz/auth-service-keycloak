import { NotificationModule } from "./notification/notification.module";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "./auth/auth.module";
import { OtpModule } from "./otp/otp.module";
import { UsersModule } from "./users/users.module";
import { KeycloakModule } from "./keycloak/keycloak.module";

@Module({
  imports: [
    NotificationModule,
    // Configuration des variables d'environnement
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),

    // Configuration MongoDB
    MongooseModule.forRoot(process.env.MONGODB_URL),

    // Modules de l'application
    AuthModule,
    OtpModule,
    UsersModule,
    KeycloakModule,
    NotificationModule,
  ],
})
export class AppModule {}
