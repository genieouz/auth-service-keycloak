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
      // Validation d'audience stricte activée
      audience: ['account', configService.get('KEYCLOAK_USER_CLIENT_ID')],
    };

    super(options);
  }

  async validate(payload: any) {
    try {
      // Logs de sécurité (niveau info en production)
      this.logger.log(`Validation token pour utilisateur: ${payload.preferred_username}`);

      // Vérifications de sécurité strictes
      if (!payload.sub) {
        throw new UnauthorizedException('Token invalide: subject manquant');
      }

      if (!payload.iss || !payload.iss.includes(this.configService.get('KEYCLOAK_REALM'))) {
        throw new UnauthorizedException('Token invalide: issuer incorrect');
      }

      // Vérifier l'expiration explicitement
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new UnauthorizedException('Token expiré');
      }

      // Vérifier l'audience strictement
      const validAudiences = ['account', this.configService.get('KEYCLOAK_USER_CLIENT_ID')];
      const tokenAudience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      
      const hasValidAudience = validAudiences.some(validAud => 
        tokenAudience.includes(validAud)
      );

      if (!hasValidAudience) {
        this.logger.error(`SÉCURITÉ: Token audience invalide. Attendu: ${validAudiences.join(', ')}, Reçu: ${tokenAudience.join(', ')}`);
        throw new UnauthorizedException(`Token audience invalide. Attendu: ${validAudiences.join(', ')}`);
      }

      // Vérifier si l'utilisateur existe toujours dans Keycloak
      let user;
      try {
        user = await this.keycloakService.getUserById(payload.sub);
      } catch (error) {
        this.logger.error(`SÉCURITÉ: Utilisateur ${payload.sub} non trouvé dans Keycloak`);
        throw new UnauthorizedException('Utilisateur non trouvé');
      }
      
      if (!user || !user.enabled) {
        this.logger.error(`SÉCURITÉ: Utilisateur ${payload.sub} désactivé`);
        throw new UnauthorizedException('Utilisateur désactivé ou inexistant');
      }

      // Vérifier que le token n'est pas trop ancien (optionnel)
      const tokenAge = now - payload.iat;
      const maxTokenAge = 24 * 60 * 60; // 24 heures
      if (tokenAge > maxTokenAge) {
        this.logger.warn(`SÉCURITÉ: Token très ancien pour ${payload.preferred_username} (${Math.floor(tokenAge / 3600)}h)`);
      }

      this.logger.log(`Authentification réussie pour: ${payload.preferred_username}`);

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
        // Informations de sécurité
        tokenIssuedAt: payload.iat,
        tokenExpiration: payload.exp,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('SÉCURITÉ: Erreur lors de la validation du token:', error);
      throw new UnauthorizedException('Erreur lors de la validation du token');
    }
  }
}