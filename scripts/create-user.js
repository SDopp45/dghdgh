import { db } from './server/db.js';
import { users } from './shared/schema.js';
import crypto from 'crypto';
import fs from 'fs';

// Fonction pour créer un hash de mot de passe basique (simplifié pour cet exemple)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function createUser() {
  try {
    console.log('Creating test user...');
    
    // Créer un utilisateur de test
    const user = await db.insert(users).values({
      username: 'testuser',
      password: hashPassword('testpass123'),
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'manager',
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {},
      accountType: 'individual',
      archived: false,
    }).returning();
    
    console.log('User created:', user);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating user:', error);
    process.exit(1);
  }
}

createUser();