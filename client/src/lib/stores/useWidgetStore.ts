import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Clé de stockage pour persister la configuration des widgets
const WIDGET_STORE_KEY = 'immo-dashboard-widgets';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export type WidgetSize = 'small' | 'medium' | 'wide' | 'large' | 'x-large';
export type WidgetImportance = 'normal' | 'important' | 'critical';
export type WidgetId = string;
export type WidgetContext = 'dashboard' | 'properties' | 'tenants' | 'visits' | 'maintenance';

export interface Widget {
  id: WidgetId;
  type: string;
  title: string;
  category: 'general' | 'finance' | 'rental' | 'maintenance' | 'activity' | 'monitoring' | 'predictive' | 'propriétés';
  context: WidgetContext;
  position: Position;
  size: Size;
  displaySize?: WidgetSize;
  importance?: WidgetImportance;
  collapsed?: boolean;
  pinned?: boolean;
  visible?: boolean;
  order?: number;
  colors?: WidgetColors;
  [key: string]: any; // Permet d'ajouter des propriétés supplémentaires
}

export interface WidgetColors {
  primary: string;
  background: string;
  text: string;
}

interface WidgetStore {
  widgets: Widget[];
  currentContext: WidgetContext;
  setContext: (context: WidgetContext) => void;
  addWidget: (widget: Widget) => void;
  removeWidget: (id: WidgetId) => void;
  updateWidgetPosition: (id: WidgetId, position: Position) => void;
  updateWidgetSize: (id: WidgetId, size: { width: number, height: number }) => void;
  updateWidgetDisplaySize: (id: WidgetId, displaySize: WidgetSize) => void;
  updateWidgetImportance: (id: WidgetImportance, importance: WidgetImportance) => void;
  toggleCollapsed: (id: WidgetId) => void;
  togglePinned: (id: WidgetId) => void;
  toggleWidgetVisibility: (id: WidgetId) => void;
  reorderWidgets: (startIndex: number, endIndex: number) => void;
  updateWidgetOrder: (widgets: Widget[]) => void;
  updateWidgetColors: (id: WidgetId, colors: WidgetColors) => void;
  updateWidgetTitle: (id: WidgetId, title: string) => void;
  getContextWidgets: (context: WidgetContext) => Widget[];
  createDefaultLayout: () => void;
  pinWidget: (id: WidgetId) => void;
  unpinWidget: (id: WidgetId) => void;
}

