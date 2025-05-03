export type WidgetSize = '1x1' | '2x1' | '3x1' | '4x1' | '1x2' | '2x2' | '3x2' | '4x2' | '1x3' | '2x3' | '3x3' | '4x3';

export type WidgetType = 'stats' | 'metrics' | 'ai-analysis' | 'revenue' | 'expenses' | 'locations' | 'maintenance' | 'maintenance-costs';

interface WidgetConfig {
  defaultSize: WidgetSize;
  allowedSizes: WidgetSize[];
  title: string;
}

export const WIDGET_CONFIGS: Record<WidgetType, WidgetConfig> = {
  stats: {
    defaultSize: '3x2',
    allowedSizes: ['2x2', '3x2', '4x2'],
    title: 'Statistiques générales'
  },
  metrics: {
    defaultSize: '2x2',
    allowedSizes: ['2x1', '2x2', '3x2'],
    title: 'Métriques de performance'
  },
  'ai-analysis': {
    defaultSize: '1x3',
    allowedSizes: ['1x2', '1x3', '2x3'],
    title: 'Analyse prédictive IA'
  },
  revenue: {
    defaultSize: '3x3',
    allowedSizes: ['2x2', '3x2', '3x3'],
    title: 'Évolution des revenus'
  },
  expenses: {
    defaultSize: '1x2',
    allowedSizes: ['1x1', '1x2', '2x2'],
    title: 'Répartition des dépenses'
  },
  locations: {
    defaultSize: '2x1',
    allowedSizes: ['2x1', '2x2'],
    title: 'État des locations'
  },
  maintenance: {
    defaultSize: '2x1',
    allowedSizes: ['2x1', '2x2', '3x1'],
    title: 'Suivi des maintenances'
  },
  'maintenance-costs': {
    defaultSize: '1x1',
    allowedSizes: ['1x1', '1x2'],
    title: 'Coûts de maintenance'
  }
};

export const getWidgetConfig = (type: WidgetType): WidgetConfig => WIDGET_CONFIGS[type];

export const getNextSize = (type: WidgetType, currentSize: WidgetSize): WidgetSize => {
  const config = WIDGET_CONFIGS[type];
  const index = config.allowedSizes.indexOf(currentSize);
  return config.allowedSizes[(index + 1) % config.allowedSizes.length];
};

export const isValidSize = (type: WidgetType, size: WidgetSize): boolean => {
  const config = WIDGET_CONFIGS[type];
  return config.allowedSizes.includes(size);
};

export const getPreviousSize = (type: WidgetType, currentSize: WidgetSize): WidgetSize => {
  const config = WIDGET_CONFIGS[type];
  const currentIndex = config.allowedSizes.indexOf(currentSize);
  const previousIndex = currentIndex === 0 ? config.allowedSizes.length - 1 : currentIndex - 1;
  return config.allowedSizes[previousIndex];
}; 