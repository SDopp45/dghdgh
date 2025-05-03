import { useLocation } from 'wouter';

/**
 * Hook permettant de gérer la navigation avec des paramètres de requête
 * tout en préservant les paramètres existants
 */
export const useSearchNavigation = () => {
  const [location, navigate] = useLocation();

  /**
   * Navigue vers une page avec un paramètre de sélection
   * @param path - Le chemin de base (ex: /visits, /properties)
   * @param selectedId - L'ID de l'élément sélectionné
   * @param preserveQuery - Conserver les paramètres de requête existants (true par défaut)
   */
  const navigateWithSelection = (path: string, selectedId: string | number, preserveQuery = true) => {
    // Obtenir les paramètres de requête actuels si nécessaire
    const currentParams = preserveQuery && location.includes('?') 
      ? new URLSearchParams(location.split('?')[1]) 
      : new URLSearchParams();
    
    // Ajouter ou mettre à jour le paramètre selected
    currentParams.set('selected', selectedId.toString());
    
    // Construire la nouvelle URL
    const newLocation = `${path}?${currentParams.toString()}`;
    
    // Naviguer vers la nouvelle URL
    navigate(newLocation);
  };

  return {
    navigateWithSelection
  };
};

export default useSearchNavigation; 