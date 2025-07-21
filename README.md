# Authentication Service - Microservice NestJS

Service d'authentification utilisant NestJS avec intégration Keycloak, MongoDB pour la gestion des utilisateurs et des codes OTP, et MinIO pour le stockage des avatars.

## 🚀 Fonctionnalités

- **Inscription utilisateur** avec vérification OTP (email ou téléphone)
- **Authentification** via Keycloak avec email ou téléphone
- **Gestion des utilisateurs** (CRUD complet)
- **Gestion des avatars** avec stockage MinIO et optimisation d'images
- **Codes OTP** avec expiration automatique (5 minutes)
- **Système de rôles et permissions** avancé
- **Documentation Swagger** complète en français
- **Architecture modulaire** et extensible

## 📋 Prérequis

- Node.js (version 18+)
- MongoDB (connexion cloud configurée)
- Keycloak (serveur local sur le port 8080)
- MinIO (serveur local sur le port 9000)

## 🛠️ Installation

1. **Installer les dépendances**
```bash
npm install
```

2. **Configuration environnement**
```bash
cp .env.example .env
# Modifier les variables selon votre configuration
```

3. **Démarrer le service**
```bash
# Mode développement
npm run start:dev

# Mode production
npm run build
npm run start:prod
```

4. **Démarrer MinIO (optionnel pour le développement)**
```bash
# Avec Docker
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

## 📖 Documentation API

Une fois le service démarré, accédez à la documentation Swagger :
```
http://localhost:3001/api-docs
```

## 🔐 Configuration Keycloak

### Clients nécessaires

1. **keycloak_admin_api**
   - Type: `client-credentials`
   - Client Secret: `KabivlQz5GVG5Rw9BEKVSqKfzm6OXPbY`
   - Permissions: Admin API access

2. **senegalservices_client**
   - Type: `Direct access grants`
   - Grant Type: `password`
   - Pour l'authentification des utilisateurs finaux

## 🗂️ Structure du projet

```
src/
├── auth/                 # Module d'authentification
│   ├── dto/             # Data Transfer Objects
│   ├── strategies/      # Stratégies JWT
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/               # Module gestion utilisateurs
│   ├── dto/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── roles/               # Module gestion des rôles
│   ├── dto/
│   ├── interfaces/
│   ├── roles.controller.ts
│   ├── roles.service.ts
│   └── roles.module.ts
├── permissions/         # Module gestion des permissions
│   ├── dto/
│   ├── interfaces/
│   ├── schemas/         # Schémas MongoDB
│   ├── permissions.controller.ts
│   ├── permissions.service.ts
│   └── permissions.module.ts
├── otp/                 # Module gestion codes OTP
│   ├── schemas/         # Schémas MongoDB
│   ├── dto/
│   ├── otp.service.ts
│   └── otp.module.ts
├── keycloak/            # Module intégration Keycloak
│   ├── keycloak.service.ts
│   └── keycloak.module.ts
├── storage/             # Module stockage MinIO
│   ├── storage.service.ts
│   └── storage.module.ts
├── notification/        # Module notifications
│   ├── notification.service.ts
│   └── notification.module.ts
├── common/              # Interfaces et DTOs partagés
│   ├── interfaces/
│   ├── dto/
│   ├── decorators/
│   ├── guards/
│   └── utils/
├── app.module.ts
└── main.ts
```

## 🔧 Variables d'environnement

### Configuration MongoDB
| Variable | Description | Défaut |
|----------|-------------|---------|
| `MONGODB_URL` | URL de connexion MongoDB | Configuré |

### Configuration Keycloak
| Variable | Description | Défaut |
|----------|-------------|---------|
| `KEYCLOAK_URL` | URL serveur Keycloak | `http://localhost:8080` |
| `KEYCLOAK_REALM` | Realm Keycloak | `senegalservices` |
| `KEYCLOAK_ADMIN_CLIENT_ID` | Client ID admin | `keycloak_admin_api` |
| `KEYCLOAK_ADMIN_CLIENT_SECRET` | Secret client admin | `KabivlQz5GVG5Rw9BEKVSqKfzm6OXPbY` |
| `KEYCLOAK_USER_CLIENT_ID` | Client ID utilisateurs | `senegalservices_client` |

### Configuration JWT
| Variable | Description | Défaut |
|----------|-------------|---------|
| `JWT_SECRET` | Clé secrète JWT | `your-super-secret-jwt-key-change-in-production` |
| `JWT_AUDIENCE` | Audience JWT | `account,senegalservices_client` |
| `JWT_ISSUER_VALIDATION` | Validation issuer | `true` |
| `JWT_STRICT_AUDIENCE` | Audience stricte | `true` |

### Configuration MinIO
| Variable | Description | Défaut |
|----------|-------------|---------|
| `MINIO_ENDPOINT` | Endpoint du serveur MinIO | `localhost` |
| `MINIO_PORT` | Port du serveur MinIO | `9000` |
| `MINIO_USE_SSL` | Utiliser SSL pour MinIO | `false` |
| `MINIO_ACCESS_KEY` | Clé d'accès MinIO | `minioadmin` |
| `MINIO_SECRET_KEY` | Clé secrète MinIO | `minioadmin` |
| `MINIO_BUCKET_NAME` | Nom du bucket pour les avatars | `senegalservices-avatars` |
| `MINIO_PUBLIC_URL` | URL publique de MinIO (optionnel) | `` |

