import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Settings, Bot, Lightbulb, AlertTriangle, Sparkles, Cpu, BarChart3, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type AiSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type AiSettings = {
  preferredModel: string;
  quotaInfo: {
    hasQuotaLeft: boolean;
    currentUsage: number;
    limit: number;
  };
};

// Modèles IA disponibles
const aiModels = [
  {
    id: 'openai-gpt-3.5',
    name: 'GPT-3.5',
    description: 'Rapide et économique, parfait pour les questions simples',
    quotaCost: 1,
    features: ['Réponse rapide', 'Coût faible', 'Adapté aux requêtes basiques']
  },
  {
    id: 'openai-gpt-4o',
    name: 'GPT-4',
    description: 'Avancé et précis, recommandé pour les analyses complexes',
    quotaCost: 2,
    features: ['Analyse approfondie', 'Réponses détaillées', 'Contextes complexes']
  }
];

export default function AiSettingsDialog({ open, onOpenChange }: AiSettingsDialogProps) {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/user/ai-settings', { method: 'GET' });
      setSettings(response);
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer vos paramètres IA',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour le modèle préféré
  const updatePreferredModel = async (modelId: string) => {
    try {
      setSaving(true);
      const response = await apiRequest('/api/user/ai-settings', {
        method: 'POST',
        body: JSON.stringify({ preferredModel: modelId }),
      });
      
      setSettings(response);
      
      toast({
        title: 'Modèle mis à jour',
        description: `Votre modèle d'IA préféré a été changé avec succès.`,
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du modèle:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le modèle.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Calculer le pourcentage d'utilisation
  const calculateUsagePercentage = () => {
    if (!settings?.quotaInfo) return 0;
    const { currentUsage, limit } = settings.quotaInfo;
    return Math.min((currentUsage / limit) * 100, 100);
  };

  // Format des nombres
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  // Trouver le modèle actuellement sélectionné
  const getCurrentModelInfo = () => {
    if (!settings?.preferredModel) return null;
    return aiModels.find(model => model.id === settings.preferredModel);
  };

  // Préparer l'affichage du coût par requête
  const currentModelInfo = getCurrentModelInfo();
  const costPerRequest = currentModelInfo ? currentModelInfo.quotaCost : 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl rounded-xl">
        {/* Header avec effet de gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 p-6 text-white">
          {/* Animation de particules */}
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-[20%] left-[10%] w-2 h-2 bg-white/20 rounded-full animate-pulse" style={{ animationDuration: '4s' }}></div>
            <div className="absolute top-[60%] left-[80%] w-1.5 h-1.5 bg-white/10 rounded-full animate-pulse" style={{ animationDuration: '3s' }}></div>
            <div className="absolute top-[30%] left-[50%] w-1 h-1 bg-white/10 rounded-full animate-pulse" style={{ animationDuration: '2.5s' }}></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/20">
                <Settings className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-medium">Paramètres IA</h2>
            </div>
            <p className="text-blue-100/90 text-sm">
              Configurez et personnalisez votre assistant IA
            </p>
          </div>
          
          {/* Élément décoratif */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-gradient-to-r from-blue-400/20 to-indigo-500/20 blur-xl"></div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-2 border-t-blue-500 dark:border-t-blue-400 border-blue-100 dark:border-gray-700 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Cpu className="h-5 w-5 text-blue-500 dark:text-blue-400 animate-pulse" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 p-6">
            {/* Sélection du modèle IA */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 mb-1.5">
                <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-medium">Modèle d'Intelligence Artificielle</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiModels.map((model) => (
                  <div
                    key={model.id}
                    onClick={() => !saving && updatePreferredModel(model.id)}
                    className={cn(
                      "cursor-pointer p-4 rounded-xl backdrop-blur-sm transition-all duration-300",
                      model.id === settings?.preferredModel
                        ? "border-2 border-blue-500 dark:border-blue-400 bg-blue-50/80 dark:bg-blue-950/50 shadow-lg"
                        : "border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 bg-white/80 dark:bg-gray-800/80 hover:shadow-md"
                    )}
                  >
                    <div className="flex justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{model.name}</h4>
                      {model.id === settings?.preferredModel && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                          <Sparkles className="mr-1 h-3 w-3" />
                          Actif
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1.5">{model.description}</p>
                    
                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <Zap className="h-3 w-3 mr-1 text-amber-500 dark:text-amber-400" />
                      <span>{model.quotaCost} unité{model.quotaCost > 1 ? 's' : ''} par requête</span>
                    </div>
                    
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {model.features.map((feature, i) => (
                        <span 
                          key={i}
                          className="inline-block px-2 py-0.5 text-[10px] rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Quota disponible */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-medium">Quota d'utilisation</h3>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatNumber(settings?.quotaInfo?.currentUsage || 0)} / {formatNumber(settings?.quotaInfo?.limit || 100)}
                </span>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    calculateUsagePercentage() < 50 
                      ? "bg-gradient-to-r from-green-400 to-green-500 dark:from-green-500 dark:to-green-600"
                      : calculateUsagePercentage() < 80
                        ? "bg-gradient-to-r from-amber-400 to-amber-500 dark:from-amber-500 dark:to-amber-600" 
                        : "bg-gradient-to-r from-red-400 to-red-500 dark:from-red-500 dark:to-red-600"
                  )} 
                  style={{ width: `${calculateUsagePercentage()}%` }}
                />
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                <Lightbulb className="h-3.5 w-3.5 mr-1.5 text-amber-500 dark:text-amber-400" />
                À ce rythme, vous utiliserez tout votre quota dans {formatNumber(Math.ceil((settings?.quotaInfo?.limit || 100 - (settings?.quotaInfo?.currentUsage || 0)) / costPerRequest))} demandes.
              </p>
            </div>
            
            {/* Message d'alerte si beaucoup de quota est utilisé */}
            {calculateUsagePercentage() > 80 && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/60 rounded-lg">
                <div className="flex">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-800 dark:text-red-300 font-medium">Quota presque épuisé</p>
                    <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                      Vous avez utilisé plus de 80% de votre quota. Contactez un administrateur pour augmenter votre limite.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Footer avec effet de glass */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm flex justify-end">
          <Button 
            onClick={() => onOpenChange(false)}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 text-white border-none hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-blue-700/20 transition-all duration-300"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 