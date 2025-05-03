import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LogoutAnimation } from "@/components/ui/logout-animation";
import { useState } from "react";

export function LogoutButton() {
  const queryClient = useQueryClient();
  const [showAnimation, setShowAnimation] = useState(false);

  const handleLogout = async () => {
    try {
      // Afficher l'animation
      setShowAnimation(true);

      // Déconnexion du serveur
      await fetch("/api/logout", { method: "POST" });

      // Réinitialiser toutes les données en cache
      queryClient.resetQueries();
      queryClient.removeQueries();
      queryClient.clear();

      // Force le nettoyage du cache du navigateur pour les requêtes
      await queryClient.invalidateQueries();

      // L'animation se terminera automatiquement et déclenchera onAnimationComplete
    } catch (error) {
      console.error("Logout failed:", error);
      setShowAnimation(false);
    }
  };

  const handleAnimationComplete = () => {
    // Rediriger vers la page de connexion et recharger
    window.location.href = "/login";
    window.location.reload();
  };

  return (
    <>
      <Button variant="ghost" onClick={handleLogout}>
        Déconnexion
      </Button>
      <LogoutAnimation 
        isVisible={showAnimation} 
        onAnimationComplete={handleAnimationComplete}
      />
    </>
  );
}