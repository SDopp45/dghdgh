// Script pour lancer le serveur avec l'authentification automatique désactivée
// Exécuter avec: node disable-auto-login.js

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Détecter la commande npm à utiliser
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// Lire toutes les variables d'environnement du fichier .env original
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};

// Extraire toutes les variables d'environnement du fichier .env
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    if (key && value) {
      envVars[key] = value;
    }
  }
});

// S'assurer que les variables critiques existent
const dbUrl = envVars.DATABASE_URL || 'postgresql://postgres:123456789@localhost:5432/property_manager';
const openaiKey = envVars.OPENAI_API_KEY || '';
const huggingfaceKey = envVars.HUGGINGFACE_API_KEY || '';
const anthropicKey = envVars.ANTHROPIC_API_KEY || '';
const replicateToken = envVars.REPLICATE_API_TOKEN || '';

// Créer un environnement personnalisé avec nos paramètres et toutes les variables originales
const env = { 
  ...process.env,
  ...envVars,
  AUTO_LOGIN: 'false',
  NODE_ENV: 'production',
  DATABASE_URL: dbUrl,
  OPENAI_API_KEY: openaiKey,
  HUGGINGFACE_API_KEY: huggingfaceKey,
  ANTHROPIC_API_KEY: anthropicKey,
  REPLICATE_API_TOKEN: replicateToken
};

console.log('====================================================');
console.log('Configuration de l\'application avec les nouveaux rôles');
console.log('====================================================');
console.log('1. AUTO_LOGIN=false et NODE_ENV=production - Page de login activée');
console.log('2. Nouveaux rôles: admin et clients (remplacent manager, tenant, service)');
console.log(`3. Base de données: ${dbUrl}`);
console.log('4. Variables API préservées: OPENAI_API_KEY, HUGGINGFACE_API_KEY, etc.');
console.log('5. Pour vous connecter, utilisez:');
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

// Créer un fichier .env.local temporaire avec toutes les variables nécessaires
console.log('Création d\'un fichier .env.local temporaire...');

// Construire le contenu du fichier .env.local
let envLocalContent = 'NODE_ENV=production\nAUTO_LOGIN=false\n';

// Ajouter toutes les variables importantes du fichier .env original
Object.entries(envVars).forEach(([key, value]) => {
  if (key !== 'NODE_ENV' && key !== 'AUTO_LOGIN') {
    envLocalContent += `${key}=${value}\n`;
  }
});

fs.writeFileSync(envLocalPath, envLocalContent);

// Lancer le serveur avec la variable d'environnement personnalisée
const server = spawn(npmCmd, ['run', 'dev'], { 
  env: env,
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