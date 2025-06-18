import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Sécurité avec Helmet
  app.use(helmet());

  // Configuration de la validation globale
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Configuration CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Configuration Swagger
  const config = new DocumentBuilder()
    .setTitle('Service d\'authentification')
    .setDescription('API REST sécurisée pour la gestion de l\'authentification avec Keycloak et contrôle d\'accès basé sur les rôles')
    .setVersion('1.0')
    .addTag('authentification', 'Endpoints pour l\'authentification des utilisateurs')
    .addTag('utilisateurs', 'Endpoints pour la gestion des utilisateurs')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Token JWT obtenu lors de la connexion',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'Documentation API - Service d\'authentification',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🚀 Service d'authentification sécurisé démarré sur le port ${port}`);
  console.log(`📚 Documentation disponible sur http://localhost:${port}/api-docs`);
  console.log(`🔒 Authentification JWT activée`);
  console.log(`🛡️ Rate limiting: 100 req/min`);
}

bootstrap();