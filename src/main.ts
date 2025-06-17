import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuration de la validation globale
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Configuration CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Configuration Swagger
  const config = new DocumentBuilder()
    .setTitle('Service d\'authentification')
    .setDescription('API REST pour la gestion de l\'authentification avec Keycloak')
    .setVersion('1.0')
    .addTag('authentification', 'Endpoints pour l\'authentification des utilisateurs')
    .addTag('utilisateurs', 'Endpoints pour la gestion des utilisateurs')
    .addTag('otp', 'Endpoints pour la gestion des codes OTP')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'Documentation API - Service d\'authentification',
    customfavIcon: '/favicon.ico',
    customCssUrl: '/swagger-ui-custom.css',
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🚀 Service d'authentification démarré sur le port ${port}`);
  console.log(`📚 Documentation disponible sur http://localhost:${port}/api-docs`);
}

bootstrap();