# Gestion du stockage par schéma client

Ce document explique le système de gestion de stockage implémenté pour suivre l'utilisation du stockage par client et mettre en place des limites configurables.

## Structure de données

### Table dans le schéma `public`

La table `users` dans le schéma `public` contient déjà plusieurs colonnes liées au stockage :

- `storage_used` : Stockage total utilisé en octets par le client
- `storage_limit` : Limite de stockage en octets pour le client
- `storage_tier` : Niveau de plan de stockage (`basic`, `tier1`, `tier2`, `tier3`, `tier4`)
- `last_reset_date` : Date de la dernière réinitialisation (notamment pour les compteurs de requêtes)

### Table dans chaque schéma `client_X`

Chaque schéma `client_X` contient maintenant une table `storage_management` qui stocke :

- `total_used` : Stockage total utilisé en octets (miroir de `public.users.storage_used`)
- `last_calculation` : Date du dernier calcul d'utilisation
- `storage_categories` : Répartition du stockage par catégorie (documents, images, etc.)
- `cleanup_history` : Historique des nettoyages effectués
- `user_id` : ID de l'utilisateur propriétaire du schéma

## Fonctionnement

### Création d'un schéma client

Lors de la création d'un nouveau schéma client (à l'inscription d'un utilisateur), le système :

1. Crée le schéma `client_X` où X est l'ID de l'utilisateur
2. Clone les tables du schéma `template` dans ce nouveau schéma
3. S'assure que la table `storage_management` existe dans ce schéma
4. Initialise l'entrée de gestion du stockage avec l'ID de l'utilisateur
5. Calcule l'utilisation initiale du stockage (généralement 0 pour un nouvel utilisateur)

### Calcul de l'utilisation du stockage

La fonction `calculate_client_storage_usage(schema_name)` permet de :

1. Calculer le stockage utilisé par catégorie (documents, images, contrats, etc.)
2. Mettre à jour la table `storage_management` dans le schéma client
3. Mettre à jour la colonne `storage_used` dans la table `public.users`

Cette fonction est appelée :
- À la création d'un nouveau schéma client
- Périodiquement via une tâche programmée (si pg_cron est configuré)
- Lorsque l'utilisateur accède à ses informations de stockage après une période d'inactivité

### API de gestion du stockage

Les routes suivantes sont disponibles pour gérer le stockage :

- `GET /api/user/storage-info` : Récupérer les informations d'utilisation du stockage
- `POST /api/user/storage-cleanup` : Exécuter un nettoyage du stockage (fichiers temporaires, doublons)
- `POST /api/user/export-data` : Exporter les données de l'utilisateur
- `GET /api/user/storage-plan` : Récupérer les informations sur le plan de stockage actuel
- `POST /api/user/upgrade-plan` : Mettre à niveau le plan de stockage

### Plans de stockage

Les plans suivants sont définis avec leurs limites respectives :

- `basic` : 5 GB (gratuit)
- `tier1` : 10 GB
- `tier2` : 20 GB
- `tier3` : 50 GB
- `tier4` : 100 GB

## Interface utilisateur

Les interfaces suivantes ont été créées pour gérer le stockage :

- `/settings/storage` : Page principale de gestion du stockage, affichant l'utilisation, le plan actuel, et les options de nettoyage
- `/settings/storage/plans` : Page pour consulter et mettre à niveau le plan de stockage

## Mise à jour de la structure

Pour appliquer ces changements à une installation existante :

1. Exécuter le script SQL `server/migrations/storage_management.sql` pour créer la table dans le schéma `template` et les fonctions associées
2. Exécuter la fonction `public.setup_storage_usage_tracking()` pour initialiser les tables dans les schémas clients existants et calculer l'utilisation actuelle

## Considérations de performance

- Le calcul de l'utilisation du stockage peut être coûteux pour les schémas avec beaucoup de données
- Par défaut, le calcul n'est effectué que périodiquement (toutes les 12 heures lors de l'accès aux informations)
- Pour les grands déploiements, il est recommandé de configurer une tâche pg_cron pour effectuer ces calculs pendant les heures creuses 