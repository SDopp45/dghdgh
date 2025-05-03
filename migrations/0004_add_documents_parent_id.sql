-- Migration: 0004_add_documents_parent_id.sql
-- Date: 2025-03-25T12:12:50.293Z
-- Description: add_documents_parent_id


-- Ajouter la colonne parent_id à la table documents si elle n'existe pas déjà
ALTER TABLE "documents" 
ADD COLUMN IF NOT EXISTS "parent_id" integer;
