// Script optimisé pour démarrer l'application sans auto-login
// Exécuter avec: node start-app.js

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configuration
const config = {
  // Désactiver l'auto-login
  AUTO_LOGIN: 'false',
  // Forcer le mode production pour éviter certains comportements de développement automatiques
  NODE_ENV: 'production',
  // Port par défaut
  PORT: '5005'
};

console.log('=================================================================');
console.log('🚀 DÉMARRAGE OPTIMISÉ DE L\'APPLICATION AVEC AUTHENTIFICATION');
console.log('=================================================================');

// 1. Lire toutes les variables d'environnement du fichier .env original
console.log('📋 Lecture des variables d\'environnement...');
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

// 2. Vérifier les variables essentielles
const essentialVars = [
  'DATABASE_URL',
  'OPENAI_API_KEY',
  'HUGGINGFACE_API_KEY',
  'ANTHROPIC_API_KEY',
  'REPLICATE_API_TOKEN'
];

const missingVars = essentialVars.filter(v => !envVars[v]);
if (missingVars.length > 0) {
  console.warn('⚠️ Variables manquantes:', missingVars.join(', '));
  console.warn('🔍 L\'application pourrait ne pas fonctionner correctement.');
} else {
  console.log('✅ Toutes les variables essentielles sont présentes');
}

// 3. Préparer le fichier .env.local temporaire
const envLocalPath = '.env.local';
const envLocalBackupPath = '.env.local.backup';

// Sauvegarder le fichier .env.local existant s'il existe
if (fs.existsSync(envLocalPath)) {
  console.log('🔄 Sauvegarde du fichier .env.local existant...');
  fs.renameSync(envLocalPath, envLocalBackupPath);
}

// Construire le contenu du fichier .env.local
console.log('📝 Création du fichier .env.local temporaire...');
let envLocalContent = '';

// Ajouter d'abord nos configurations spéciales
Object.entries(config).forEach(([key, value]) => {
  envLocalContent += `${key}=${value}\n`;
});

// Ajouter toutes les variables d'environnement originales
Object.entries(envVars).forEach(([key, value]) => {
  // Ne pas écraser nos configurations spéciales
  if (!config[key]) {
    envLocalContent += `${key}=${value}\n`;
  }
});

// Écrire le fichier temporaire
fs.writeFileSync(envLocalPath, envLocalContent);

// 4. Préparer l'environnement d'exécution
console.log('⚙️ Configuration de l\'environnement d\'exécution...');
const env = { 
  ...process.env,
  ...envVars,
  ...config
};

// 5. Afficher les instructions utilisateur
console.log('=================================================================');
console.log('📱 INSTRUCTIONS DE CONNEXION');
console.log('=================================================================');
console.log('1. Accédez à:   http://localhost:5005');
console.log('2. Si vous voyez "Cannot GET /login", allez à: http://localhost:5005/login');
console.log('3. Connectez-vous avec:');
console.log('   - Nom d\'utilisateur: testuser');
console.log('   - Mot de passe: testpass123');
console.log('=================================================================');
console.log('🌐 APPLICATION EN COURS DE DÉMARRAGE...');
console.log('=================================================================');

// 6. Démarrer le serveur avec npm run dev
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const server = spawn(npmCmd, ['run', 'dev'], { 
  env: env,
  stdio: 'inherit' 
});

// 7. Gestion de la fermeture et du nettoyage
const cleanup = () => {
  console.log('\n🧹 Nettoyage des fichiers temporaires...');
  if (fs.existsSync(envLocalPath)) {
    fs.unlinkSync(envLocalPath);
  }
  
  if (fs.existsSync(envLocalBackupPath)) {
    fs.renameSync(envLocalBackupPath, envLocalPath);
    console.log('✅ Fichier .env.local original restauré');
  }
};

server.on('error', (err) => {
  console.error('❌ Erreur lors du démarrage du serveur:', err);
  cleanup();
});

server.on('exit', () => {
  console.log('👋 Serveur arrêté');
  cleanup();
});

process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt demandé par l\'utilisateur...');
  server.kill();
  cleanup();
  process.exit();
}); 