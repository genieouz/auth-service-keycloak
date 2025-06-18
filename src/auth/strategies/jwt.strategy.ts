import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { KeycloakService } from '../../keycloak/keycloak.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private keycloakService: KeycloakService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET') || 'your-secret-key',
      algorithms: ['HS256'],
    });
  }

  async validate(payload: any) {
    try {
      // Vérifier si l'utilisateur existe toujours dans Keycloak
      const user = await this.keycloakService.getUserById(payload.sub);
      
      if (!user || !user.enabled) {
        throw new UnauthorizedException('Utilisateur désactivé ou inexistant');
      }

      return {
        userId: payload.sub,
        username: payload.preferred_username,
        email: payload.email,
        roles: payload.realm_access?.roles || ['user'],
        firstName: user.firstName,
        lastName: user.lastName,
      };
    } catch (error) {
      throw new UnauthorizedException('Token invalide');
    }
  }
}