import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from './users.service';

@Injectable()
export class UsersScheduledTasks {
  private readonly logger = new Logger(UsersScheduledTasks.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * Tâche planifiée pour rafraîchir les URLs d'avatar expirées
   * Exécutée tous les jours à 2h du matin
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleAvatarUrlRefresh() {
    this.logger.log('Début de la tâche planifiée de rafraîchissement des URLs d\'avatar');
    
    try {
      const result = await this.usersService.refreshExpiredAvatarUrls();
      
      this.logger.log(
        `Tâche planifiée terminée: ${result.updated} URLs mises à jour, ${result.errors} erreurs`
      );
      
      // Si beaucoup d'erreurs, log en tant qu'erreur pour alerter
      if (result.errors > 10) {
        this.logger.error(
          `Nombre élevé d'erreurs lors du rafraîchissement des avatars: ${result.errors}`
        );
      }
    } catch (error) {
      this.logger.error('Erreur lors de la tâche planifiée de rafraîchissement des avatars', error);
    }
  }

  /**
   * Tâche planifiée pour nettoyer les avatars orphelins
   * Exécutée tous les dimanches à 3h du matin
   */
  @Cron(CronExpression.EVERY_SUNDAY_AT_3AM)
  async handleOrphanedAvatarsCleanup() {
    this.logger.log('Début de la tâche planifiée de nettoyage des avatars orphelins');
    
    try {
      // Cette tâche pourrait être implémentée pour supprimer les avatars
      // qui ne sont plus référencés par aucun utilisateur
      this.logger.log('Tâche de nettoyage des avatars orphelins - À implémenter');
    } catch (error) {
      this.logger.error('Erreur lors de la tâche de nettoyage des avatars orphelins', error);
    }
  }
}