import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { KeycloakService } from '../../keycloak/keycloak.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private keycloakService: KeycloakService,
  ) {
    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: async (request, rawJwtToken, done) => {
        try {
          // Décoder le header pour obtenir le kid
          const header = JSON.parse(Buffer.from(rawJwtToken.split('.')[0], 'base64').toString());
          
          if (!header.kid) {
            return done(new UnauthorizedException('Token invalide: kid manquant'), null);
          }

          // Obtenir la clé publique de Keycloak
          const publicKey = await this.keycloakService.getPublicKey(header.kid);
          done(null, publicKey);
        } catch (error) {
          done(new UnauthorizedException('Impossible de vérifier le token'), null);
        }
      },
      algorithms: ['RS256'],
      issuer: `${configService.get('KEYCLOAK_URL')}/realms/${configService.get('KEYCLOAK_REALM')}`,
      // Pas de validation d'audience stricte pour le moment
    };

    super(options);
  }

  async validate(payload: any) {
    try {
      // Log pour debug (à supprimer en production)
      this.logger.debug('JWT Payload:', {
        sub: payload.sub,
        aud: payload.aud,
        iss: payload.iss,
        preferred_username: payload.preferred_username,
        email: payload.email,
        exp: payload.exp,
        iat: payload.iat,
      });

      // Vérifier l'audience manuellement
      const validAudiences = ['account', this.configService.get('KEYCLOAK_USER_CLIENT_ID')];
      const tokenAudience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      
      const hasValidAudience = validAudiences.some(validAud => 
        tokenAudience.includes(validAud)
      );

      if (!hasValidAudience) {
        this.logger.warn(`Token audience invalide. Attendu: ${validAudiences.join(', ')}, Reçu: ${tokenAudience.join(', ')}`);
        // Pour le moment, on log seulement sans bloquer
        // throw new UnauthorizedException('Audience du token invalide');
      }

      // Le payload contient déjà les informations du token vérifié
      if (!payload.sub) {
        throw new UnauthorizedException('Token invalide: subject manquant');
      }

      // Vérifier si l'utilisateur existe toujours dans Keycloak (optionnel pour les performances)
      let user;
      try {
        user = await this.keycloakService.getUserById(payload.sub);
      } catch (error) {
        // Si l'utilisateur n'existe plus dans Keycloak, on refuse l'accès
        this.logger.error(`Utilisateur ${payload.sub} non trouvé dans Keycloak`);
        throw new UnauthorizedException('Utilisateur non trouvé');
      }
      
      if (!user || !user.enabled) {
        throw new UnauthorizedException('Utilisateur désactivé ou inexistant');
      }

      this.logger.debug(`Authentification réussie pour l'utilisateur: ${payload.preferred_username}`);

      return {
        userId: payload.sub,
        username: payload.preferred_username,
        email: payload.email,
        roles: payload.realm_access?.roles || [],
        clientRoles: payload.resource_access?.[this.configService.get('KEYCLOAK_USER_CLIENT_ID')]?.roles || [],
        firstName: user.firstName,
        lastName: user.lastName,
        scope: payload.scope,
        tokenAudience: tokenAudience,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Erreur lors de la validation du token:', error);
      throw new UnauthorizedException('Erreur lors de la validation du token');
    }
  }
}