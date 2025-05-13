# Gestion du stockage avec le schéma template

Ce document explique comment fonctionne la gestion du stockage dans le schéma template et comment elle est propagée aux schémas client.

## Structure de la solution

### 1. Table `storage_management` dans le schéma template

La table `storage_management` dans le schéma template sert de modèle pour tous les schémas client. Elle contient les colonnes suivantes :

```sql
CREATE TABLE template.storage_management (
    id SERIAL PRIMARY KEY,
    total_used BIGINT DEFAULT 0,  -- Stockage total utilisé en octets
    last_calculation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    storage_categories JSONB DEFAULT '{"documents": 0, "images": 0, "attachments": 0, "other": 0, "database": 0, "storage_usage": 0, "tenant_documents": 0, "contract_documents": 0, "maintenance_documents": 0, "visit_documents": 0}'::jsonb,
    cleanup_history JSONB DEFAULT '[]'::jsonb,  -- Historique des nettoyages
    user_id INTEGER NOT NULL,  -- Référence vers l'utilisateur propriétaire
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Fonctions de calcul du stockage

Le système utilise plusieurs fonctions SQL pour calculer l'utilisation du stockage :

- `public.calculate_documents_size` : Calcule la taille des documents à partir d'un tableau d'IDs
- `public.calculate_client_storage_usage` : Calcule l'utilisation totale du stockage pour un schéma client
- `template.update_storage_management_timestamp` : Met à jour le timestamp lors des modifications
- `template.update_storage_on_entity_change` : Déclenche un recalcul du stockage lors des modifications de données

### 3. Déclencheurs (triggers)

Des déclencheurs sont configurés sur les tables suivantes pour automatiser le suivi du stockage :

- `documents`
- `property_images` 
- `storage_usage`
- `tenant_documents`
- `contracts`
- `transaction_attachments`
- `maintenance`
- `visits`

Pour chaque table, trois déclencheurs sont créés (INSERT, UPDATE, DELETE) qui appellent la fonction `template.update_storage_on_entity_change`.

## Scripts de configuration

Trois scripts SQL ont été créés pour gérer la configuration du stockage :

1. `verify_template_storage.sql` : Vérifie et configure la table storage_management dans le schéma template
2. `template_storage_triggers.sql` : Configure les déclencheurs dans le schéma template
3. `apply_template_storage_to_clients.sql` : Applique la configuration du template à tous les schémas client

## Processus de fonctionnement

1. Lorsqu'un fichier est ajouté, modifié ou supprimé dans un schéma client, les déclencheurs marquent que le stockage doit être recalculé.
2. Lors de l'accès aux informations de stockage via l'API, le système vérifie si un recalcul est nécessaire (plus de 12 heures depuis le dernier calcul).
3. Le calcul du stockage analyse toutes les tables pertinentes et met à jour la table `storage_management` avec les détails de l'utilisation.
4. Le calcul est également répercuté dans la colonne `storage_used` de la table `users` dans le schéma public.

## API de gestion du stockage

L'API expose plusieurs endpoints pour la gestion du stockage :

- `GET /storage-info` : Récupérer les informations d'utilisation du stockage
- `POST /recalculate-storage` : Forcer un recalcul du stockage
- `POST /cleanup-unused-files` : Nettoyer les fichiers inutilisés
- `GET /storage-breakdown` : Obtenir une répartition détaillée de l'utilisation du stockage
- `POST /upgrade-storage-plan` : Mettre à niveau le forfait de stockage

## Limites du stockage et plans

Les limites de stockage sont définies dans la table `users` du schéma public :

- `storage_used` : Stockage actuellement utilisé en octets
- `storage_limit` : Limite de stockage totale en octets
- `storage_tier` : Plan de stockage (free, basic, premium, business)

## Propagation aux nouveaux schémas client

Lorsqu'un nouveau schéma client est créé à partir du schéma template, la table `storage_management` et tous ses déclencheurs sont automatiquement propagés.

## Maintenance du système

Pour maintenir le système de gestion du stockage, exécutez les scripts dans cet ordre :

1. `verify_template_storage.sql` : Vérifie et corrige la configuration du template
2. `template_storage_triggers.sql` : Met à jour les déclencheurs dans le template
3. `apply_template_storage_to_clients.sql` : Propage les changements à tous les schémas client

Ces scripts peuvent être exécutés périodiquement ou après des mises à jour importantes du système. 