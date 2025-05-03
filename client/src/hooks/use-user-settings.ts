import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

// Interface pour les paramètres utilisateur
export interface UserSettings {
  id: number;
  userId: number;
  appearance: {
    theme: 'light' | 'dark' | 'system';
    density: 'compact' | 'comfortable' | 'spacious';
    accentColor: string;
    animations: boolean;
    dashboardLayout: 'grid' | 'cards';
    fontSize: number;
    borderRadius: number;
  };
  locale: {
    language: string;
    country: string;
    currency: string;
    dateFormat: string;
    timeFormat: string;
    timezone: string;
    separateThousands: boolean;
  };
  notifications: {
    email: {
      enabled: boolean;
      dailyDigest: boolean;
      marketing: boolean;
      propertyAlerts: boolean;
      tenantActivity: boolean;
      paymentReminders: boolean;
      maintenanceUpdates: boolean;
    };
    push: {
      enabled: boolean;
      propertyAlerts: boolean;
      tenantActivity: boolean;
      paymentReminders: boolean;
      maintenanceUpdates: boolean;
    };
    sms: {
      enabled: boolean;
      propertyAlerts: boolean;
      paymentReminders: boolean;
      maintenanceUpdates: boolean;
    };
  };
  properties: {
    defaultCurrency: string;
    showVacancyStatus: boolean;
    maintenanceAlerts: boolean;
    defaultRentDueDay: number;
    autoArchiveAfterDays: number | null;
  };
  security: {
    twoFactorEnabled: boolean;
    loginAlerts: boolean;
    sessionTimeout: boolean;
    passwordResetViaSms: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

// Valeurs par défaut des paramètres
const defaultSettings: UserSettings = {
  id: 0,
  userId: 0,
  appearance: {
    theme: 'system',
    density: 'comfortable',
    accentColor: 'blue',
    animations: true,
    dashboardLayout: 'grid',
    fontSize: 1,
    borderRadius: 0.5,
  },
  locale: {
    language: 'fr',
    country: 'fr',
    currency: 'eur',
    dateFormat: 'fr',
    timeFormat: '24h',
    timezone: 'europe-paris',
    separateThousands: true,
  },
  notifications: {
    email: {
      enabled: true,
      dailyDigest: false,
      marketing: false,
      propertyAlerts: true,
      tenantActivity: true,
      paymentReminders: true,
      maintenanceUpdates: true,
    },
    push: {
      enabled: true,
      propertyAlerts: true,
      tenantActivity: true,
      paymentReminders: true,
      maintenanceUpdates: true,
    },
    sms: {
      enabled: false,
      propertyAlerts: false,
      paymentReminders: true,
      maintenanceUpdates: false,
    },
  },
  properties: {
    defaultCurrency: 'eur',
    showVacancyStatus: true,
    maintenanceAlerts: true,
    defaultRentDueDay: 1,
    autoArchiveAfterDays: 90,
  },
  security: {
    twoFactorEnabled: false,
    loginAlerts: true,
    sessionTimeout: true,
    passwordResetViaSms: false,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function useUserSettings() {
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);

  // Récupérer les paramètres utilisateur depuis l'API
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/user/settings');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des paramètres');
        }
        return await response.json();
      } catch (error) {
        console.error('Erreur lors de la récupération des paramètres:', error);
        // En mode développement, retourner les paramètres par défaut
        if (process.env.NODE_ENV === 'development') {
          console.info('Utilisation des paramètres par défaut en développement');
          return defaultSettings;
        }
        throw error;
      }
    },
  });

  // Mutation pour mettre à jour les paramètres
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<UserSettings>) => {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour des paramètres');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['userSettings'], data);
      toast({
        title: 'Paramètres mis à jour',
        description: 'Vos préférences ont été enregistrées avec succès.',
      });
    },
    onError: (error) => {
      console.error('Erreur lors de la mise à jour des paramètres:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la mise à jour des paramètres.',
      });
    },
  });

  // Fonction pour mettre à jour les paramètres
  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    return updateSettingsMutation.mutate(newSettings);
  };

  // Initialisation des paramètres en développement
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !isInitialized && !isLoading && !settings) {
      queryClient.setQueryData(['userSettings'], defaultSettings);
      setIsInitialized(true);
    }
  }, [queryClient, settings, isLoading, isInitialized]);

  return {
    settings: settings || defaultSettings,
    isLoading,
    error,
    updateSettings,
  };
}