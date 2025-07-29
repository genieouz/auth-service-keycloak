import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Sécurité avec Helmet
  app.use(helmet());

  // Configuration pour les uploads de fichiers
  app.use('/api-docs', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    next();
  });

  // Configuration de la validation globale
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    disableErrorMessages: process.env.NODE_ENV === 'production',
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Configuration CORS
  app.enableCors({
    origin: true, // Autorise toutes les origines
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 200,
  });

  // Configuration Swagger
  const config = new DocumentBuilder()
    .setTitle('Service d\'authentification')
    .setDescription('API REST sécurisée pour la gestion de l\'authentification avec Keycloak, contrôle d\'accès basé sur les rôles et gestion des avatars')
    .setVersion('1.0')
    .addTag('authentification', 'Endpoints pour l\'authentification des utilisateurs')
    .addTag('utilisateurs', 'Endpoints pour la gestion des utilisateurs')
    .addTag('avatars', 'Endpoints pour la gestion des avatars utilisateurs')
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

  // Générer le fichier swagger.json
  try {
    // Créer le répertoire dist s'il n'existe pas
    const distDir = join(process.cwd(), 'dist');
    mkdirSync(distDir, { recursive: true });
    
    // Écrire le fichier swagger.json
    const swaggerPath = join(distDir, 'swagger.json');
    writeFileSync(swaggerPath, JSON.stringify(document, null, 2), 'utf8');
    
    console.log(`📄 Documentation Swagger générée: ${swaggerPath}`);
  } catch (error) {
    console.error('❌ Erreur lors de la génération du fichier swagger.json:', error);
  }

  const port = process.env.PORT || 3001;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  await app.listen(port);
  
  console.log(`🚀 Service d'authentification sécurisé démarré sur le port ${port}`);
  console.log(`📚 Documentation disponible sur http://localhost:${port}/api-docs`);
  console.log(`🔒 Authentification JWT activée`);
  console.log(`🛡️ Rate limiting: 100 req/min`);
}

bootstrap();