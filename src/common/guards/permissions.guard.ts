import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RolesService } from '../../roles/roles.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    
    try {
      // Vérifier chaque permission requise
      for (const permission of requiredPermissions) {
        const hasPermission = await this.rolesService.userHasPermission(user.userId, permission);
        if (!hasPermission) {
          this.logger.warn(`Accès refusé: utilisateur ${user.username} n'a pas la permission ${permission}`);
          throw new ForbiddenException(`Permission manquante: ${permission}`);
        }
      }
      
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error('Erreur lors de la vérification des permissions', error);
      throw new ForbiddenException('Erreur lors de la vérification des permissions');
    }
  }
}