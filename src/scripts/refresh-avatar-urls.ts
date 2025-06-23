#!/usr/bin/env node

/**
 * Script autonome pour rafraîchir les URLs d'avatar expirées
 * Conçu pour être exécuté par un CronJob Kubernetes
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';

async function main() {
  const logger = new Logger('AvatarRefreshScript');
  
  try {
    logger.log('🚀 Démarrage du script de rafraîchissement des URLs d\'avatar');
    
    // Créer l'application NestJS sans serveur HTTP
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });
    
    // Récupérer le service utilisateurs
    const usersService = app.get(UsersService);
    
    // Exécuter le rafraîchissement
    const startTime = Date.now();
    const result = await usersService.refreshExpiredAvatarUrls();
    const duration = Date.now() - startTime;
    
    logger.log(`✅ Rafraîchissement terminé en ${duration}ms`);
    logger.log(`📊 Résultats: ${result.updated} URLs mises à jour, ${result.errors} erreurs`);
    
    // Fermer l'application
    await app.close();
    
    // Code de sortie selon les résultats
    if (result.errors > result.updated * 0.1) { // Plus de 10% d'erreurs
      logger.error('❌ Trop d\'erreurs détectées');
      process.exit(1);
    }
    
    logger.log('🎉 Script terminé avec succès');
    process.exit(0);
    
  } catch (error) {
    logger.error('💥 Erreur fatale lors du rafraîchissement des avatars', error);
    process.exit(1);
  }
}

// Gestion des signaux pour un arrêt propre
process.on('SIGTERM', () => {
  console.log('📡 Signal SIGTERM reçu, arrêt en cours...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📡 Signal SIGINT reçu, arrêt en cours...');
  process.exit(0);
});

// Exécuter le script
main().catch((error) => {
  console.error('💥 Erreur non gérée:', error);
  process.exit(1);
});