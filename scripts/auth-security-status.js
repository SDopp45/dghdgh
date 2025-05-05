// Script pour afficher la configuration actuelle de l'authentification et des mesures de sécurité
import fs from 'fs';
import path from 'path';

console.log('=== RAPPORT DE SÉCURITÉ ET D\'AUTHENTIFICATION ===');

// Vérifier les mécanismes d'authentification
console.log('\n--- MÉCANISMES D\'AUTHENTIFICATION ---');

// Vérifier si le fichier auth.ts existe et contient des implémentations spécifiques
try {
  const authPath = path.join(process.cwd(), 'server', 'auth.ts');
  const authContent = fs.readFileSync(authPath, 'utf8');
  
  // Déterminer le système d'authentification utilisé
  const hasPassport = authContent.includes('passport');
  const hasJwt = authContent.includes('jsonwebtoken') || authContent.includes('jwt');
  const hasCrypto = authContent.includes('crypto');
  const hasScrypt = authContent.includes('scrypt');
  const hasBcrypt = authContent.includes('bcrypt');
  
  console.log('Système d\'authentification:');
  console.log(` - Passport.js: ${hasPassport ? 'Oui' : 'Non'}`);
  console.log(` - JWT: ${hasJwt ? 'Oui' : 'Non'}`);
  console.log(` - Crypto natif: ${hasCrypto ? 'Oui' : 'Non'}`);
  
  console.log('Algorithme de hachage de mot de passe:');
  console.log(` - Scrypt: ${hasScrypt ? 'Oui' : 'Non'}`);
  console.log(` - Bcrypt: ${hasBcrypt ? 'Oui' : 'Non'}`);
  
  // Vérifier si RLS est configuré
  const hasRLS = authContent.includes('app.user_id') && 
                 authContent.includes('setUserIdForRLS');
  
  console.log('Configuration Row Level Security (RLS):');
  console.log(` - RLS activé: ${hasRLS ? 'Oui' : 'Non'}`);
  
  // Vérifier les contrôles d'accès basés sur les rôles
  const hasRBAC = authContent.includes('requireRole') || 
                  authContent.includes('hasRole');
  
  console.log('Contrôle d\'accès basé sur les rôles (RBAC):');
  console.log(` - RBAC implémenté: ${hasRBAC ? 'Oui' : 'Non'}`);
  
  // Vérifier les sessions
  const sessionConfig = authContent.match(/session\([\s\S]*?\)\)/);
  if (sessionConfig) {
    console.log('Configuration des sessions:');
    if (authContent.includes('secure: true')) {
      console.log(' - Cookie sécurisé: Oui');
    } else if (authContent.includes('secure: false')) {
      console.log(' - Cookie sécurisé: Non (à activer en production)');
    }
    
    if (authContent.includes('httpOnly: true')) {
      console.log(' - Cookie httpOnly: Oui');
    }
    
    if (authContent.includes('sameSite')) {
      console.log(' - SameSite configuré: Oui');
    }
    
    if (authContent.includes('maxAge')) {
      console.log(' - Expiration des sessions configurée: Oui');
    }
  }
  
} catch (error) {
  console.error('Erreur lors de la lecture du fichier auth.ts:', error.message);
}

// Vérifier les configurations de sécurité dans le code
console.log('\n--- CONFIGURATIONS DE SÉCURITÉ ---');

// Vérifier les variables d'environnement sensibles
try {
  const configPath = path.join(process.cwd(), 'server', 'config.ts');
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  const envVars = {
    'DATABASE_URL': configContent.includes('DATABASE_URL'),
    'SESSION_SECRET': configContent.includes('SESSION_SECRET'),
    'JWT_SECRET': configContent.includes('JWT_SECRET'),
  };
  
  console.log('Variables d\'environnement sensibles:');
  for (const [key, exists] of Object.entries(envVars)) {
    console.log(` - ${key}: ${exists ? 'Configuré' : 'Non configuré'}`);
  }
  
} catch (error) {
  console.error('Erreur lors de la lecture du fichier config.ts:', error.message);
}

// Vérifier l'implémentation de RLS dans les scripts
console.log('\n--- IMPLÉMENTATION DU ROW LEVEL SECURITY ---');

// Vérifier la présence des scripts RLS
const rlsScripts = [
  { name: 'configure-rls.js', path: path.join(process.cwd(), 'configure-rls.js') },
  { name: 'check-rls.js', path: path.join(process.cwd(), 'check-rls.js') },
  { name: 'configure-roles.js', path: path.join(process.cwd(), 'configure-roles.js') },
];

for (const script of rlsScripts) {
  try {
    fs.accessSync(script.path, fs.constants.F_OK);
    console.log(` - ${script.name}: Présent`);
  } catch (error) {
    console.log(` - ${script.name}: Non trouvé`);
  }
}

// Vérifier la présence des middlewares de sécurité et autres configurations
console.log('\n--- MIDDLEWARES DE SÉCURITÉ ---');

// Vérifier l'intégration de CORS
try {
  const indexPath = path.join(process.cwd(), 'server', 'index.ts');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  
  const securityFeatures = {
    'CORS': indexContent.includes('cors'),
    'Helmet': indexContent.includes('helmet'),
    'Rate Limiting': indexContent.includes('rate-limit') || indexContent.includes('rateLimit'),
    'Content Security Policy': indexContent.includes('contentSecurityPolicy') || indexContent.includes('CSP'),
    'XSS Protection': indexContent.includes('xss') || indexContent.includes('XSS'),
  };
  
  for (const [feature, exists] of Object.entries(securityFeatures)) {
    console.log(` - ${feature}: ${exists ? 'Configuré' : 'Non configuré'}`);
  }
  
} catch (error) {
  console.error('Erreur lors de la lecture du fichier index.ts:', error.message);
}

// Afficher les recommandations
console.log('\n--- RECOMMANDATIONS DE SÉCURITÉ ---');
console.log(' 1. Configurer RLS sur toutes les tables sensibles');
console.log(' 2. Utiliser des rôles PostgreSQL pour un contrôle d\'accès granulaire');
console.log(' 3. Activer SSL pour les connexions à la base de données');
console.log(' 4. Implémenter un audit trail pour les opérations sensibles');
console.log(' 5. Configurer Helmet.js pour des en-têtes HTTP sécurisés');
console.log(' 6. Limiter les taux de requêtes pour éviter les attaques par force brute');
console.log(' 7. Valider et assainir toutes les entrées utilisateur');
console.log(' 8. Utiliser des secrets forts pour les sessions et les JWT');
console.log(' 9. Activer HTTPS en production');
console.log(' 10. Configurer la rotation régulière des journaux et leur anonymisation');

console.log('\n=== FIN DU RAPPORT ==='); 