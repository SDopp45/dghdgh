-- Script pour propager les tables du template vers les schémas clients

-- Création des tables dans le schéma client_31 (copiées depuis template)

-- Table des visites
CREATE TABLE client_31.visits (LIKE template.visits INCLUDING ALL);

-- Table des demandes de maintenance
CREATE TABLE client_31.maintenance_requests (LIKE template.maintenance_requests INCLUDING ALL);

-- Table des feedbacks
CREATE TABLE client_31.feedbacks (LIKE template.feedbacks INCLUDING ALL);

-- Table des soumissions de formulaire
CREATE TABLE client_31.form_submissions (LIKE template.form_submissions INCLUDING ALL);

-- Table des documents des locataires
CREATE TABLE client_31.tenant_documents (LIKE template.tenant_documents INCLUDING ALL);

-- Table de l'historique des locataires
CREATE TABLE client_31.tenant_history (LIKE template.tenant_history INCLUDING ALL);

-- Table de l'historique des propriétés
CREATE TABLE client_31.property_history (LIKE template.property_history INCLUDING ALL);

-- Table des travaux sur les propriétés
CREATE TABLE client_31.property_works (LIKE template.property_works INCLUDING ALL);

-- Table des coordonnées des propriétés
CREATE TABLE client_31.property_coordinates (LIKE template.property_coordinates INCLUDING ALL);

-- Table des analyses de propriétés
CREATE TABLE client_31.property_analyses (LIKE template.property_analyses INCLUDING ALL);

-- Création des vues admin pour chaque table

-- Vue pour les visites
CREATE OR REPLACE VIEW admin_views.visits_31 AS 
SELECT *, 'client_31' as _schema_name FROM client_31.visits;

-- Vue pour les demandes de maintenance
CREATE OR REPLACE VIEW admin_views.maintenance_requests_31 AS 
SELECT *, 'client_31' as _schema_name FROM client_31.maintenance_requests;

-- Vue pour les feedbacks
CREATE OR REPLACE VIEW admin_views.feedbacks_31 AS 
SELECT *, 'client_31' as _schema_name FROM client_31.feedbacks;

-- Vue pour les soumissions de formulaire
CREATE OR REPLACE VIEW admin_views.form_submissions_31 AS 
SELECT *, 'client_31' as _schema_name FROM client_31.form_submissions;

-- Vue pour les documents des locataires
CREATE OR REPLACE VIEW admin_views.tenant_documents_31 AS 
SELECT *, 'client_31' as _schema_name FROM client_31.tenant_documents;

-- Vue pour l'historique des locataires
CREATE OR REPLACE VIEW admin_views.tenant_history_31 AS 
SELECT *, 'client_31' as _schema_name FROM client_31.tenant_history;

-- Vue pour l'historique des propriétés
CREATE OR REPLACE VIEW admin_views.property_history_31 AS 
SELECT *, 'client_31' as _schema_name FROM client_31.property_history;

-- Vue pour les travaux sur les propriétés
CREATE OR REPLACE VIEW admin_views.property_works_31 AS 
SELECT *, 'client_31' as _schema_name FROM client_31.property_works;

-- Vue pour les coordonnées des propriétés
CREATE OR REPLACE VIEW admin_views.property_coordinates_31 AS 
SELECT *, 'client_31' as _schema_name FROM client_31.property_coordinates;

-- Vue pour les analyses de propriétés
CREATE OR REPLACE VIEW admin_views.property_analyses_31 AS 
SELECT *, 'client_31' as _schema_name FROM client_31.property_analyses; 