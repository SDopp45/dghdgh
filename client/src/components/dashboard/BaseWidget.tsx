import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical, GripHorizontal, Pin, Maximize2, Minimize2, MoveHorizontal, LayoutGrid, MoveVertical, Maximize, Layers, Grid2X2, X, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { useWidgetStore, type WidgetId, type Size, type WidgetSize } from "@/lib/stores/useWidgetStore";
import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface BaseWidgetProps {
  widget: {
    id: WidgetId;
    title: string;
    type: string;
    pinned?: boolean;
    size?: Size;
    variant?: string;
    icon?: React.FC<{ className?: string }>;
    badge?: string;
    padding?: string;
    colors?: {
      primary?: string;
      background?: string;
      text?: string;
    };
  };
  onRemove?: () => void;
  children: React.ReactNode;
  dragHandleProps?: DraggableProvidedDragHandleProps;
  isFullscreen?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

// Liste standardisée de toutes les tailles possibles avec leurs dimensions visuelles
// Format: [colonnes horizontales]×[lignes verticales]
const allSizes = [
  { width: 1, height: 1, label: '1×1' }, // 1 colonne × 1 ligne
  { width: 2, height: 1, label: '2×1' }, // 2 colonnes × 1 ligne
  { width: 3, height: 1, label: '3×1' }, // 3 colonnes × 1 ligne
  { width: 4, height: 1, label: '4×1' }, // 4 colonnes × 1 ligne
  { width: 1, height: 2, label: '1×2' }, // 1 colonne × 2 lignes
  { width: 2, height: 2, label: '2×2' }, // 2 colonnes × 2 lignes
  { width: 3, height: 2, label: '3×2' }, // 3 colonnes × 2 lignes
  { width: 4, height: 2, label: '4×2' }, // 4 colonnes × 2 lignes
  { width: 1, height: 3, label: '1×3' }, // 1 colonne × 3 lignes
  { width: 2, height: 3, label: '2×3' }, // 2 colonnes × 3 lignes
  { width: 3, height: 3, label: '3×3' }, // 3 colonnes × 3 lignes
  { width: 4, height: 3, label: '4×3' }  // 4 colonnes × 3 lignes
];

// Définir les tailles compatibles pour chaque type de widget
const compatibleSizes: Record<string, Array<{ width: number, height: number, label: string }>> = {
  // Widget séparateur de section: uniquement en format 4×1
  'section-title': [
    { width: 4, height: 1, label: '4×1' }
  ],
  
  // Par défaut, tous les widgets supportent toutes les tailles
  'default': allSizes,
};

// Fonction pour obtenir les tailles compatibles pour un type de widget
function getAllCompatibleSizes(widgetType: string) {
  if (widgetType === 'section-title') {
    return compatibleSizes['section-title'];
  }
  return allSizes; // Tous les widgets ont accès à toutes les tailles
}

// Types de widgets qui doivent utiliser la configuration par défaut
const defaultWidgetTypes = [
  'stats', 'revenue-chart', 'expense-breakdown', 'occupancy', 
  'tenant-status', 'recent-activity', 'property-comparison',
  'alerts', 'maintenance', 'iot-devices', 'predictive-analytics',
  'property-insights', 'rental-performance', 'visits-calendar',
  'visits-widget', 'performance-analytics', 'cashflow-sankey',
  'portfolio-radar', 'performance-metrics', 'maintenance-costs',
  'property-comparison-table', 'cashflow-sankey-diagram',
  'portfolio-radar-chart', 'flux-financiers', 'flux-financiers-sankey',
  'performance-metrics', 'expense-breakdown', 'revenue-chart',
  'occupancy', 'tenant-status', 'maintenance', 'maintenance-costs',
  'recent-activity', 'alerts', 'iot-devices', 'property-comparison-table',
  'portfolio-radar-chart', 'cashflow-sankey-diagram', 'predictive-analytics',
  'property-insights', 'rental-performance', 'visits-calendar', 'visits-widget'
];

// Plus besoin d'attribuer les tailles car nous utilisons getAllCompatibleSizes
// Suppression de la boucle d'attribution

export function BaseWidget({ 
  widget, 
  onRemove, 
  children, 
  dragHandleProps,
  isFullscreen = false,
  onFullscreenChange
}: BaseWidgetProps) {
  const { updateWidgetSize, togglePinned } = useWidgetStore();
  const [showSizeOptions, setShowSizeOptions] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Déterminer les tailles disponibles pour ce type de widget
  const availableSizes = useMemo(() => {
    return getAllCompatibleSizes(widget.type);
  }, [widget.type]);

  // Dimension actuelle pour l'interface utilisateur
  const currentDimension = useMemo(() => {
    const width = widget.size?.width || 1;
    const height = widget.size?.height || 1;
    return `${width}×${height}`;
  }, [widget.size?.width, widget.size?.height]);

  // Fonction pour rendre les options de redimensionnement
  const renderResizeOptions = () => {
    return (
      <div className="grid grid-cols-3 gap-1.5 p-0.5">
        {availableSizes.map((size, index) => (
          <Button 
            key={index}
            variant="outline" 
            size="sm" 
            className="relative px-2 py-1 h-auto text-xs font-medium bg-background hover:bg-accent hover:text-accent-foreground"
            onClick={() => handleSizeChange(size.width, size.height)}
          >
            {size.label}
          </Button>
        ))}
      </div>
    );
  };

  // Gestion du changement de taille du widget
  const handleSizeChange = (width: number, height: number) => {
    // Si la taille n'a pas changé, ne rien faire
    if (widget.size?.width === width && widget.size?.height === height) {
      setShowSizeOptions(false);
      return;
    }
    
    console.log(`[BaseWidget] Changing widget size ${widget.id} (${widget.title}) from ${widget.size?.width}x${widget.size?.height} to ${width}x${height}`);
    
    // Mettre à jour la taille dans le store
    updateWidgetSize(widget.id, { width, height });
    
    // Fermer le menu après un court délai
    setTimeout(() => {
      setShowSizeOptions(false);
    }, 100);
    
    // Forcer une mise à jour explicite du DOM des widgets
    setTimeout(() => {
      // Trouver l'élément DOM du widget
      const widgetElement = document.querySelector(`[data-widget-id="${widget.id}"]`);
      const gridElement = document.querySelector('.dashboard-grid') as HTMLElement;
      
      if (widgetElement && gridElement) {
        console.log('[BaseWidget] Current classes before update:', Array.from(widgetElement.classList));
        
        // 1. Supprimer toutes les classes de taille existantes
        widgetElement.classList.forEach(className => {
          if (className.startsWith('size-') || className.startsWith('col-span-') || className.startsWith('row-span-')) {
            console.log(`[BaseWidget] Removing class: ${className}`);
            widgetElement.classList.remove(className);
          }
        });
        
        // 2. Ajouter les nouvelles classes dans l'ordre correct
        const sizeClass = `size-${width}x${height}`;
        const colSpanClass = `col-span-${width}`;
        const rowSpanClass = `row-span-${height}`;
        
        console.log(`[BaseWidget] Adding classes:`, {
          sizeClass,
          colSpanClass,
          rowSpanClass
        });
        
        widgetElement.classList.add(sizeClass);
        widgetElement.classList.add(colSpanClass);
        widgetElement.classList.add(rowSpanClass);
        
        // 3. Mettre à jour les attributs data
        widgetElement.setAttribute('data-widget-size', `${width}x${height}`);
        widgetElement.setAttribute('data-width', String(width));
        widgetElement.setAttribute('data-height', String(height));
        
        // 4. Forcer un recalcul du layout de la grille
        gridElement.style.gridTemplateColumns = 'none';
        gridElement.offsetHeight; // Force reflow
        gridElement.style.gridTemplateColumns = '';
        
        // 5. Ajouter une classe temporaire pour l'animation
        gridElement.classList.add('grid-updating');
        
        // 6. Déclencher un événement personnalisé pour la mise à jour
        window.dispatchEvent(new CustomEvent('widget-size-changed', {
          detail: {
            widgetId: widget.id,
            oldSize: widget.size,
            newSize: { width, height }
          }
        }));
        
        // 7. Nettoyer après l'animation
        setTimeout(() => {
          gridElement.classList.remove('grid-updating');
          window.dispatchEvent(new Event('resize'));
        }, 300);
        
        console.log(`[BaseWidget] Updated classes:`, Array.from(widgetElement.classList));
      }
    }, 150);
  };

  // Gestion de l'épinglage
  const handleTogglePin = () => {
    togglePinned(widget.id);
  };

  // Gestion du plein écran
  const handleToggleFullscreen = () => {
    const newState = !isFullscreen;
    onFullscreenChange?.(newState);
  };
  
  // Gestion de la suppression du widget
  const handleRemove = () => {
    setShowOptions(false);
    onRemove?.();
  };

  return (
    <motion.div
      id={`widget-${widget.id}`}
      layout
      initial={{ opacity: 0.9, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "widget-card",
        widget.pinned && "pinned",
        isFullscreen && "fullscreen"
      )}
      style={{
        ...(widget.colors && {
          borderColor: widget.colors.primary,
          backgroundColor: widget.colors.background,
          color: widget.colors.text
        })
      }}
    >
      {/* En-tête du widget */}
      <div className="widget-card-header">
        <div className="flex items-center gap-2 overflow-hidden">
          {widget.icon && <widget.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          
          <h3 className="widget-card-title">
            {widget.title}
          </h3>
          
          {widget.badge && (
            <Badge variant="outline" className="ml-auto text-[0.65rem] px-1 h-5">
              {widget.badge}
            </Badge>
          )}
          
          {/* Indicateur de dimensions actuelles */}
          <Badge variant="secondary" className="ml-auto h-4 px-1 text-[0.6rem]">
            {currentDimension}
          </Badge>
        </div>
        
        {/* Contrôles du widget */}
        <div className="widget-controls">
          {/* Bouton d'épinglage */}
          <button
            className={cn("widget-control-button", widget.pinned && "active")}
            onClick={handleTogglePin}
            title={widget.pinned ? "Désépingler" : "Épingler"}
          >
            <Pin className={cn("h-3.5 w-3.5", widget.pinned && "fill-current")} />
          </button>
          
          {/* Menu de redimensionnement */}
          <DropdownMenu open={showSizeOptions} onOpenChange={setShowSizeOptions}>
            <DropdownMenuTrigger asChild>
              <button 
                className="widget-control-button"
                title="Redimensionner"
              >
                <Grid2X2 className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="p-2 w-auto bg-background border border-border">
              {renderResizeOptions()}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Bouton plein écran */}
          <button
            className="widget-control-button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
          
          {/* Menu d'options */}
          <DropdownMenu open={showOptions} onOpenChange={setShowOptions}>
            <DropdownMenuTrigger asChild>
              <button className="widget-control-button">
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              <DropdownMenuLabel className="text-xs">Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleRemove} className="text-destructive">
                <X className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Poignée de déplacement */}
      {dragHandleProps && (
        <div 
          {...dragHandleProps} 
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 bg-background border border-border rounded-full grid place-items-center cursor-grab opacity-0 group-hover:opacity-90 transition-opacity"
        >
          <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
      
      {/* Contenu du widget */}
      <div className={cn(
        "widget-card-content",
        widget.padding,
        isFullscreen && "max-h-[calc(100vh-var(--grid-widget-header))]"
      )}>
        {children}
      </div>
    </motion.div>
  );
}