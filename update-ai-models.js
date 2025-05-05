#!/usr/bin/env node

/**
 * Script pour mettre à jour les modèles d'IA disponibles dans la base de données
 * Ce script garantit la cohérence entre l'application et la base de données
 * en restreignant les valeurs possibles de preferred_ai_model à openai-gpt-3.5 et openai-gpt-4o.
 */

import { updateAiModels } from './db-migrate.js';

async function main() {
  console.log('🚀 Début de la mise à jour des modèles d\'IA...');
  
  try {
    const success = await updateAiModels();
    
    if (success) {
      console.log('✅ Mise à jour des modèles d\'IA réussie !');
      process.exit(0);
    } else {
      console.error('❌ Échec de la mise à jour des modèles d\'IA');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Une erreur est survenue:', error);
    process.exit(1);
  }
}

main(); 