import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { KeycloakService } from '../../keycloak/keycloak.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
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
      audience: configService.get('KEYCLOAK_USER_CLIENT_ID'),
      issuer: `${configService.get('KEYCLOAK_URL')}/realms/${configService.get('KEYCLOAK_REALM')}`,
    };

    super(options);
  }

  async validate(payload: any) {
    try {
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
        throw new UnauthorizedException('Utilisateur non trouvé');
      }
      
      if (!user || !user.enabled) {
        throw new UnauthorizedException('Utilisateur désactivé ou inexistant');
      }

      return {
        userId: payload.sub,
        username: payload.preferred_username,
        email: payload.email,
        roles: payload.realm_access?.roles || [],
        clientRoles: payload.resource_access?.[this.configService.get('KEYCLOAK_USER_CLIENT_ID')]?.roles || [],
        firstName: user.firstName,
        lastName: user.lastName,
        scope: payload.scope,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Erreur lors de la validation du token');
    }
  }
}