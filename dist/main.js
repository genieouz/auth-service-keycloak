"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.enableCors({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    });
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Service d\'authentification')
        .setDescription('API REST pour la gestion de l\'authentification avec Keycloak')
        .setVersion('1.0')
        .addTag('authentification', 'Endpoints pour l\'authentification des utilisateurs')
        .addTag('utilisateurs', 'Endpoints pour la gestion des utilisateurs')
        .addTag('otp', 'Endpoints pour la gestion des codes OTP')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api-docs', app, document, {
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
//# sourceMappingURL=main.js.map