const defaultWidgets: Widget[] = [
  {
    id: 'default-property-comparison',
    type: 'property-comparison',
    category: 'propriétés',
    context: 'dashboard',
    title: 'Analyse comparative',
    position: { x: 0, y: 0 },
    size: { width: 3, height: 2, minWidth: 2, minHeight: 1, maxWidth: 3, maxHeight: 3 },
    displaySize: 'large',
    importance: 'important',
    collapsed: false,
    pinned: true,
    visible: true,
    order: 0,
    colors: {
      primary: '#3b82f6',
      background: '#1e293b',
      text: '#ffffff'
    }
  },
  {
    id: 'default-predictive-analytics',
    type: 'predictive-analytics',
    category: 'predictive',
    context: 'dashboard',
    title: 'Prédiction IA',
    position: { x: 0, y: 2 },
    size: { width: 3, height: 2, minWidth: 2, minHeight: 1, maxWidth: 3, maxHeight: 3 },
    displaySize: 'large',
    importance: 'important',
    collapsed: false,
    pinned: true,
    visible: true,
    order: 1,
    colors: {
      primary: '#9333ea',
      background: '#1a103d',
      text: '#ffffff'
    }
  },
  {
    id: 'default-cashflow-sankey',
    type: 'cashflow-sankey',
    category: 'finance',
    context: 'dashboard',
    title: 'Flux financiers',
    position: { x: 0, y: 4 },
    size: { width: 3, height: 2, minWidth: 2, minHeight: 1, maxWidth: 3, maxHeight: 3 },
    displaySize: 'large',
    importance: 'important',
    collapsed: false,
    pinned: true,
    visible: true,
    order: 2,
    colors: {
      primary: '#10b981',
      background: '#064e3b',
      text: '#ffffff'
    }
  }
];

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set, get) => ({
      widgets: defaultWidgets,
      currentContext: 'dashboard',

      setContext: (context) => set({ currentContext: context }),

      getContextWidgets: (context) => {
        return get().widgets.filter(w => w.context === context);
      },

      pinWidget: (id: WidgetId) => 
        set((state) => {
          console.log(`[useWidgetStore] Pinning widget ${id}`);
          
          const widgetsCopy = [...state.widgets];
          const widgetIndex = widgetsCopy.findIndex(w => w.id === id);
          
          if (widgetIndex < 0) {
            console.warn(`[useWidgetStore] Widget ${id} not found`);
            return state;
          }
          
          // Update the widget's pinned status
          widgetsCopy[widgetIndex] = {
            ...widgetsCopy[widgetIndex],
            pinned: true
          };
          
          // Trigger a custom event to notify about the pin change
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('widget-pin-changed', { 
              detail: { widgetId: id, pinned: true }
            }));
          }
          
          return { widgets: widgetsCopy };
        }),

      unpinWidget: (id: WidgetId) => 
        set((state) => {
          console.log(`[useWidgetStore] Unpinning widget ${id}`);
          
          const widgetsCopy = [...state.widgets];
          const widgetIndex = widgetsCopy.findIndex(w => w.id === id);
          
          if (widgetIndex < 0) {
            console.warn(`[useWidgetStore] Widget ${id} not found`);
            return state;
          }
          
          // Update the widget's pinned status
          widgetsCopy[widgetIndex] = {
            ...widgetsCopy[widgetIndex],
            pinned: false
          };
          
          // Trigger a custom event to notify about the pin change
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('widget-pin-changed', { 
              detail: { widgetId: id, pinned: false }
            }));
          }
          
          return { widgets: widgetsCopy };
        }),

      addWidget: (widget) =>
        set((state) => {
          const contextWidgets = state.widgets.filter(w => w.context === widget.context);
          const maxOrder = Math.max(...contextWidgets.map(w => w.order ?? 0), -1);
          return {
            widgets: [...state.widgets, { ...widget, visible: true, order: maxOrder + 1 }],
          };
        }),

      removeWidget: (id) =>
        set((state) => {
          const widget = state.widgets.find(w => w.id === id);
          if (!widget) return state;

          const contextWidgets = state.widgets.filter(w => w.context === widget.context);
          const newWidgets = state.widgets.filter(w => w.id !== id);

          const updatedWidgets = newWidgets.map(w => {
            if (w.context === widget.context) {
              const newOrder = contextWidgets.findIndex(cw => cw.id === w.id);
              return { ...w, order: newOrder >= 0 ? newOrder : w.order };
            }
            return w;
          });

          return { widgets: updatedWidgets };
        }),

      reorderWidgets: (startIndex, endIndex) =>
        set((state) => {
          const currentContext = state.currentContext;
          const contextWidgets = [...state.widgets.filter(w => w.context === currentContext)];

          if (contextWidgets[startIndex]?.pinned) {
            return state;
          }

          const [movedWidget] = contextWidgets.splice(startIndex, 1);
          contextWidgets.splice(endIndex, 0, movedWidget);

          const updatedWidgets = state.widgets.map(widget => {
            if (widget.context !== currentContext) return widget;
            const contextIndex = contextWidgets.findIndex(w => w.id === widget.id);
            return contextIndex >= 0 ? { ...widget, order: contextIndex } : widget;
          });

          return { widgets: updatedWidgets };
        }),

      updateWidgetOrder: (widgets) =>
        set((state) => ({
          widgets: state.widgets.map(w => {
            const updatedWidget = widgets.find(uw => uw.id === w.id);
            return updatedWidget ? { ...w, order: updatedWidget.order } : w;
          }),
        })),
      toggleCollapsed: (id) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, collapsed: !w.collapsed } : w
          ),
        })),

      togglePinned: (id) =>
        set((state) => {
          console.log(`[useWidgetStore] Toggle pinned for widget ${id}`);
          
          // Trouver le widget en question
          const widgetIndex = state.widgets.findIndex(w => w.id === id);
          if (widgetIndex < 0) {
            console.warn(`[useWidgetStore] Widget ${id} not found for toggle pinned`);
            return state;
          }
          
          // Créer une copie complète pour éviter les mutations directes
          const widgetsCopy = [...state.widgets];
          const widget = {...widgetsCopy[widgetIndex]};
          
          // Inverser l'état épinglé
          widget.pinned = !widget.pinned;
          widgetsCopy[widgetIndex] = widget;
          
          // Quand on épingle, déplacer vers le haut
          // Quand on désépingle, déplacer après les widgets épinglés
          const allWidgets = [...widgetsCopy];
          
          // Trier les widgets avec les épinglés en premier
          allWidgets.sort((a, b) => {
            if (a.pinned === b.pinned) {
              // Si les deux sont épinglés ou les deux sont désépinglés, trier par ordre
              return (a.order || 0) - (b.order || 0);
            }
            // Les épinglés doivent venir en premier
            return a.pinned ? -1 : 1;
          });
          
          // Mettre à jour les ordres
          const finalWidgets = allWidgets.map((w, index) => ({
            ...w,
            order: index
          }));
          
          // Déclencher un événement personnalisé pour signaler que le widget a été épinglé/désépinglé
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('widget-pin-changed', { 
              detail: { widgetId: id, pinned: widget.pinned }
            }));
          }

          return { widgets: finalWidgets };
        }),

      toggleWidgetVisibility: (id) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, visible: !w.visible } : w
          ),
        })),

      updateWidgetPosition: (id, position) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, position } : w
          ),
        })),

      updateWidgetSize: (id, size) => {
        console.log(`[useWidgetStore] Updating widget size for ${id}: ${JSON.stringify(size)}`);
        
        // Structure des tailles standardisées pour tous les widgets
        // Format: vertical x horizontal (premier chiffre = lignes, second = colonnes)
        const standardSizes: Record<string, { width: number, height: number, displaySize: WidgetSize }> = {
          '1x1': { width: 1, height: 1, displaySize: 'small' },   // 1 vertical × 1 horizontal
          '1x2': { width: 1, height: 2, displaySize: 'medium' },  // 1 vertical × 2 horizontal
          '1x3': { width: 1, height: 3, displaySize: 'wide' },    // 1 vertical × 3 horizontal
          '1x4': { width: 1, height: 4, displaySize: 'wide' },    // 1 vertical × 4 horizontal
          '2x1': { width: 2, height: 1, displaySize: 'medium' },  // 2 vertical × 1 horizontal
          '2x2': { width: 2, height: 2, displaySize: 'large' },   // 2 vertical × 2 horizontal
          '2x3': { width: 2, height: 3, displaySize: 'large' },   // 2 vertical × 3 horizontal
          '2x4': { width: 2, height: 4, displaySize: 'x-large' }, // 2 vertical × 4 horizontal
          '3x1': { width: 3, height: 1, displaySize: 'large' },   // 3 vertical × 1 horizontal
          '3x2': { width: 3, height: 2, displaySize: 'large' },   // 3 vertical × 2 horizontal
          '3x3': { width: 3, height: 3, displaySize: 'x-large' }, // 3 vertical × 3 horizontal
          '3x4': { width: 3, height: 4, displaySize: 'x-large' }  // 3 vertical × 4 horizontal
        };
        
        // Recherche du widget dans le state
        const widgetToUpdate = get().widgets.find(w => w.id === id);
        
        if (!widgetToUpdate) {
          console.error(`[useWidgetStore] Widget with id ${id} not found`);
          return;
        }
        
        console.log(`[useWidgetStore] Current widget size: ${JSON.stringify(widgetToUpdate.size)}, display size: ${widgetToUpdate.displaySize}`);
        
        // Restrictions par type de widget - adaptées pour section-title
        const restrictedWidgets = {
          'section-title': ['1x4'] // Seuls formats autorisés pour les titres de section (1 ligne x 4 colonnes)
        };
        
        // Récupérer la liste des formats autorisés pour ce type de widget
        const widgetType = widgetToUpdate.type;
        const allowedFormats = restrictedWidgets[widgetType as keyof typeof restrictedWidgets];
        
        // Vérifier si le widget a des restrictions spécifiques
        let finalSize = { ...size };
        let sizeKey = `${size.width}x${size.height}`;
        
        if (allowedFormats) {
          // Si le format demandé n'est pas dans la liste des formats autorisés,
          // utiliser le premier format autorisé
          if (!allowedFormats.includes(sizeKey)) {
            const defaultFormat = allowedFormats[0];
            const [width, height] = defaultFormat.split('x').map(Number);
            finalSize = { width, height };
            sizeKey = defaultFormat;
            console.warn(`[useWidgetStore] Size ${size.width}x${size.height} not allowed for widget type ${widgetType}. Using ${defaultFormat}`);
          }
        } else {
          // Pour les widgets sans restrictions spécifiques
          // Limiter aux dimensions maximales 3 vertical x 4 horizontal
          if (size.width > 3) finalSize.width = 3;
          if (size.height > 4) finalSize.height = 4;
          
          // Recalculer la clé de taille après les ajustements
          sizeKey = `${finalSize.width}x${finalSize.height}`;
          
          // Vérifier que la taille est standardisée, sinon utiliser 1x1
          if (!standardSizes[sizeKey]) {
            finalSize = { width: 1, height: 1 };
            sizeKey = '1x1';
            console.warn(`[useWidgetStore] Non-standard size ${size.width}x${size.height}. Using 1x1 as fallback.`);
          }
        }
        
        // Récupérer la taille d'affichage correspondante
        const displaySize = standardSizes[sizeKey]?.displaySize || 'small';
        
        console.log(`[useWidgetStore] Final calculated size: ${sizeKey}, displaySize: ${displaySize}`);
        
        // Créer une copie immutable du state
        const updatedWidgets = [...get().widgets];
        const widgetIndex = updatedWidgets.findIndex(w => w.id === id);
        
        if (widgetIndex !== -1) {
          // Mettre à jour le widget avec sa nouvelle taille
          const updatedWidget = {
            ...updatedWidgets[widgetIndex],
            size: finalSize,
            displaySize: displaySize
          };
          
          updatedWidgets[widgetIndex] = updatedWidget;
          
          console.log(`[useWidgetStore] Widget updated:`, updatedWidget);
        
          // Appliquer la mise à jour
          set({ widgets: updatedWidgets });
          
          // Sauvegarder la configuration mise à jour
          try {
            localStorage.setItem(WIDGET_STORE_KEY, JSON.stringify({
              widgets: updatedWidgets,
              currentContext: get().currentContext
            }));
            console.log(`[useWidgetStore] Configuration saved to localStorage`);
          } catch (error) {
            console.error('[useWidgetStore] Failed to save updated configuration to localStorage', error);
          }
          
          // Valeurs inversées pour la grille CSS : width devient vertical (rows), height devient horizontal (cols)
          const gridRows = finalSize.width;
          const gridCols = finalSize.height;
          
          // Diffuser l'événement de mise à jour de la taille avec les valeurs inversées pour la grille CSS
          console.log(`[useWidgetStore] Dispatching widget-size-changed event`);
          window.dispatchEvent(new CustomEvent('widget-size-changed', {
            detail: {
              widgetId: id,
              width: finalSize.width,
              height: finalSize.height,
              gridRows, // lignes verticales
              gridCols, // colonnes horizontales
              displaySize,
              previousWidth: widgetToUpdate.size?.width || 1,
              previousHeight: widgetToUpdate.size?.height || 1
            }
          }));
          
          // Émettons aussi un événement spécifique pour le débogage
          window.dispatchEvent(new CustomEvent('widget-resize-explicit', {
            detail: {
              widgetId: id,
              newSize: finalSize,
              newDisplaySize: displaySize,
              gridRows,
              gridCols
            }
          }));
          
          console.log(`[useWidgetStore] Size updated for widget ${id}: ${finalSize.width}x${finalSize.height} (${displaySize})`);
        }
      },

      updateWidgetDisplaySize: (id, displaySize) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, displaySize } : w
          ),
        })),

      updateWidgetImportance: (id, importance) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, importance } : w
          ),
        })),

      updateWidgetColors: (id, colors) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, colors } : w
          ),
        })),

      updateWidgetTitle: (id, title) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, title } : w
          ),
        })),

      createDefaultLayout: () => {
        set(state => {
          const defaultWidgets: Widget[] = [];
          let orderCounter = 0;

          // Ajouter les widgets existants
            defaultWidgets.push({
            id: `property-comparison-${Date.now()}`,
            type: 'property-comparison',
            title: 'Comparaison des Propriétés',
            category: 'propriétés',
            context: 'dashboard',
              position: { x: 0, y: 0 },
            size: { width: 2, height: 2 },
              displaySize: 'wide',
              order: orderCounter++,
              importance: 'important',
              pinned: false,
              visible: true
            });

          defaultWidgets.push({
            id: `cashflow-sankey-${Date.now()}`,
            type: 'cashflow-sankey',
            title: 'Flux Financiers',
            category: 'finance',
            context: 'dashboard',
            position: { x: 0, y: 0 },
            size: { width: 3, height: 2 },
            displaySize: 'wide',
            order: orderCounter++,
            importance: 'important',
            pinned: false,
            visible: true
          });
            
            defaultWidgets.push({
            id: `predictive-analytics-${Date.now()}`,
            type: 'predictive-analytics',
            title: 'Prédictions IA',
            category: 'predictive',
            context: 'dashboard',
              position: { x: 0, y: 0 },
            size: { width: 2, height: 2 },
            displaySize: 'wide',
              order: orderCounter++,
            importance: 'important',
              pinned: false,
              visible: true
            });

          return { widgets: defaultWidgets };
        });
      },
    }),
    {
      name: 'dashboard-widgets',
      version: 1,
    }
  )
);