import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Ne pas exécuter côté serveur
    if (typeof window === 'undefined') return 'system';
    
    // Récupérer le thème du localStorage
    const storedTheme = localStorage.getItem('theme') as Theme;
    if (storedTheme) {
      return storedTheme;
    }
    
    // Sinon, utiliser les préférences système
    return 'system';
  });

  const [themeTransitioning, setThemeTransitioning] = useState(false);

  const applyTheme = (newTheme: Theme) => {
    // Appliquer le thème au document
    const root = window.document.documentElement;
    root.classList.add('theme-transition');

    setTimeout(() => {
      if (newTheme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
        
        root.classList.remove('light', 'dark');
        root.classList.add(systemTheme);
      } else {
        root.classList.remove('light', 'dark');
        root.classList.add(newTheme);
      }

      // Stocker le thème dans localStorage
      localStorage.setItem('theme', newTheme);

      // Retirer la classe de transition après l'animation
      setTimeout(() => {
        root.classList.remove('theme-transition');
        setThemeTransitioning(false);
      }, 300);
    }, 50);
  };

  // Suivre les changements de préférence système
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Appliquer le thème initial
  useEffect(() => {
    applyTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setter avec transition
  const setThemeWithTransition = (newTheme: Theme) => {
    setThemeTransitioning(true);
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  return { 
    theme, 
    setTheme: setThemeWithTransition,
    themeTransitioning
  };
} 