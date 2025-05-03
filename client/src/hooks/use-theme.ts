import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Récupérer le thème du localStorage
    const storedTheme = localStorage.getItem('theme') as Theme;
      if (storedTheme) {
        return storedTheme;
      }
    
    // Sinon, utiliser les préférences système
    return 'system';
  });

  useEffect(() => {
    // Appliquer le thème au document
    const root = window.document.documentElement;

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      
      root.classList.remove('light', 'dark');
      root.classList.add(systemTheme);
    } else {
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
    }

    // Stocker le thème dans localStorage
    localStorage.setItem('theme', theme);
    
    // Sync avec l'API
    const syncThemeWithApi = async () => {
      try {
        await fetch('/api/user/preferences', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appearance: { theme }
          }),
        });
      } catch (error) {
        console.error('Erreur lors de la synchronisation du thème:', error);
      }
    };
    
    syncThemeWithApi();
  }, [theme]);

  return { theme, setTheme };
} 