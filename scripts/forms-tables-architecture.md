# Architecture des tables de formulaires et liens

Ce document décrit la nouvelle organisation des tables liées aux formulaires et aux liens partagés dans l'architecture multi-tenant par schéma.

## Répartition des tables

| Table | Schéma | Justification |
|-------|--------|---------------|
| `links` | public | Table centrale pour le routage des URLs partagées (/u/) |
| `forms` | public | Structures de formulaires réutilisables entre clients |
| `form_fields` | public | Définitions des champs réutilisables |
| `form_field_options` | public | Options pour les champs à choix multiples |
| `link_profiles` | template/client | Personnalisation des liens par client (privée) |
| `form_responses` | template/client | Réponses aux formulaires (données privées) |
| `form_submissions` | template/client | Soumissions des formulaires (déjà migrée) |

## Explications détaillées

### Tables dans le schéma public (partagées)

Ces tables restent dans le schéma public car elles sont partagées entre tous les clients:

1. **links**
   - Contient les URLs et identifiants des liens partagés
   - Essentielle pour le routage des URLs /u/
   - Permet l'accès aux contenus partagés

2. **forms**, **form_fields**, **form_field_options**
   - Définissent la structure des formulaires
   - Sont réutilisables entre différents clients
   - Permettent de standardiser les modèles de formulaires

### Tables dans les schémas clients (privées)

Ces tables sont spécifiques à chaque client et contiennent des données privées:

1. **link_profiles**
   - Personnalisation visuelle des liens partagés
   - Paramètres spécifiques à chaque client
   - Permet une personnalisation de l'expérience utilisateur

2. **form_responses**
   - Contient les réponses individuelles aux champs
   - Données privées soumises par les utilisateurs
   - Doit être isolée par client pour la confidentialité

3. **form_submissions**
   - Soumissions complètes des formulaires
   - Déjà présente dans le schéma template

## Flux de données

1. Un utilisateur crée un lien partagé:
   - Une entrée est créée dans `public.links`
   - La personnalisation est stockée dans `client_XX.link_profiles`

2. Un visiteur accède à l'URL /u/xyz:
   - Le système trouve l'entrée dans `public.links`
   - Il récupère la personnalisation depuis `client_XX.link_profiles`
   - Il affiche le formulaire depuis `public.forms` et `public.form_fields`

3. Le visiteur soumet le formulaire:
   - Une entrée est créée dans `client_XX.form_submissions`
   - Les réponses individuelles sont stockées dans `client_XX.form_responses`

## Avantages de cette architecture

- **Isolation des données** - Les données sensibles sont isolées par client
- **Réutilisation** - Les structures de formulaires sont partagées
- **Performance** - Les requêtes d'accès aux formulaires sont optimisées
- **Flexibilité** - Chaque client peut personnaliser ses liens partagés
- **Maintenance** - Plus facile de gérer les mises à jour de structure 