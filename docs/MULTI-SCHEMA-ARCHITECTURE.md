# Architecture Multi-Schéma pour Im-mo

Ce document décrit l'architecture multi-schéma adoptée pour la base de données PostgreSQL du système Im-mo, ainsi que les modifications apportées au code pour la prendre en charge.

## Présentation de l'Architecture

Im-mo est passé d'une architecture de sécurité basée sur Row-Level Security (RLS) à une architecture multi-schéma, où :

- Chaque client dispose de son propre schéma PostgreSQL (`client_[ID]`)
- Les données spécifiques au client sont stockées dans son schéma dédié
- Les données partagées (utilisateurs, sessions, etc.) restent dans le schéma `public`
- L'administrateur dispose d'un schéma spécial `admin_views` avec des vues sur tous les schémas clients

Cette architecture offre plusieurs avantages :
- **Isolation des données** : les données des clients sont physiquement séparées
- **Performance** : pas de surcharge liée aux filtres RLS
- **Extensibilité** : facilite le partage de comptes entre entreprises et les fonctionnalités multi-tenant
- **Maintenance** : simplification des backups et restaurations par client

## Principes de Fonctionnement

### Connexion et Authentification

Lors de l'authentification d'un utilisateur :

1. Le middleware d'authentification identifie l'utilisateur
2. Une fonction PostgreSQL `setup_user_environment(user_id)` est appelée 
3. Cette fonction configure le `search_path` PostgreSQL pour pointer vers le schéma approprié :
   - Pour les clients : `client_[ID], public`
   - Pour les admins : `public, admin_views`

### Structure des Schémas

- **Schéma public** : contient les tables partagées (`users`, `sessions`, etc.)
- **Schémas client_[ID]** : contiennent les données spécifiques au client (propriétés, locataires, etc.)
- **Schéma admin_views** : contient des vues qui agrègent les données de tous les schémas clients

### Routage des Requêtes

Le routage des requêtes SQL est géré automatiquement par PostgreSQL via le `search_path`. Quand une requête est exécutée :

1. PostgreSQL cherche d'abord les tables dans le premier schéma du `search_path`
2. Si la table n'est pas trouvée, il passe au schéma suivant
3. Les requêtes sont ainsi automatiquement dirigées vers le schéma du client connecté

## Mise en Œuvre Technique

### Fonctions PostgreSQL

Deux fonctions principales ont été créées dans PostgreSQL :

#### `set_schema_for_user(user_id)`

```sql
CREATE OR REPLACE FUNCTION public.set_schema_for_user(user_id INTEGER) 
RETURNS TEXT AS $$
DECLARE
  schema_name TEXT;
  user_role TEXT;
BEGIN
  -- Récupérer le rôle de l'utilisateur
  SELECT role INTO user_role FROM public.users WHERE id = user_id;
  
  IF user_role = 'admin' THEN
    -- L'administrateur a accès à tout
    RETURN 'public, admin_views';
  ELSE
    -- Récupérer le nom du schéma pour cet utilisateur
    SELECT 'client_' || user_id::TEXT INTO schema_name;
    
    -- Définir le search_path
    RETURN schema_name || ', public';
  END IF;
END;
$$ LANGUAGE plpgsql;
```

#### `setup_user_environment(user_id)`

```sql
CREATE OR REPLACE FUNCTION public.setup_user_environment(user_id INTEGER) 
RETURNS VOID AS $$
DECLARE
  search_path_value TEXT;
BEGIN
  -- Définir le search_path
  search_path_value := public.set_schema_for_user(user_id);
  EXECUTE 'SET search_path TO ' || search_path_value;
  
  -- Définir l'ID utilisateur courant (pour compatibilité avec l'ancien code)
  PERFORM set_config('app.user_id', user_id::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql;
```

### Modifications du Code

Le système a été adapté pour utiliser cette nouvelle architecture :

1. **Middleware d'authentification** : appelle `setup_user_environment` lors de la connexion
2. **Routes API** : n'ont plus besoin de filtrer par `user_id` car PostgreSQL s'en charge
3. **Accès aux données** : simplifié, sans nécessité de filtrer explicitement

## Migration et Déploiement

La migration vers cette architecture a impliqué :

1. Création de schémas pour chaque client
2. Copie des données pertinentes dans les schémas respectifs
3. Configuration des permissions d'accès
4. Création de vues pour l'administrateur
5. Mise à jour du code pour utiliser les nouvelles fonctions

## Avantages pour le Partage de Comptes

Cette architecture facilite le partage de comptes entre entreprises :

1. Créer un schéma spécial pour les données partagées entre entreprises
2. Configurer des utilisateurs avec accès à plusieurs schémas
3. Adapter la fonction `set_schema_for_user` pour inclure les schémas partagés

## Gestion des Liens Publics

Les liens publics (accessibles sans authentification) peuvent être gérés de deux façons :

1. Par des routes API spéciales qui définissent manuellement le search_path
2. En stockant les données publiques dans des tables du schéma public

## Conclusion

L'architecture multi-schéma procure une meilleure isolation des données, des performances accrues et une plus grande flexibilité pour l'évolution future de l'application. Elle simplifie également la gestion des partages de comptes entre entreprises, un besoin croissant pour la plateforme Im-mo. 