import { Request } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Récupère l'utilisateur actuel à partir de la session
 */
export const getUserFromSession = async (req: Request) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return null;
  }
  
  // req.user peut être un identifiant ou un objet utilisateur complet
  const userId = typeof req.user === 'object' ? (req.user as any).id : req.user;
  
  if (!userId) {
    return null;
  }
  
  return userId;
};