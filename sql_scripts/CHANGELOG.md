# Changelog - Correction du système d'authentification multi-schémas

## Réparations effectuées

### 1. Fonctions SQL de schéma

- Création du script `scripts/initdb.sql` avec les fonctions PostgreSQL nécessaires :
  - `setup_user_environment(p_user_id integer)` : Configurer l'environnement utilisateur
  - `create_client_schema(p_user_id integer)` : Créer un nouveau schéma client
  - `set_schema_for_user(user_id integer)` : Retourner le chemin de recherche adapté à l'utilisateur

### 2. Script de réparation

- Création de `scripts/repair-database.js` pour initialiser/réparer la base de données
- Implémentation d'une connexion directe à PostgreSQL avec pg
- Vérification des fonctions SQL et des schémas existants

### 3. Authentification

- Refonte complète du système d'authentification (server/auth.ts)
- Abandon de l'ancienne approche avec Passport
- Utilisation de bcrypt pour le hachage des mots de passe
- Simplification du flux d'authentification avec sessions

### 4. Middleware de schéma

- Mise à jour de `server/middleware/schema.ts` pour utiliser les fonctions SQL
- Implémentation d'une logique de secours en cas d'échec des fonctions SQL
- Meilleure gestion des erreurs et journalisation

### 5. Routes d'authentification

- Réorganisation des routes dans `server/routes/auth-routes.ts`
- Implémentation correcte de l'inscription, connexion et déconnexion
- Utilisation du schéma client lors de l'authentification

### 6. Intégration avec l'application principale

- Mise à jour des imports dans `server/routes.ts` et `server/index.ts`
- Utilisation de `configureAuth` à la place de `setupAuth`

## Architecture finale

L'architecture multi-schémas fonctionne désormais comme prévu :

1. Chaque client a son propre schéma PostgreSQL (client_X)
2. L'administrateur a accès à tous les schémas
3. L'authentification utilise des sessions Express standards
4. Les fonctions SQL gèrent l'isolation des données entre clients

## Commandes utiles

Pour réparer/réinitialiser la base de données :
```
$env:DATABASE_URL="postgresql://postgres:123456789@localhost:5432/property_manager"; node scripts/repair-database.js
``` 