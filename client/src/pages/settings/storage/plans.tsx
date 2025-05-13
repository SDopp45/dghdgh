import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function StoragePlansRedirect() {
  const [_, setLocation] = useLocation();

  useEffect(() => {
    // Rediriger vers la page principale avec l'onglet plans activé
    const redirectTimeout = setTimeout(() => {
      setLocation('/settings/storage?tab=plans');
    }, 100);

    return () => clearTimeout(redirectTimeout);
  }, [setLocation]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <p className="text-muted-foreground">Redirection en cours...</p>
    </div>
  );
} 