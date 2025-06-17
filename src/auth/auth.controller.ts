import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from '../otp/dto/verify-otp.dto';
import { ApiResponseDto } from '../common/dto/response.dto';

@ApiTags('authentification')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Démarrer l\'inscription d\'un utilisateur',
    description: 'Génère et envoie un code OTP pour vérifier l\'email ou le téléphone avant de créer le compte utilisateur'
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Code OTP envoyé avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données d\'inscription invalides' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Utilisateur déjà existant' 
  })
  async register(@Body() registerDto: RegisterDto) {
    try {
      const result = await this.authService.register(registerDto);
      return {
        success: true,
        message: result.message,
        data: {
          expiresAt: result.expiresAt,
        },
      };
    } catch (error) {
      this.logger.error('Erreur lors de l\'inscription', error);
      throw error;
    }
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Vérifier le code OTP et créer l\'utilisateur',
    description: 'Vérifie le code OTP reçu et crée définitivement le compte utilisateur dans Keycloak'
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Utilisateur créé avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Code OTP invalide ou données incorrectes' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Code OTP non trouvé ou expiré' 
  })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    try {
      const result = await this.authService.verifyOtp(verifyOtpDto);
      return {
        success: true,
        message: result.message,
        data: {
          userId: result.userId,
        },
      };
    } catch (error) {
      this.logger.error('Erreur lors de la vérification OTP', error);
      throw error;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Connecter un utilisateur',
    description: 'Authentifier un utilisateur avec son email/téléphone et mot de passe via Keycloak'
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Connexion réussie',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données de connexion invalides' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Identifiants incorrects' 
  })
  async login(@Body() loginDto: LoginDto) {
    try {
      const tokenData = await this.authService.login(loginDto);
      return {
        success: true,
        message: 'Connexion réussie',
        data: {
          access_token: tokenData.access_token,
          token_type: tokenData.token_type,
          expires_in: tokenData.expires_in,
          scope: tokenData.scope,
        },
      };
    } catch (error) {
      this.logger.error('Erreur lors de la connexion', error);
      throw error;
    }
  }
}