### Configuration Application
| Variable | Description | Défaut |
|----------|-------------|---------|
| `PORT` | Port du service | `3001` |
| `NODE_ENV` | Environnement | `production` |
| `ALLOWED_ORIGINS` | Origines CORS autorisées | `*` |

### Configuration Sécurité
| Variable | Description | Défaut |
|----------|-------------|---------|
| `SECURITY_LOGS_ENABLED` | Logs de sécurité | `true` |
| `MAX_TOKEN_AGE_HOURS` | Âge max token (heures) | `24` |
| `RATE_LIMIT_TTL` | TTL rate limiting (ms) | `60000` |
| `RATE_LIMIT_MAX` | Max requêtes par TTL | `100` |

### Configuration Notifications
| Variable | Description | Défaut |
|----------|-------------|---------|
| `NOTIFICATION_SERVICE` | URL service notifications | `https://senegalservices.notification.api.sandbox.topatoko.com` |

## 📡 Endpoints principaux

### 🔐 Authentification
- `POST /auth/register` - Démarrer inscription (génère OTP)
- `POST /auth/verify-otp` - Vérifier OTP et créer utilisateur
- `POST /auth/login` - Connexion utilisateur
- `POST /auth/refresh` - Rafraîchir token
- `PATCH /auth/change-password` - Changer mot de passe
- `POST /auth/forgot-password` - Demander réinitialisation
- `POST /auth/reset-password` - Réinitialiser mot de passe
- `POST /auth/logout` - Déconnexion
- `POST /auth/create-user` - Créer utilisateur (Admin)

### 👥 Gestion utilisateurs
- `GET /users` - Liste des utilisateurs (paginée)
- `GET /users/me` - Mon profil
- `PATCH /users/me` - Modifier mon profil
- `GET /users/:id` - Détails d'un utilisateur
- `PATCH /users/:id` - Modifier un utilisateur
- `DELETE /users/:id` - Supprimer un utilisateur
- `GET /users/search/:query` - Rechercher utilisateurs

### 🖼️ Gestion des avatars
- `POST /users/me/avatar` - Uploader son avatar
- `DELETE /users/me/avatar` - Supprimer son avatar
- `POST /users/:id/avatar` - Uploader l'avatar d'un utilisateur (Admin)
- `DELETE /users/:id/avatar` - Supprimer l'avatar d'un utilisateur (Admin)
- `GET /users/avatar/:fileName` - Récupérer un avatar

### 🎭 Gestion des rôles
- `POST /roles` - Créer un rôle
- `GET /roles` - Lister tous les rôles
- `GET /roles/:roleName` - Récupérer un rôle
- `PUT /roles/:roleName` - Mettre à jour un rôle
- `DELETE /roles/:roleName` - Supprimer un rôle
- `POST /roles/users/:userId/assign` - Assigner des rôles
- `POST /roles/users/:userId/remove` - Retirer des rôles
- `GET /roles/users/:userId` - Rôles d'un utilisateur
- `GET /roles/users/:userId/permissions/:permission` - Vérifier permission
- `POST /roles/initialize` - Initialiser rôles système

### 🔑 Gestion des permissions
- `POST /permissions` - Créer une permission
- `GET /permissions` - Lister toutes les permissions
- `GET /permissions/:id` - Récupérer une permission
- `PUT /permissions/:id` - Mettre à jour une permission
- `DELETE /permissions/:id` - Supprimer une permission
- `POST /permissions/users/:userId` - Assigner permissions à utilisateur
- `GET /permissions/users/:userId` - Permissions d'un utilisateur
- `GET /permissions/roles/:roleName` - Permissions d'un rôle
- `POST /permissions/roles/:roleName` - Ajouter permissions à rôle
- `DELETE /permissions/roles/:roleName/:permissionName` - Retirer permission d'un rôle

## 🔄 Flux d'inscription

1. **Inscription initiale** : `POST /auth/register`
   - Fournir email/téléphone + mot de passe
   - Code OTP généré et stocké (5 min)

2. **Vérification OTP** : `POST /auth/verify-otp`
   - Vérifier le code reçu
   - Création de l'utilisateur dans Keycloak

3. **Connexion** : `POST /auth/login`
   - Authentification via Keycloak
   - Token JWT retourné

## 🎭 Système de rôles et permissions

### Rôles système prédéfinis
- **super_admin** : Tous les droits
- **admin** : Administration complète
- **moderator** : Droits limités de modération
- **user** : Utilisateur standard
- **guest** : Accès minimal

