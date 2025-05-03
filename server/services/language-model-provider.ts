import { ProviderInfo } from '@shared/types/ai-assistant';
import logger from '@server/utils/logger';

/**
 * Service pour gérer les fournisseurs d'IA
 * Cette classe permet de basculer dynamiquement entre les différents fournisseurs
 * en cas d'erreur ou de quota dépassé
 */
class LanguageModelProviderService {
  private currentProvider: string = 'huggingface';
  private fallbackProvider: string = 'openai';
  private providerStatus: Record<string, boolean> = {
    huggingface: true,
    openai: true,
  };
  private lastError: Record<string, { timestamp: number, message: string }> = {
    huggingface: { timestamp: 0, message: '' },
    openai: { timestamp: 0, message: '' },
  };

  /**
   * Renvoie le fournisseur actuel
   */
  getCurrentProvider(): string {
    return this.currentProvider;
  }

  /**
   * Renvoie les informations complètes sur le fournisseur actuel
   */
  getProviderInfo(): ProviderInfo {
    if (this.currentProvider === 'huggingface') {
      return {
        provider: 'huggingface',
        providerName: 'HuggingFace',
        displayName: 'HuggingFace'
      };
    } else {
      return {
        provider: 'openai',
        providerName: 'OpenAI',
        displayName: 'OpenAI'
      };
    }
  }

  /**
   * Indique si le fournisseur spécifié est disponible
   */
  isProviderAvailable(provider: string): boolean {
    return this.providerStatus[provider] || false;
  }

  /**
   * Marque un fournisseur comme indisponible suite à une erreur
   */
  setProviderUnavailable(provider: string, errorMessage: string): void {
    this.providerStatus[provider] = false;
    this.lastError[provider] = {
      timestamp: Date.now(),
      message: errorMessage
    };
    logger.warn(`Fournisseur d'IA ${provider} marqué comme indisponible: ${errorMessage}`, 
    { context: 'AIProvider', timestamp: new Date().toISOString() });

    // Si le fournisseur actuel est celui qui vient d'être marqué comme indisponible,
    // nous basculons vers le fournisseur de secours
    if (provider === this.currentProvider) {
      this.switchProvider();
    }
  }

  /**
   * Bascule vers un autre fournisseur
   */
  switchProvider(): void {
    const previousProvider = this.currentProvider;
    this.currentProvider = this.currentProvider === 'huggingface' ? 'openai' : 'huggingface';
    logger.info(`Basculement du fournisseur d'IA: ${previousProvider} -> ${this.currentProvider}`, 
    { context: 'AIProvider', timestamp: new Date().toISOString() });
  }

  /**
   * Restaure un fournisseur précédemment marqué comme indisponible
   */
  restoreProvider(provider: string): void {
    this.providerStatus[provider] = true;
    logger.info(`Fournisseur d'IA ${provider} restauré et à nouveau disponible`, 
    { context: 'AIProvider', timestamp: new Date().toISOString() });
  }

  /**
   * Vérifie et restaure les fournisseurs qui ont été marqués comme indisponibles 
   * après une certaine période de temps (30 minutes)
   */
  checkAndRestoreProviders(): void {
    const now = Date.now();
    const thirtyMinutesInMs = 30 * 60 * 1000;

    for (const provider of Object.keys(this.providerStatus)) {
      if (!this.providerStatus[provider] && 
          (now - this.lastError[provider].timestamp) > thirtyMinutesInMs) {
        this.restoreProvider(provider);
      }
    }
  }
}

// Singleton pour être utilisé dans toute l'application
const languageModelProviderService = new LanguageModelProviderService();
export default languageModelProviderService;