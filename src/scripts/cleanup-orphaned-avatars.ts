#!/usr/bin/env node

/**
 * Script autonome pour nettoyer les avatars orphelins
 * Conçu pour être exécuté par un CronJob Kubernetes
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { StorageService } from '../storage/storage.service';
import { KeycloakService } from '../keycloak/keycloak.service';

async function main() {
  const logger = new Logger('OrphanedAvatarsCleanupScript');
  
  try {
    logger.log('🚀 Démarrage du script de nettoyage des avatars orphelins');
    
    // Créer l'application NestJS sans serveur HTTP
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });
    
    // Récupérer les services nécessaires
    const storageService = app.get(StorageService);
    const keycloakService = app.get(KeycloakService);
    
    // Exécuter le nettoyage
    const startTime = Date.now();
    const result = await cleanupOrphanedAvatars(storageService, keycloakService, logger);
    const duration = Date.now() - startTime;
    
    logger.log(`✅ Nettoyage terminé en ${duration}ms`);
    logger.log(`📊 Résultats: ${result.deleted} avatars supprimés, ${result.errors} erreurs`);
    
    // Fermer l'application
    await app.close();
    
    logger.log('🎉 Script terminé avec succès');
    process.exit(0);
    
  } catch (error) {
    logger.error('💥 Erreur fatale lors du nettoyage des avatars orphelins', error);
    process.exit(1);
  }
}

async function cleanupOrphanedAvatars(
  storageService: StorageService,
  keycloakService: KeycloakService,
  logger: Logger
): Promise<{ deleted: number; errors: number }> {
  let deleted = 0;
  let errors = 0;
  
  try {
    // Cette implémentation est un exemple - à adapter selon vos besoins
    logger.log('🔍 Recherche des avatars orphelins...');
    
    // Récupérer tous les utilisateurs avec avatars
    const users = await keycloakService.getUsers(0, 1000); // Adapter selon votre volume
    const userAvatarFiles = new Set<string>();
    
    // Collecter tous les noms de fichiers d'avatar référencés
    users.forEach(user => {
      const avatarFileName = user.attributes?.avatarFileName?.[0];
      if (avatarFileName) {
        userAvatarFiles.add(avatarFileName);
      }
    });
    
    logger.log(`📋 ${userAvatarFiles.size} avatars référencés trouvés`);
    
    // TODO: Implémenter la logique de nettoyage selon votre architecture MinIO
    // Cette partie nécessiterait d'étendre StorageService avec des méthodes pour:
    // - Lister tous les fichiers dans le bucket
    // - Identifier les fichiers non référencés
    // - Les supprimer de manière sécurisée
    
    logger.log('ℹ️ Logique de nettoyage à implémenter selon vos besoins spécifiques');
    
  } catch (error) {
    logger.error('Erreur lors du nettoyage', error);
    errors++;
  }
  
  return { deleted, errors };
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