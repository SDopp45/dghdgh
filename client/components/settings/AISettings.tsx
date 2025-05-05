import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Types for AI models and API responses
type AIModelType = 'openai-gpt-3.5' | 'openai-gpt-4o' | 'huggingface-zephyr' | 'anthropic-claude' | 'mistral-7b' | 'local';

interface AIQuotaInfo {
  currentUsage: number;
  limit: number;
  hasQuotaLeft: boolean;
}

interface AISettings {
  preferredModel: AIModelType;
  quotaInfo: AIQuotaInfo;
}

const modelLabels: Record<AIModelType, string> = {
  'openai-gpt-3.5': 'OpenAI GPT-3.5 Turbo',
  'openai-gpt-4o': 'OpenAI GPT-4o (Avancé)',
  'huggingface-zephyr': 'HuggingFace Zephyr',
  'anthropic-claude': 'Anthropic Claude',
  'mistral-7b': 'Mistral 7B',
  'local': 'Réponses Locales (Sans API)',
};

const ModelDescription: Record<AIModelType, string> = {
  'openai-gpt-3.5': 'Modèle rapide et économique, idéal pour la plupart des requêtes.',
  'openai-gpt-4o': 'Le modèle le plus avancé d\'OpenAI, pour des réponses détaillées et complexes.',
  'huggingface-zephyr': 'Modèle open-source performant avec une bonne compréhension du français.',
  'anthropic-claude': 'Modèle de Claude, spécialisé dans les réponses nuancées et attentives.',
  'mistral-7b': 'Modèle français performant, particulièrement adapté au contexte français.',
  'local': 'Réponses prédéfinies sans appel API, disponible même en cas de dépassement de quota.',
};

const AISettingsComponent: React.FC = () => {
  const [settings, setSettings] = useState<AISettings>({
    preferredModel: 'openai-gpt-3.5',
    quotaInfo: {
      currentUsage: 0,
      limit: 100,
      hasQuotaLeft: true
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/user/ai-settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      toast.error('Impossible de récupérer vos paramètres d\'IA');
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = async (model: AIModelType) => {
    try {
      setSaving(true);
      await axios.post('/api/user/ai-settings', { preferredModel: model });
      setSettings(prev => ({ ...prev, preferredModel: model }));
      toast.success('Modèle d\'IA mis à jour avec succès');
    } catch (error) {
      console.error('Error updating AI model:', error);
      toast.error('Impossible de mettre à jour le modèle d\'IA');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center p-10">Chargement des paramètres d'IA...</div>;
  }

  return (
    <div className="bg-white p-6 shadow-md rounded-lg">
      <h2 className="text-2xl font-semibold mb-4">Paramètres de l'Assistant IA</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Modèle d'IA Préféré</h3>
        <p className="text-gray-600 text-sm mb-4">
          Sélectionnez le modèle d'IA que vous souhaitez utiliser pour votre assistant. 
          Chaque modèle a ses propres forces et limitations.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(modelLabels).map(([modelKey, label]) => (
            <div 
              key={modelKey}
              onClick={() => !saving && handleModelChange(modelKey as AIModelType)}
              className={`
                cursor-pointer p-4 border rounded-lg transition-all
                ${settings.preferredModel === modelKey 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }
                ${saving ? 'opacity-50' : ''}
              `}
            >
              <h4 className="font-medium">{label}</h4>
              <p className="text-gray-600 text-sm mt-1">
                {ModelDescription[modelKey as AIModelType]}
              </p>
              {settings.preferredModel === modelKey && (
                <span className="inline-block mt-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                  Actif
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-2">Utilisation et Quota</h3>
        <div className="bg-gray-100 p-4 rounded-md">
          <div className="flex justify-between mb-2">
            <span>Utilisation actuelle:</span>
            <span className="font-semibold">{settings.quotaInfo.currentUsage} / {settings.quotaInfo.limit} requêtes</span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-2.5 mb-4">
            <div 
              className={`h-2.5 rounded-full ${settings.quotaInfo.hasQuotaLeft ? 'bg-green-600' : 'bg-red-600'}`}
              style={{ width: `${Math.min(100, (settings.quotaInfo.currentUsage / settings.quotaInfo.limit) * 100)}%` }}
            ></div>
          </div>
          {!settings.quotaInfo.hasQuotaLeft && (
            <p className="text-red-600 text-sm">
              Vous avez atteint votre limite de requêtes. Veuillez contacter l'administrateur pour augmenter votre quota.
            </p>
          )}
          <p className="text-gray-600 text-sm mt-2">
            Votre quota se renouvelle au début de chaque mois.
          </p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
        <h3 className="text-amber-700 font-medium mb-1">Information importante</h3>
        <p className="text-amber-700 text-sm">
          Chaque requête à l'assistant compte dans votre quota mensuel, sauf si vous utilisez le modèle "Réponses Locales".
          Les modèles plus avancés comme GPT-4o peuvent offrir des réponses de meilleure qualité mais consomment également votre quota.
        </p>
      </div>
    </div>
  );
};

export default AISettingsComponent; 