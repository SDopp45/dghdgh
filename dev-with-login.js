// Script pour démarrer l'application en mode développement mais avec login
// Exécuter avec: node dev-with-login.js

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Détecter la commande npm à utiliser
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

console.log('====================================================');
console.log('🎨 DÉMARRAGE EN MODE DÉVELOPPEMENT AVEC LOGIN');
console.log('====================================================');
console.log('✓ AUTO_LOGIN désactivé');
console.log('✓ Mode développement actif (design préservé)');
console.log('✓ Tous les thèmes et styles seront chargés');
console.log('✓ Base de données avec rôles admin et clients');
console.log('====================================================');
console.log('📝 Identifiants de connexion:');
console.log('   - Nom d\'utilisateur: testuser');
console.log('   - Mot de passe: testpass123');
console.log('====================================================');

// Si un fichier .env.local existe, on le renomme temporairement 
// pour éviter les conflits de configuration
const envLocalPath = '.env.local';
const envLocalBackupPath = '.env.local.backup';

if (fs.existsSync(envLocalPath)) {
  console.log('Sauvegarde du fichier .env.local existant...');
  fs.renameSync(envLocalPath, envLocalBackupPath);
}

// Créer un fichier .env.local temporaire avec AUTO_LOGIN=false
console.log('Création d\'un fichier .env.local temporaire...');
fs.writeFileSync(envLocalPath, 'AUTO_LOGIN=false\n');

// Lancer le serveur sans passer d'environnement personnalisé
// qui pourrait causer l'erreur EINVAL
console.log('Démarrage du serveur...');
const server = spawn(npmCmd, ['run', 'dev'], { 
  stdio: 'inherit'
});

// Gérer la restauration du fichier .env.local original lors de la fermeture
const cleanup = () => {
  console.log('\nNettoyage des fichiers temporaires...');
  // Supprimer le fichier .env.local temporaire
  if (fs.existsSync(envLocalPath)) {
    fs.unlinkSync(envLocalPath);
  }
  
  // Restaurer le fichier .env.local original s'il existait
  if (fs.existsSync(envLocalBackupPath)) {
    fs.renameSync(envLocalBackupPath, envLocalPath);
    console.log('Fichier .env.local original restauré.');
  }
};

server.on('error', (err) => {
  console.error('Erreur lors du lancement du serveur:', err);
  cleanup();
});

server.on('exit', () => {
  cleanup();
});

process.on('SIGINT', () => {
  console.log('Arrêt du serveur...');
  server.kill();
  cleanup();
  process.exit();
}); 