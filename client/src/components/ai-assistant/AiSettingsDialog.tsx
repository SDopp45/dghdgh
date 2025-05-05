import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Settings, Bot, Lightbulb, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

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

// Information sur les modèles, incluant leur coût en quota
const aiModels = [
  { id: 'openai-gpt-3.5', name: 'OpenAI GPT-3.5 Turbo', category: 'openai', quotaCost: 1, description: 'Bon pour les questions générales.' },
  { id: 'openai-gpt-4o', name: 'OpenAI GPT-4o', category: 'openai', quotaCost: 2, description: 'Recommandé pour les questions juridiques complexes.' }
];

export default function AiSettingsDialog({ open, onOpenChange }: AiSettingsDialogProps) {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Récupérer les paramètres actuels
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
      console.error('Erreur lors de la récupération des paramètres IA:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer vos paramètres IA.',
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
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Paramètres de l'Assistant IA
          </DialogTitle>
          <DialogDescription>
            Configurez votre assistant IA et suivez votre quota d'utilisation.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Sélection du modèle */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Modèle d'IA
                </CardTitle>
                <CardDescription>
                  Choisissez le modèle d'IA à utiliser pour vos conversations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={settings?.preferredModel || ''}
                  onValueChange={updatePreferredModel}
                  disabled={saving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionnez un modèle" />
                  </SelectTrigger>
                  <SelectContent>
                    {aiModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name} ({model.quotaCost} {model.quotaCost > 1 ? 'unités' : 'unité'} de quota)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Coût en quota selon le modèle choisi:
                  </p>
                  {aiModels.map((model) => (
                    <div 
                      key={model.id} 
                      className={`p-2 border rounded-md ${settings?.preferredModel === model.id ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{model.name}</span>
                        <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                          {model.quotaCost} {model.quotaCost > 1 ? 'unités' : 'unité'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{model.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quota d'utilisation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Quota d'utilisation
                </CardTitle>
                <CardDescription>
                  Vous disposez d'un nombre limité de requêtes par mois.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={calculateUsagePercentage()} className="h-2" />
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-muted-foreground">
                    {settings?.quotaInfo ? formatNumber(settings.quotaInfo.currentUsage) : '0'} requêtes utilisées
                  </span>
                  <span className="text-muted-foreground">
                    Limite: {settings?.quotaInfo ? formatNumber(settings.quotaInfo.limit) : '100'}
                  </span>
                </div>
                
                {currentModelInfo && (
                  <div className="mt-2 text-sm flex items-center">
                    <span className="text-muted-foreground">
                      <span className="font-medium">Coût actuel:</span> {costPerRequest} {costPerRequest > 1 ? 'unités' : 'unité'} de quota par requête avec {currentModelInfo.name}
                    </span>
                  </div>
                )}
                
                {settings?.quotaInfo && settings.quotaInfo.currentUsage >= settings.quotaInfo.limit && (
                  <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-800">
                      Vous avez atteint votre quota d'utilisation. Contactez un administrateur pour augmenter votre limite.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Fermer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 