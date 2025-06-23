# Authentication Service - Microservice NestJS

Service d'authentification utilisant NestJS avec intégration Keycloak, MongoDB pour la gestion des utilisateurs et des codes OTP, et MinIO pour le stockage des avatars.

## 🚀 Fonctionnalités

- **Inscription utilisateur** avec vérification OTP (email ou téléphone)
- **Authentification** via Keycloak avec email ou téléphone
- **Gestion des utilisateurs** (CRUD complet)
- **Gestion des avatars** avec stockage MinIO et optimisation d'images
- **Codes OTP** avec expiration automatique (5 minutes)
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
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/               # Module gestion utilisateurs
│   ├── dto/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── otp/                 # Module gestion codes OTP
│   ├── schemas/         # Schémas MongoDB
│   ├── dto/
│   ├── otp.service.ts
│   └── otp.module.ts
├── keycloak/            # Module intégration Keycloak
│   ├── keycloak.service.ts
│   └── keycloak.module.ts
├── common/              # Interfaces et DTOs partagés
│   ├── interfaces/
│   └── dto/
├── app.module.ts
└── main.ts
```

## 🔧 Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|---------|
| `MONGODB_URL` | URL de connexion MongoDB | Configuré |
| `KEYCLOAK_URL` | URL serveur Keycloak | `http://localhost:8080` |
| `KEYCLOAK_REALM` | Realm Keycloak | `senegalservices` |
| `KEYCLOAK_ADMIN_CLIENT_ID` | Client ID admin | `keycloak_admin_api` |
| `KEYCLOAK_ADMIN_CLIENT_SECRET` | Secret client admin | `KabivlQz5GVG5Rw9BEKVSqKfzm6OXPbY` |
| `KEYCLOAK_USER_CLIENT_ID` | Client ID utilisateurs | `senegalservices_client` |
| `PORT` | Port du service | `3001` |

### Variables MinIO

| Variable | Description | Défaut |
|----------|-------------|---------|
| `MINIO_ENDPOINT` | Endpoint du serveur MinIO | `localhost` |
| `MINIO_PORT` | Port du serveur MinIO | `9000` |
| `MINIO_USE_SSL` | Utiliser SSL pour MinIO | `false` |
| `MINIO_ACCESS_KEY` | Clé d'accès MinIO | `minioadmin` |
| `MINIO_SECRET_KEY` | Clé secrète MinIO | `minioadmin` |
| `MINIO_BUCKET_NAME` | Nom du bucket pour les avatars | `senegalservices-avatars` |
| `MINIO_PUBLIC_URL` | URL publique de MinIO | `http://localhost:9000` |

## 📡 Endpoints principaux

### Authentification
- `POST /auth/register` - Démarrer inscription (génère OTP)
- `POST /auth/verify-otp` - Vérifier OTP et créer utilisateur
- `POST /auth/login` - Connexion utilisateur

### Gestion utilisateurs
- `GET /users` - Liste des utilisateurs (paginée)
- `GET /users/:id` - Détails d'un utilisateur
- `PATCH /users/:id` - Modifier un utilisateur
- `DELETE /users/:id` - Supprimer un utilisateur

### Gestion des avatars
- `POST /users/me/avatar` - Uploader son avatar
- `DELETE /users/me/avatar` - Supprimer son avatar
- `POST /users/:id/avatar` - Uploader l'avatar d'un utilisateur (Admin)
- `DELETE /users/:id/avatar` - Supprimer l'avatar d'un utilisateur (Admin)

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

## 🚀 Déploiement

1. **Build de production**
```bash
npm run build
```

2. **Démarrage en mode production**
```bash
npm run start:prod
```

## 🔧 Développement

### Gestion des avatars

Les avatars sont automatiquement :
- Redimensionnés à 300x300 pixels
- Optimisés en JPEG avec 85% de qualité
- Stockés dans MinIO avec des URLs publiques
- Organisés par utilisateur (`avatars/{userId}/{uuid}.jpg`)

Formats supportés : JPG, PNG, WebP (max 5MB)

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

## 📞 Support

Pour toute question ou problème :
1. Consulter la documentation Swagger
2. Vérifier les logs du service
3. Valider la configuration Keycloak
4. Tester la connexion MongoDB

## 🔐 Sécurité

- Mots de passe hachés via Keycloak
- Codes OTP expiration automatique
- Validation stricte des données d'entrée
- Gestion des erreurs sans exposition d'informations sensibles