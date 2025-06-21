import { Controller, Post, Body, HttpCode, HttpStatus, Logger, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { VerifyOtpDto } from '../otp/dto/verify-otp.dto';
import { ApiResponseDto } from '../common/dto/response.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('authentification')
@Controller('auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
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
  @Public()
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
      
      // Adapter la réponse selon si l'authentification automatique a réussi
      const responseData: any = {
        userId: result.userId,
      };
      
      if (result.session) {
        responseData.session = result.session;
        responseData.user = result.user;
        responseData.permissions = result.permissions;
      }
      
      return {
        success: true,
        message: result.message,
        data: responseData,
      };
    } catch (error) {
      this.logger.error('Erreur lors de la vérification OTP', error);
      throw error;
    }
  }

  @Post('create-user')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Créer un utilisateur directement (Admin)',
    description: 'Permet aux administrateurs de créer un utilisateur sans processus OTP. L\'utilisateur recevra un email avec un mot de passe temporaire.'
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Utilisateur créé avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données de création invalides' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Permissions insuffisantes' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Utilisateur déjà existant' 
  })
  async createUser(@Body() createUserDto: CreateUserDto, @CurrentUser() currentUser: any) {
    try {
      const result = await this.authService.createUser(createUserDto);
      
      this.logger.log(`Utilisateur créé par admin ${currentUser.username}: ${result.userId}`);
      
      return {
        success: true,
        message: result.message,
        data: {
          userId: result.userId,
          temporaryPassword: result.temporaryPassword,
          passwordResetRequired: result.passwordResetRequired,
        },
      };
    } catch (error) {
      this.logger.error('Erreur lors de la création d\'utilisateur par admin', error);
      throw error;
    }
  }

  @Post('login')
  @Public()
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
      const result = await this.authService.login(loginDto);
      return {
        success: true,
        message: result.message,
        data: {
          session: result.session,
          user: result.user,
          permissions: result.permissions,
        },
      };
    } catch (error) {
      this.logger.error('Erreur lors de la connexion', error);
      throw error;
    }
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Rafraîchir le token d\'accès',
    description: 'Obtenir un nouveau token d\'accès avec le token de rafraîchissement'
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Token rafraîchi avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Token de rafraîchissement invalide' 
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    try {
      const tokenData = await this.authService.refreshToken(refreshTokenDto.refresh_token);
      return {
        success: true,
        message: 'Token rafraîchi avec succès',
        data: tokenData,
      };
    } catch (error) {
      this.logger.error('Erreur lors du rafraîchissement du token', error);
      throw error;
    }
  }

  @Patch('change-password')
  @ApiOperation({ 
    summary: 'Changer le mot de passe',
    description: 'Permet à un utilisateur authentifié de changer son mot de passe'
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Mot de passe changé avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Mot de passe actuel incorrect' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Non authentifié' 
  })
  async changePassword(@CurrentUser() user: any, @Body() changePasswordDto: ChangePasswordDto) {
    try {
      await this.authService.changePassword(user.userId, changePasswordDto);
      return {
        success: true,
        message: 'Mot de passe changé avec succès',
      };
    } catch (error) {
      this.logger.error('Erreur lors du changement de mot de passe', error);
      throw error;
    }
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Demander la réinitialisation du mot de passe',
    description: 'Envoie un code OTP pour réinitialiser le mot de passe'
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Code de réinitialisation envoyé',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    try {
      const result = await this.authService.forgotPassword(forgotPasswordDto);
      return {
        success: true,
        message: result.message,
        data: {
          expiresAt: result.expiresAt,
        },
      };
    } catch (error) {
      this.logger.error('Erreur lors de la demande de réinitialisation', error);
      throw error;
    }
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Réinitialiser le mot de passe',
    description: 'Réinitialise le mot de passe avec le code OTP reçu'
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Mot de passe réinitialisé avec succès',
    type: ApiResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Code OTP invalide' 
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    try {
      await this.authService.resetPassword(resetPasswordDto);
      return {
        success: true,
        message: 'Mot de passe réinitialisé avec succès',
      };
    } catch (error) {
      this.logger.error('Erreur lors de la réinitialisation du mot de passe', error);
      throw error;
    }
  }

  @Post('logout')
  @ApiOperation({ 
    summary: 'Déconnecter l\'utilisateur',
    description: 'Invalide le token d\'accès de l\'utilisateur'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Déconnexion réussie',
    type: ApiResponseDto 
  })
  async logout(@CurrentUser() user: any) {
    try {
      await this.authService.logout(user.userId);
      return {
        success: true,
        message: 'Déconnexion réussie',
      };
    } catch (error) {
      this.logger.error('Erreur lors de la déconnexion', error);
      throw error;
    }
  }
}