import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }
    
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      // Log de sécurité pour les tentatives d'accès non autorisées
      const message = err?.message || info?.message || 'Token invalide ou expiré';
      console.error('SÉCURITÉ: Tentative d\'accès non autorisée:', {
        error: err?.message,
        info: info?.message,
        timestamp: new Date().toISOString(),
      });
      throw err || new UnauthorizedException('Accès non autorisé');
    }
    return user;
  }
}