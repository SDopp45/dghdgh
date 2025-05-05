# Guide de configuration de l'authentification

Ce guide explique comment configurer correctement le système d'authentification de votre application immobilière et gérer vos clés API.

## Configuration recommandée

Par défaut, nous recommandons d'utiliser l'authentification par **sessions** pour votre application web :

```
AUTH_MODE="session"
```

Cette méthode offre plusieurs avantages :
- Meilleure sécurité grâce aux cookies HTTP-only
- Protection contre les attaques XSS
- Révocation facile des sessions
- Compatibilité avec la Row Level Security (RLS) de PostgreSQL

## Modes d'authentification disponibles

Vous pouvez choisir entre trois modes d'authentification :

1. **session** (recommandé pour les applications web)
   - Utilise des cookies pour stocker l'ID de session
   - Plus sécurisé pour les navigateurs web
   - Facile à révoquer côté serveur

2. **jwt** (pour les API externes ou applications mobiles)
   - Utilise des tokens JWT stockés côté client
   - Stateless (pas de stockage de session côté serveur)
   - Adapté pour les API découplées du frontend

3. **hybrid** (pour les environnements mixtes)
   - Utilise sessions pour le web et JWT pour les API
   - Permet la coexistence des deux systèmes
   - Utile lors de la transition vers des microservices

## Configuration dans le fichier .env

Créez un fichier `.env` ou `.env.local` à la racine du projet avec :

```
# Configuration de la base de données
DATABASE_URL="postgresql://postgres:123456789@localhost:5432/property_manager"

# Mode d'authentification (session, jwt, hybrid)
AUTH_MODE="session"

# Sécurité
SESSION_SECRET="votre_secret_tres_securise_a_changer_en_production"
JWT_SECRET="jwt_secret_change_en_production_si_utilise"

# Paramètres de session
SESSION_COOKIE_MAX_AGE=86400000  # 24 heures en millisecondes

# Configuration du serveur
PORT=5005

# Mode de développement
NODE_ENV="development"
DEBUG_SESSION="false"

# Clés API Intelligence Artificielle (à protéger !)
OPENAI_API_KEY="votre_clé_openai"
HUGGINGFACE_API_KEY="votre_clé_huggingface"
ANTHROPIC_API_KEY="votre_clé_anthropic"
REPLICATE_API_TOKEN="votre_clé_replicate"
```

⚠️ **IMPORTANT: Sécurité des clés API** ⚠️
- Ne jamais commiter les clés API dans votre dépôt Git
- Ajoutez toujours `.env` et `.env.local` à votre `.gitignore`
- Utilisez des variables d'environnement en production plutôt que des fichiers
- Changez vos clés API immédiatement si vous suspectez une fuite

## Configuration de la base de données

Pour configurer correctement la sécurité au niveau des lignes (RLS) dans PostgreSQL :

```bash
npm run setup-db
```

Ce script va :
1. Vérifier la connexion à la base de données
2. Appliquer les migrations nécessaires
3. Configurer les politiques de sécurité RLS
4. Créer les utilisateurs de test (en mode développement)

## Utilisation des clés d'API IA

Votre application utilise plusieurs services d'intelligence artificielle :

1. **OpenAI** - Pour le chat et la génération de contenu
2. **Anthropic** - Pour les suggestions et l'analyse de documents
3. **HuggingFace** - Pour les classifications et les modèles spécialisés
4. **Replicate** - Pour les modèles de vision et d'analyse d'images

Veillez à configurer correctement toutes ces clés pour que les fonctionnalités IA fonctionnent.

## Résolution des problèmes courants

### Erreur d'authentification persistante

Si les utilisateurs sont déconnectés de façon inattendue :

1. Vérifiez que le `SESSION_SECRET` n'a pas changé
2. Assurez-vous que les cookies sont activés dans le navigateur
3. Vérifiez que `withCredentials: true` est défini dans les requêtes API

### Conflit entre JWT et Sessions

Si vous observez des comportements incohérents :

1. Choisissez un seul mode d'authentification (`AUTH_MODE="session"` ou `AUTH_MODE="jwt"`)
2. Évitez de mélanger les deux approches sans utiliser le mode hybride

### Problèmes de RLS (Row Level Security)

Si les utilisateurs ne voient pas les données auxquelles ils devraient avoir accès :

1. Vérifiez que le middleware `setUserIdForRLS` est bien appelé
2. Exécutez à nouveau le script `setup-db` pour reconfigurer les politiques RLS
3. Vérifiez les logs pour les erreurs de transaction RLS

### Erreurs avec les API d'IA

Si les fonctionnalités d'IA ne fonctionnent pas :

1. Vérifiez que les clés API sont correctement configurées dans `.env`
2. Assurez-vous que les clés API ne sont pas expirées ou désactivées
3. Consultez les logs pour voir les erreurs spécifiques aux services d'IA 