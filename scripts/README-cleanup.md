# Nettoyage du schéma public

Ce dossier contient des scripts pour nettoyer le schéma public en supprimant les tables qui existent déjà dans les schémas `template` et `client_31` (architecture multi-tenant).

## Fichiers disponibles

1. **list-public-tables.js** - Script JavaScript pour lister les tables présentes dans les schémas public et template
2. **clean-public-schema.js** - Script JavaScript pour analyser les tables à supprimer et générer un script SQL
3. **cleanup-public-schema.sql** - Script SQL prêt à l'emploi pour supprimer les tables dupliquées

## Instructions pour le nettoyage

### Option 1: Analyse et préparation (recommandée)

1. Exécutez d'abord le script d'analyse pour voir quelles tables seront affectées:
   ```
   node scripts/list-public-tables.js
   ```

2. Ensuite, générez un script SQL personnalisé qui tentera de migrer les données si possible:
   ```
   node scripts/clean-public-schema.js
   ```

3. Examinez attentivement la sortie et vérifiez les erreurs de transfert de données. Les erreurs du type "colonne X n'existe pas" sont normales car les structures de tables ont évolué entre l'ancienne architecture et la nouvelle.

### Option 2: Suppression directe

> ⚠️ **ATTENTION**: Cette option supprime directement les tables sans tenter de migrer les données. Assurez-vous d'avoir sauvegardé toutes les données importantes avant de procéder.

1. Exécutez le script SQL de nettoyage:
   ```
   psql -U postgres -d property_manager -f scripts/cleanup-public-schema.sql
   ```
   ou via l'interface PGAdmin.

## Tables concernées par le nettoyage

Le script supprime les tables suivantes du schéma public:

### Tables liées aux propriétés
- `properties`
- `property_coordinates`
- `property_analyses`
- `property_history`
- `property_works`

### Tables liées aux locataires
- `tenants`
- `tenant_documents`
- `tenant_history`

### Tables liées aux opérations
- `visits`
- `maintenance_requests`
- `feedbacks`

### Tables liées aux documents et formulaires
- `documents`
- `form_submissions`

### Tables financières
- `transactions`

## Tables conservées dans le schéma public

Les tables suivantes sont conservées dans le schéma public car elles sont partagées entre tous les clients:

- `users` - Utilisateurs de l'application
- `sessions` - Sessions utilisateurs
- `storage_plans` - Plans de stockage disponibles
- `storage_quotas` - Quotas et limites de stockage
- `link_profiles` - Profils de liens
- `links` - Liens

## Remarque sur les erreurs d'analyseur SQL

Si vous voyez des erreurs d'analyseur SQL dans l'IDE lorsque vous ouvrez le fichier `cleanup-public-schema.sql`, vous pouvez les ignorer. Ces erreurs sont dues à des limitations de l'analyseur de code et n'affectent pas le fonctionnement réel du script PostgreSQL. 