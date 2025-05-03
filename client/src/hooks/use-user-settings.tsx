import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';

export type ThemeType = 'light' | 'dark' | 'system';
export type DensityType = 'compact' | 'comfortable' | 'spacious';
export type LayoutType = 'grid' | 'cards';

export interface UserSettings {
  theme: ThemeType;
  density: DensityType;
  accentColor: string;
  animations: boolean;
  layout: LayoutType;
  fontSize: number;
  borderRadius: number;
}

export const defaultSettings: UserSettings = {
  theme: 'system',
  density: 'comfortable',
  accentColor: '#0ea5e9',
  animations: true,
  layout: 'grid',
  fontSize: 16,
  borderRadius: 6,
};

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  // Charger les paramètres depuis le stockage local
  useEffect(() => {
    const loadSettings = () => {
      setLoading(true);
      try {
        const savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }
      } catch (error) {
        console.error('Failed to load user settings:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger vos paramètres',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Sauvegarder les paramètres dans le stockage local
  const saveSettings = useCallback(
    async (newSettings: Partial<UserSettings>) => {
      try {
        const updatedSettings = { ...settings, ...newSettings };
        setSettings(updatedSettings);
        localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
        
        // Appliquer les paramètres CSS variables si nécessaire
        applySettingsToDOM(updatedSettings);
        
        return true;
      } catch (error) {
        console.error('Failed to save user settings:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de sauvegarder vos paramètres',
          variant: 'destructive',
        });
        return false;
      }
    },
    [settings]
  );

  // Réinitialiser tous les paramètres aux valeurs par défaut
  const resetSettings = useCallback(async () => {
    try {
      setSettings(defaultSettings);
      localStorage.setItem('userSettings', JSON.stringify(defaultSettings));
      
      // Appliquer les paramètres par défaut
      applySettingsToDOM(defaultSettings);
      
      toast({
        title: 'Paramètres réinitialisés',
        description: 'Vos préférences ont été réinitialisées aux valeurs par défaut',
      });
      
      return true;
    } catch (error) {
      console.error('Failed to reset settings:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de réinitialiser vos paramètres',
        variant: 'destructive',
      });
      return false;
    }
  }, []);

  // Appliquer les paramètres au DOM via des variables CSS
  const applySettingsToDOM = (settings: UserSettings) => {
    const root = document.documentElement;
    
    // Appliquer la couleur d'accent
    const hsl = hexToHSL(settings.accentColor);
    if (hsl) {
      root.style.setProperty('--primary-hsl', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    }
    
    // Appliquer la taille de police
    root.style.setProperty('--font-size-base', `${settings.fontSize}px`);
    
    // Appliquer le rayon de bordure
    root.style.setProperty('--radius', `${settings.borderRadius}px`);
  };

  // Convertir une couleur hexadécimale en HSL
  const hexToHSL = (hex: string): { h: number; s: number; l: number } | null => {
    try {
      // Convertir la couleur hexadécimale en RGB
      const hexColor = hex.replace('#', '');
      const r = parseInt(hexColor.substring(0, 2), 16) / 255;
      const g = parseInt(hexColor.substring(2, 4), 16) / 255;
      const b = parseInt(hexColor.substring(4, 6), 16) / 255;
  
      // Trouver min et max pour le calcul HSL
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
  
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  
        if (max === r) {
          h = (g - b) / d + (g < b ? 6 : 0);
        } else if (max === g) {
          h = (b - r) / d + 2;
        } else if (max === b) {
          h = (r - g) / d + 4;
        }
  
        h *= 60;
      }
  
      return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
    } catch (error) {
      console.error('Error converting hex to HSL:', error);
      return null;
    }
  };

  return {
    settings,
    loading,
    updateSettings: saveSettings,
    resetSettings,
  };
} 