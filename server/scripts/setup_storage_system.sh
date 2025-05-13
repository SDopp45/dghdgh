#!/bin/bash

# Script pour configurer le système de gestion du stockage

# Définir les couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Répertoire des migrations SQL
MIGRATIONS_DIR="../migrations"

# Vérifier si PostgreSQL est installé
if ! command -v psql &> /dev/null; then
    echo -e "${RED}PostgreSQL n'est pas installé. Veuillez l'installer avant de continuer.${NC}"
    exit 1
fi

# Vérifier si les variables d'environnement sont définies
if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}Variables d'environnement manquantes. Utilisation des valeurs par défaut.${NC}"
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5432}
    DB_NAME=${DB_NAME:-immobilier}
    DB_USER=${DB_USER:-postgres}
    DB_PASSWORD=${DB_PASSWORD:-postgres}
fi

# Afficher les informations de connexion
echo -e "${GREEN}Configuration de la gestion du stockage pour :${NC}"
echo "Base de données : $DB_NAME"
echo "Hôte : $DB_HOST:$DB_PORT"
echo "Utilisateur : $DB_USER"
echo ""

# Fonction pour exécuter un script SQL
run_sql_script() {
    local script_name="$1"
    echo -e "${YELLOW}Exécution de $script_name...${NC}"
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -f "$MIGRATIONS_DIR/$script_name" || {
        echo -e "${RED}Erreur lors de l'exécution de $script_name${NC}"
        return 1
    }
    
    echo -e "${GREEN}Script $script_name exécuté avec succès !${NC}"
    return 0
}

# Exécuter les scripts dans l'ordre
echo -e "${GREEN}Début de la configuration du système de gestion de stockage...${NC}"
echo "----------------------------------------------------"

# 1. Vérifier et configurer le schéma template
run_sql_script "verify_template_storage.sql" || exit 1

# 2. Configurer les déclencheurs dans le schéma template
run_sql_script "template_storage_triggers.sql" || exit 1

# 3. Appliquer la configuration à tous les schémas client
run_sql_script "apply_template_storage_to_clients.sql" || exit 1

# Script final qui peut être utilisé pour vérifier l'état
run_sql_script "setup_all_storage_management.sql" || exit 1

echo "----------------------------------------------------"
echo -e "${GREEN}Configuration du système de gestion de stockage terminée avec succès !${NC}"
echo -e "Consultez la documentation dans ${YELLOW}server/docs/template_storage_management.md${NC} pour plus d'informations." 