### Permissions système étendues
- **Utilisateurs** : `users:read`, `users:create`, `users:update`, `users:delete`, `users:manage`, `users:impersonate`
- **Rôles** : `roles:read`, `roles:create`, `roles:update`, `roles:delete`, `roles:assign`
- **Permissions** : `permissions:read`, `permissions:create`, `permissions:update`, `permissions:delete`, `permissions:assign`
- **Système** : `system:config`, `system:logs`, `system:monitoring`, `system:backup`, `system:maintenance`
- **Documents** : `documents:read`, `documents:create`, `documents:update`, `documents:delete`, `documents:approve`
- **Services** : `services:read`, `services:create`, `services:update`, `services:delete`, `services:manage`

### Format des permissions
Les permissions suivent le format : `resource:action` ou `resource:action:scope`

Exemples :
- `documents:read` - Lire tous les documents
- `documents:read:own` - Lire ses propres documents
- `users:manage` - Gérer les utilisateurs

## 🖼️ Gestion des avatars

Les avatars sont automatiquement :
- Redimensionnés à 300x300 pixels
- Optimisés en JPEG avec 85% de qualité
- Stockés dans MinIO avec des URLs publiques ou signées selon la configuration
- Organisés par utilisateur (`avatars/{userId}/{uuid}.jpg`)
- URLs signées renouvelées automatiquement (7 jours de validité)

Formats supportés : JPG, PNG, WebP (max 5MB)

### Gestion des URLs signées

Quand `MINIO_PUBLIC_URL` n'est pas configurée, le système utilise des URLs signées temporaires pour sécuriser l'accès aux avatars :

- **Durée de validité** : 7 jours par défaut
- **Rafraîchissement automatique** : Les URLs sont automatiquement renouvelées quand elles expirent dans moins d'1 heure
- **Tâche planifiée** : Tous les jours à 2h du matin, le système vérifie et renouvelle les URLs qui expirent dans les 24h

**Avantages des URLs signées** :
- Sécurité renforcée (accès temporaire)
- Contrôle d'accès granulaire
- Pas d'exposition publique des fichiers

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests de couverture
npm run test:cov

# Tests e2e
npm run test:e2e
```

## 📝 Logs

Le service utilise le système de logs NestJS avec différents niveaux :
- Authentification réussie/échec
- Création/modification utilisateurs
- Génération/vérification codes OTP
- Erreurs Keycloak et MongoDB
- Logs de sécurité détaillés

## 🚀 Déploiement

1. **Build de production**
```bash
npm run build
```

2. **Démarrage en mode production**
```bash
npm run start:prod
```

3. **Avec Docker Compose**
```bash
docker-compose up -d
```

## 🔧 Développement

### Ajout d'un nouveau module
```bash
nest generate module <nom-module>
nest generate controller <nom-module>
nest generate service <nom-module>
```

### Conventions de code
- Classes : PascalCase
- Fichiers : kebab-case
- Variables : camelCase
- Validation avec class-validator
- Documentation Swagger obligatoire

### Architecture modulaire

Le projet suit une architecture modulaire stricte :
- **Séparation des responsabilités** : Chaque module a une responsabilité claire
- **Injection de dépendances** : Utilisation du système DI de NestJS
- **Guards et décorateurs** : Sécurité et autorisation centralisées
- **DTOs et validation** : Validation stricte des données d'entrée
- **Mappers utilitaires** : Transformation des données entre couches

## 🔐 Sécurité

### Mesures de sécurité implémentées
- **Helmet** : Protection contre les vulnérabilités web communes
- **Rate limiting** : 100 requêtes par minute par défaut
- **JWT sécurisé** : Validation stricte des tokens avec clés publiques Keycloak
- **CORS configuré** : Origines autorisées configurables
- **Validation stricte** : Toutes les entrées sont validées
- **Logs de sécurité** : Traçabilité des tentatives d'accès
- **Mots de passe sécurisés** : Hachage via Keycloak
- **OTP temporaires** : Codes d'expiration automatique
- **URLs signées** : Accès sécurisé aux fichiers

### Bonnes pratiques
- Mots de passe hachés via Keycloak
- Codes OTP expiration automatique (5-10 minutes)
- Validation stricte des données d'entrée
- Gestion des erreurs sans exposition d'informations sensibles
- Tokens JWT avec validation d'audience stricte
- Logs de sécurité pour audit

## 📞 Support et maintenance

### Surveillance
- Logs détaillés pour debugging
- Métriques de performance
- Monitoring des erreurs
- Alertes de sécurité

### Maintenance
- Nettoyage automatique des OTP expirés
- Rafraîchissement des URLs d'avatar signées
- Rotation des logs
- Sauvegarde des données critiques

### Dépannage courant
1. **Problème de connexion Keycloak** : Vérifier les variables d'environnement et la connectivité
2. **Erreur MongoDB** : Vérifier la chaîne de connexion et les permissions
3. **Problème MinIO** : Vérifier la configuration et les credentials
4. **Token JWT invalide** : Vérifier la synchronisation des clés avec Keycloak

## 📄 Licence

Ce projet est sous licence privée. Tous droits réservés.

## 👥 Équipe de développement

Développé avec ❤️ par l'équipe SenegalServices

---

**Version** : 1.0.0  
**Dernière mise à jour** : 2024  
**Documentation API** : http://localhost:3001/api-docs