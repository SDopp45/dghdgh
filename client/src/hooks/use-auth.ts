import { useUser } from './use-user';

// Définir les types nécessaires
interface AuthUser {
  id: number;
  username: string;
  fullName?: string;
  email?: string;
  role?: string;
  // Autres propriétés possibles
}

export function useAuth() {
  // Réutiliser le hook existant
  const userHook = useUser();
  
  // Vérification si l'utilisateur est admin (basé sur le rôle ou pour le moment l'id)
  // Cette logique peut être adaptée selon les besoins réels du système
  const isAdmin = (): boolean => {
    if (!userHook.user) return false;
    
    // Pour le moment, utilisons une approche simple pour la démonstration
    // Dans un système réel, vous devriez vérifier le rôle spécifique
    const user = userHook.user as AuthUser;
    
    // Vérifier si l'utilisateur a un rôle admin
    if (user.role === 'admin') return true;
    
    // Ou si l'utilisateur fait partie d'une liste d'administrateurs
    // (solution temporaire pour la démonstration)
    const adminIds = [1, 2]; // IDs des utilisateurs admin
    return adminIds.includes(user.id);
  };

  return {
    ...userHook,
    isAdmin,
    // Ajouter d'autres fonctions/propriétés d'authentification si nécessaire
  };
}