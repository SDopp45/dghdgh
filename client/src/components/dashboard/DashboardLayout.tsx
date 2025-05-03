import { useQuery } from "@tanstack/react-query";
import { BaseWidget } from "./BaseWidget";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { motion, AnimatePresence, type HTMLMotionProps, useMotionValue, useTransform } from "framer-motion";
import { useWidgetStore, type Widget, type WidgetId, type Size } from "@/lib/stores/useWidgetStore";
import { useState, forwardRef, useRef, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Grid3X3, Grid2X2, LayoutGrid, LayoutList, Maximize, Hexagon, Sliders, Star, Zap, Search, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import React from 'react';
import { PropertyComparisonWidget } from "./widgets/PropertyComparisonWidget";
import { CashflowSankeyWidget } from "./widgets/CashflowSankeyWidget";
import { PredictiveAnalyticsWidget } from "./widgets/PredictiveAnalyticsWidget";
import { DashboardWidgetScroller } from "./widgets/DashboardWidgetScroller";

// Types des widgets
interface WidgetProps {
  widget: Widget;
  onClose?: () => void;
  onPin?: () => void;
  onResize?: (size: Size) => void;
  onFullscreen?: () => void;
}

// Mapping des types de widgets vers leurs composants
const widgetComponents: Record<string, React.ComponentType<{ widget: Widget }>> = {
  "property-comparison": PropertyComparisonWidget,
  "cashflow-sankey": CashflowSankeyWidget,
  "predictive-analytics": PredictiveAnalyticsWidget
};

// Composant de rendu des widgets
const WidgetRenderer: React.FC<WidgetProps> = ({ widget, ...props }) => {
  const Component = widgetComponents[widget.type];
  if (!Component) {
    return <FallbackWidget widget={widget} {...props} />;
  }
  return <Component widget={widget} {...props} />;
};

type GridType = 'standard' | 'compact' | 'masonry' | 'list';

const gridConfig = {
  standard: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
  compact: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
  masonry: "columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6",
  list: "grid-cols-1 gap-4"
};

const getWidgetSpan = (widget: Widget, gridType: GridType) => {
  if (gridType === 'list') return 'col-span-1';
  if (gridType === 'masonry') return '';
  
  const width = widget.size?.width || 1;
  return 'col-span-1';
};

interface DraggableWidgetProps {
  widget: Widget;
  index: number;
  children: React.ReactNode;
  draggedWidgetId?: string | null;
  isFullscreen?: boolean;
  gridType: GridType;
  intensity: number;
}

const DraggableWidget = forwardRef<HTMLDivElement, DraggableWidgetProps>(
  ({ widget, index, children, draggedWidgetId, isFullscreen, gridType, intensity }, ref) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-100, 100], [intensity, -intensity]);
    const rotateY = useTransform(x, [-100, 100], [-intensity, intensity]);
    
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isFullscreen || widget.pinned) return;
      
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      x.set(e.clientX - centerX);
      y.set(e.clientY - centerY);
    };
    
    const handleMouseLeave = () => {
      x.set(0);
      y.set(0);
    };
    
    return (
      <Draggable
        draggableId={widget.id}
        index={index}
        isDragDisabled={widget.pinned || isFullscreen}
      >
        {(provided, snapshot) => {
          const motionProps: HTMLMotionProps<"div"> = {
            initial: { 
              opacity: 0, 
              scale: 0.9,
              y: 10
            },
            animate: {
              opacity: 1,
              scale: snapshot.isDragging ? 1.03 : 1,
              rotate: snapshot.isDragging ? 1 : 0,
              y: 0,
              zIndex: snapshot.isDragging ? 50 : widget.pinned ? 10 : 1
            },
            exit: { 
              opacity: 0, 
              scale: 0.9,
              y: -10,
              transition: { duration: 0.2 }
            },
            transition: {
              type: "spring",
              stiffness: 300,
              damping: 30,
              delay: index * 0.03
            },
            style: {
              rotateX: isFullscreen || widget.pinned ? 0 : rotateX,
              rotateY: isFullscreen || widget.pinned ? 0 : rotateY,
              transformPerspective: 1200
            },
            className: cn(
              getWidgetSpan(widget, gridType),
              "transition-all duration-200 ease-in-out will-change-transform",
              snapshot.isDragging ? "shadow-2xl" : "",
              draggedWidgetId && draggedWidgetId !== widget.id ? "opacity-50" : "",
              gridType === 'masonry' ? "break-inside-avoid mb-6" : ""
            ),
            onMouseMove: handleMouseMove,
            onMouseLeave: handleMouseLeave
          };

          // Utilisez un div normal comme wrapper pour le drag-and-drop
          return (
            <div
              ref={(element) => {
                provided.innerRef(element);
                if (typeof ref === 'function') {
                  ref(element);
                } else if (ref) {
                  ref.current = element;
                }
              }}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className={motionProps.className}
            >
              <motion.div
                initial={motionProps.initial}
                animate={motionProps.animate}
                exit={motionProps.exit}
                transition={motionProps.transition}
                style={motionProps.style}
                onMouseMove={motionProps.onMouseMove}
                onMouseLeave={motionProps.onMouseLeave}
              >
                {children}
              </motion.div>
            </div>
          );
        }}
      </Draggable>
    );
  }
);

DraggableWidget.displayName = "DraggableWidget";

// Fonction pour calculer la position d'un widget dans la grille
const calculateWidgetGridPosition = (widget: Widget, index: number, isGridUpdating: boolean) => {
  const { width = 1, height = 1 } = widget.size || {};
  
  // Assurer que les dimensions sont des nombres valides
  const validWidth = Math.min(Math.max(1, width), 4);
  const validHeight = Math.min(Math.max(1, height), 3);
  
  // Classes de base pour le widget
  const baseClasses = [
    "widget-container",
    `size-${validWidth}x${validHeight}`,
    `col-span-${validWidth}`,
    `row-span-${validHeight}`,
    isGridUpdating && "grid-updating",
    widget.pinned && "pinned"
  ].filter(Boolean);

  return {
    className: cn(...baseClasses),
    style: {
      gridColumn: `span ${validWidth}`,
      gridRow: `span ${validHeight}`,
      order: widget.order || index,
      width: "100%",
      height: "100%",
      position: "relative",
      transition: "all 0.3s ease",
    },
    "data-widget-id": widget.id,
    "data-widget-type": widget.type,
    "data-width": validWidth,
    "data-height": validHeight,
    "data-size": `${validWidth}x${validHeight}`,
    "data-pinned": widget.pinned ? "true" : "false",
    key: widget.id,
  };
};

// Composant de fallback pour les widgets inconnus
const FallbackWidget: React.FC<{ widget: Widget }> = ({ widget }) => (
  <div className="p-4 text-center">
    <p>Widget type "{widget.type}" not found</p>
  </div>
);

// Fonction utilitaire pour mélanger un tableau
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export function DashboardLayout() {
  const { widgets, reorderWidgets, removeWidget, updateWidgetSize, updateWidgetOrder, createDefaultLayout } = useWidgetStore();
  const [fullscreenWidgetId, setFullscreenWidgetId] = useState<WidgetId | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [gridType, setGridType] = useState<GridType>("standard");
  const [currentCategory, setCurrentCategory] = useState<string>("all");
  const [effectIntensity, setEffectIntensity] = useState(2);
  const [dragModeEnabled, setDragModeEnabled] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [isGridUpdating, setIsGridUpdating] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [currentContext, setCurrentContext] = useState<string>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenWidget, setFullscreenWidget] = useState<Widget | null>(null);

  // Modifier la fonction de l'écouteur pour utiliser le state isGridUpdating
  useEffect(() => {
    // Écouteur pour l'événement widget-resize existant
    const handleWidgetResize = (event: Event) => {
      console.log('[DashboardLayout] Événement widget-resize détecté', 
        (event as CustomEvent)?.detail || {});
      
      // Incrémenter le compteur pour forcer un nouveau rendu
      setRenderKey(prev => prev + 1);
      
      // Forcer un redimensionnement de la fenêtre après un court délai
      // pour que les grilles CSS se réajustent
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('resize'));
      }, 100);
    };

    // Nouvel écouteur pour l'événement spécifique de changement de taille de widget
    const handleWidgetSizeChanged = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      console.log('[DashboardLayout] Événement widget-size-changed détecté', detail);
      
      if (detail?.widgetId) {
        // Forcer un rendu immédiat pour ce changement spécifique
        setRenderKey(prev => prev + 1);
        
        // Mettre à jour les styles de la grille
        const container = document.querySelector('.dashboard-grid');
        if (container) {
          // Forcer un reflow du conteneur
          container.classList.add('grid-updating');
          
          // Vérifier également si les classes des widgets sont correctement appliquées
          const widgetElement = document.querySelector(`[data-widget-id="${detail.widgetId}"]`);
          if (widgetElement) {
            const width = detail.width || 1;
            const height = detail.height || 1;
            console.log(`[DashboardLayout] Widget element found, checking classes: `, 
              Array.from(widgetElement.classList));
          }
          
          // Marquer la grille comme en cours de mise à jour
          setIsGridUpdating(true);
          
          // Désactiver la classe après un court délai pour permettre l'animation
          setTimeout(() => {
            container.classList.remove('grid-updating');
            setIsGridUpdating(false);
            
            // Forcer un redimensionnement de la fenêtre pour que les grilles CSS se réajustent
            window.dispatchEvent(new Event('resize'));
          }, 300);
        }
      }
    };

    // Écouter les événements
    window.addEventListener('widget-resize', handleWidgetResize);
    window.addEventListener('widget-size-changed', handleWidgetSizeChanged);
    
    return () => {
      window.removeEventListener('widget-resize', handleWidgetResize);
      window.removeEventListener('widget-size-changed', handleWidgetSizeChanged);
    };
  }, []);

  // Ajouter un gestionnaire pour les événements de redimensionnement
  useEffect(() => {
    const handleResize = () => {
      console.log('[DashboardLayout] Événement resize détecté');
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Gestionnaire d'erreur global pour le tableau de bord
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Dashboard error:", event.error);
      setError(event.error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Ajouter également un nouvel écouteur pour l'événement de débogage
  useEffect(() => {
    const handleDebugEvent = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      console.log('[DashboardLayout] Debug event received:', detail);
    };
    
    window.addEventListener('widget-resize-debug', handleDebugEvent);
    
    return () => {
      window.removeEventListener('widget-resize-debug', handleDebugEvent);
    };
  }, []);

  // Ajouter un écouteur pour forcer le rafraîchissement du layout
  useEffect(() => {
    const handleForceLayout = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      console.log('[DashboardLayout] Force layout event received:', detail);
      
      // Forcer le re-render immédiatement
      setRenderKey(prev => prev + 1);
      
      // Forcer le redimensionnement de la fenêtre pour mettre à jour la grille
      window.dispatchEvent(new Event('resize'));
    };
    
    window.addEventListener('widget-layout-force', handleForceLayout);
    
    return () => {
      window.removeEventListener('widget-layout-force', handleForceLayout);
    };
  }, []);

  // Ajouter un écouteur pour l'événement widget-resize-explicit
  useEffect(() => {
    const handleExplicitResizeEvent = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      console.log('[DashboardLayout] Explicit resize event received:', detail);
      
      if (detail?.widgetId) {
        // Force un re-render immédiat
        setRenderKey(prev => prev + 1);
        
        // Vérifier si l'élément DOM du widget existe
        const widgetElement = document.querySelector(`[data-widget-id="${detail.widgetId}"]`);
        if (widgetElement) {
          // Dans notre convention:
          // - width = colonnes horizontales (grid-column)
          // - height = lignes verticales (grid-row)
          const width = detail.newSize?.width || 1;
          const height = detail.newSize?.height || 1;
          
          console.log(`[DashboardLayout] Widget element found, updating classes for size ${width}x${height}`);
          
          // Application des classes de taille
          // Supprimer d'abord toutes les classes existantes liées à la taille
          widgetElement.classList.forEach(className => {
            if (className.startsWith('size-') || className.startsWith('col-span-') || className.startsWith('row-span-')) {
              widgetElement.classList.remove(className);
            }
          });
          
          // Ajouter les nouvelles classes avec la convention de taille
          widgetElement.classList.add(`size-${width}x${height}`);
          widgetElement.classList.add(`col-span-${width}`); // colonnes horizontales
          widgetElement.classList.add(`row-span-${height}`); // lignes verticales
          
          // Mettre à jour les attributs data
          widgetElement.setAttribute('data-widget-size', `${width}x${height}`);
          widgetElement.setAttribute('data-width', String(width));
          widgetElement.setAttribute('data-height', String(height));
          
          console.log(`[DashboardLayout] Updated classes:`, Array.from(widgetElement.classList));
        }
        
        // Forcer un redimensionnement de la fenêtre
        window.dispatchEvent(new Event('resize'));
      }
    };

    window.addEventListener('widget-resize-explicit', handleExplicitResizeEvent);
    
    return () => {
      window.removeEventListener('widget-resize-explicit', handleExplicitResizeEvent);
    };
  }, []);

  // Si une erreur survient, l'afficher de manière explicite
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-500/10 p-6 rounded-lg border border-red-500/30 max-w-2xl w-full">
          <h2 className="text-xl font-bold text-red-500 mb-2">Erreur du tableau de bord</h2>
          <p className="text-sm mb-4 text-muted-foreground">Le message d'erreur suivant a été détecté:</p>
          <pre className="bg-background/50 p-4 rounded overflow-auto text-xs max-h-40">
            {error.message}
            {"\n\n"}
            {error.stack}
          </pre>
          <Button 
            variant="destructive" 
            className="mt-4" 
            onClick={() => window.location.reload()}
          >
            Recharger la page
          </Button>
        </div>
      </div>
    );
  }

  // Extraire toutes les catégories uniques
  const categories = Array.from(new Set(widgets.map(w => w.category || "autre")));

  // Filtrer les widgets visibles
  const visibleWidgets = useMemo(() => (
    widgets
    .filter(widget => widget.visible !== false)
    .filter(widget => {
      // Filtrage par recherche
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return widget.title.toLowerCase().includes(query) || 
               widget.type.toLowerCase().includes(query) ||
               widget.category?.toLowerCase().includes(query);
      }
      return true;
    })
    .filter(widget => {
      // Filtrage par catégorie
      if (currentCategory === "all") return true;
      if (currentCategory === "pinned") return widget.pinned;
      return widget.category === currentCategory;
    })
    .sort((a, b) => {
      // Ordre de tri
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (a.order ?? 0) - (b.order ?? 0);
      })
  ), [widgets, searchQuery, currentCategory, renderKey]);

  // Pagination des widgets
  const paginatedWidgets = useMemo(() => {
    // Ne pas paginer en mode plein écran ou si la recherche est active
    if (fullscreenWidgetId || searchQuery) {
      return visibleWidgets;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    return visibleWidgets.slice(startIndex, startIndex + itemsPerPage);
  }, [visibleWidgets, currentPage, itemsPerPage, fullscreenWidgetId, searchQuery]);

  // Calculer le nombre total de pages
  const totalPages = useMemo(() => {
    return Math.ceil(visibleWidgets.length / itemsPerPage);
  }, [visibleWidgets, itemsPerPage]);

  // Gérer le changement de page
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Faire défiler vers le haut après changement de page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Réinitialiser la page lors du changement de catégorie
  useEffect(() => {
    setCurrentPage(1);
  }, [currentCategory, searchQuery]);

  // Vérifier si le dashboard est vide pour proposer le layout par défaut
  const isDashboardEmpty = useMemo(() => {
    return widgets.length === 0;
  }, [widgets]);

  // Créer un layout par défaut
  const handleCreateDefaultLayout = () => {
    createDefaultLayout();
    setCurrentPage(1);
  };

  const handleDragEnd = (result: any) => {
    setIsDragging(false);
    setDraggedWidgetId(null);
    
    console.log('[DashboardLayout] Drag ended with result:', result);

    if (!result.destination) {
      console.log('[DashboardLayout] No destination, drag cancelled');
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    console.log(`[DashboardLayout] Source index: ${sourceIndex}, Destination index: ${destinationIndex}`);

    if (sourceIndex === destinationIndex) {
      console.log('[DashboardLayout] Same position, no reordering needed');
      return;
    }

    const sourceWidget = paginatedWidgets[sourceIndex]; // Utiliser paginatedWidgets au lieu de visibleWidgets
    console.log('[DashboardLayout] Widget being moved:', sourceWidget);
    
    if (sourceWidget.pinned) {
      console.log('[DashboardLayout] Widget is pinned, cannot be moved');
      return;
    }

    console.log('[DashboardLayout] Reordering widgets');
    reorderWidgets(sourceIndex, destinationIndex);
    
    // Forcer un rafraîchissement de la grille après le réarrangement
    setTimeout(() => {
      console.log('[DashboardLayout] Forcing grid refresh after reordering');
      window.dispatchEvent(new CustomEvent('widget-layout-force', { 
        detail: { action: 'reorder', sourceIndex, destinationIndex } 
      }));
    }, 100);
  };
  
  // Effet de parallaxe au scroll - désactivé pour améliorer les performances
  const scrollParallaxEffect = (index: number) => {
    // Désactivé pour améliorer les performances
    return 0;
  };

  // Gestion du drag and drop
  const handleDragStart = (start: any) => {
    setIsDragging(true);
    setDraggedWidgetId(start.draggableId);
  };

  // Gestion de la suppression d'un widget
  const handleRemoveWidget = (widgetId: string) => {
    if (fullscreenWidgetId === widgetId) {
      setFullscreenWidgetId(null);
    }
    removeWidget(widgetId);
  };

  // Gestion du mode plein écran
  const handleFullscreenChange = (widgetId: string, isFullscreen: boolean) => {
    console.log(`Handling fullscreen change for widget ${widgetId}, isFullscreen: ${isFullscreen}`);
    
    if (isFullscreen) {
      setFullscreenWidgetId(widgetId);
      // Désactiver le drag-and-drop en mode plein écran
      if (dragModeEnabled) setDragModeEnabled(false);
    } else {
      setFullscreenWidgetId(null);
    }
    
    // Forcer un rafraîchissement du DOM
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  };

  // Fonction pour organiser aléatoirement les widgets
  const organizeWidgets = () => {
    setIsOrganizing(true);
    
    // Ajouter une classe au conteneur pour l'animation
    const gridContainer = document.querySelector('.dashboard-grid');
    if (gridContainer) {
      gridContainer.classList.add('organizing');
    }
    
    // Filtrer les widgets visibles
    const filteredWidgets = [...widgets].filter(w => w.visible !== false);
    
    // Séparer les widgets épinglés (qui resteront en haut)
    const pinnedWidgets = filteredWidgets.filter(w => w.pinned);
    const unpinnedWidgets = filteredWidgets.filter(w => !w.pinned);
    
    // Fonction utilitaire pour mélanger aléatoirement un tableau
    const shuffleArray = (array: any[]) => {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    };
    
    // Grouper les widgets par taille
    const widgetsBySize = {
      large: unpinnedWidgets.filter(w => (w.size?.width || 1) === 3 || (w.size?.height || 1) === 3),
      medium: unpinnedWidgets.filter(w => (w.size?.width || 1) === 2 || (w.size?.height || 1) === 2),
      small: unpinnedWidgets.filter(w => (w.size?.width || 1) === 1 && (w.size?.height || 1) === 1)
    };
    
    // Mélanger chaque groupe
    const shuffledLarge = shuffleArray(widgetsBySize.large);
    const shuffledMedium = shuffleArray(widgetsBySize.medium);
    const shuffledSmall = shuffleArray(widgetsBySize.small);
    
    // Créer une distribution optimale pour la grille
    // On veut éviter d'avoir des widgets de même taille adjacents
    const optimizedLayout: Widget[] = [];
    
    // Commencer par les widgets épinglés
    optimizedLayout.push(...pinnedWidgets);
    
    // Créer une disposition en grille intelligente
    // 1. D'abord placer quelques grands widgets comme points focaux
    if (shuffledLarge.length > 0) {
      // Ajouter un grand widget au début pour attirer l'attention
      optimizedLayout.push(shuffledLarge.shift()!);
    }
    
    // 2. Ajouter des widgets moyens qui créent une structure
    if (shuffledMedium.length >= 2) {
      // Ajouter deux widgets moyens côte à côte
      optimizedLayout.push(shuffledMedium.shift()!);
      optimizedLayout.push(shuffledMedium.shift()!);
    } else if (shuffledMedium.length === 1) {
      optimizedLayout.push(shuffledMedium.shift()!);
    }
    
    // 3. Ajouter une rangée de petits widgets pour la variété
    const smallGroup = shuffledSmall.splice(0, Math.min(4, shuffledSmall.length));
    optimizedLayout.push(...smallGroup);
    
    // 4. Continuer à alterner entre moyens, petits et grands pour une meilleure distribution
    while (shuffledLarge.length > 0 || shuffledMedium.length > 0 || shuffledSmall.length > 0) {
      // Ajouter un grand widget tous les X widgets pour équilibrer
      if (shuffledLarge.length > 0 && optimizedLayout.length % 5 === 0) {
        optimizedLayout.push(shuffledLarge.shift()!);
        continue;
      }
      
      // Ajouter 1-2 widgets moyens
      if (shuffledMedium.length > 0) {
        const count = Math.min(Math.floor(Math.random() * 2) + 1, shuffledMedium.length);
        optimizedLayout.push(...shuffledMedium.splice(0, count));
      }
      
      // Ajouter 1-4 petits widgets pour une meilleure répartition
      if (shuffledSmall.length > 0) {
        const count = Math.min(Math.floor(Math.random() * 4) + 1, shuffledSmall.length);
        optimizedLayout.push(...shuffledSmall.splice(0, count));
      }
    }
    
    // 5. Mise à jour intelligente de l'ordre des widgets
    const updatedWidgets = filteredWidgets.map((widget, index) => {
      // Trouver la position de ce widget dans notre layout optimisé
      const newPosition = optimizedLayout.findIndex(w => w.id === widget.id);
      
      return {
        ...widget,
        // Assigner un nouvel ordre basé sur la position dans notre layout optimisé
        // Mais conserver l'ordre des widgets qui n'étaient pas dans notre layout
        order: newPosition >= 0 ? newPosition : (widget.order || index + optimizedLayout.length)
      };
    });
    
    // Appliquer le nouvel ordre
    updateWidgetOrder(updatedWidgets);
    
    // Forcer un rafraîchissement de la grille
    setTimeout(() => {
      // Déclencher l'événement pour signaler que l'organisation est terminée
      window.dispatchEvent(new CustomEvent('widget-size-changed', { 
        detail: { reason: 'reorganize', count: updatedWidgets.length }
      }));
      
      // Forcer un rendu du composant
      setRenderKey(prev => prev + 1);
      
      // Déclencher un resize global pour réajuster la mise en page
      window.dispatchEvent(new Event('resize'));
      
      // Animation de succès
      setTimeout(() => {
        // Retirer la classe d'animation
        if (gridContainer) {
          gridContainer.classList.remove('organizing');
        }
        
        setIsOrganizing(false);
        
        // Notification de succès
        console.log(`Dashboard réorganisé intelligemment: ${updatedWidgets.length} widgets`);
      }, 700);
    }, 200);
  };

  // Fonction pour optimiser la disposition des widgets
  const optimizeWidgetLayout = () => {
    const contextWidgets = widgets.filter(w => w.context === currentContext);
    const pinnedWidgets = contextWidgets.filter(w => w.pinned);
    const unpinnedWidgets = contextWidgets.filter(w => !w.pinned);

    const largeWidgets = unpinnedWidgets.filter(w => w.size.width > 1);
    const mediumWidgets = unpinnedWidgets.filter(w => w.size.width === 1 && w.size.height > 1);
    const smallWidgets = unpinnedWidgets.filter(w => w.size.width === 1 && w.size.height === 1);

    const shuffledLarge = shuffleArray(largeWidgets);
    const shuffledMedium = shuffleArray(mediumWidgets);
    const shuffledSmall = shuffleArray(smallWidgets);

    const optimizedLayout = [
      ...pinnedWidgets,
      ...shuffledLarge,
      ...shuffledMedium,
      ...shuffledSmall
    ];

    // Mise à jour de l'ordre des widgets
    updateWidgetOrder(optimizedLayout.map((w, index) => ({
      ...w,
      order: index
    })));
  };

  return (
    <motion.div 
      className="relative min-h-screen w-full max-w-[100vw] overflow-x-hidden pb-20"
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Fond avec grille subtile de style crypto */}
      <div className="crypto-bg-grid"></div>

      {/* Overlay plein écran */}
      <AnimatePresence>
        {fullscreenWidgetId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            onClick={() => setFullscreenWidgetId(null)}
          />
        )}
      </AnimatePresence>

      <div className="container mx-auto p-6 space-y-6">
        {/* En-tête du tableau de bord */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
            <p className="text-muted-foreground">
              Gérez vos biens immobiliers et suivez leur performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
              <Settings2 className="h-4 w-4" />
            </Button>
            </div>
          </div>

        {/* Barre d'outils */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un widget..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-[300px]"
            />
            </div>
            <Tabs value={gridType} onValueChange={(value) => setGridType(value as GridType)}>
              <TabsList>
                <TabsTrigger value="standard">
                  <LayoutGrid className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="compact">
                  <LayoutGrid className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="masonry">
                  <LayoutList className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="list">
                  <LayoutList className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {visibleWidgets.length} widget{visibleWidgets.length > 1 ? "s" : ""}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleCreateDefaultLayout}>
              <Sparkles className="mr-2 h-4 w-4" />
              Layout par défaut
            </Button>
          </div>
        </div>

        {/* Navigation rapide */}
        <DashboardWidgetScroller className="w-full" />

        {/* Grille de widgets */}
          <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <Droppable droppableId="dashboard-widgets">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "dashboard-grid",
                  gridConfig[gridType],
                  isDragging && "isDragging"
                )}
              >
                <AnimatePresence>
                  {paginatedWidgets.map((widget, index) => (
                        <Draggable
                          key={widget.id}
                          draggableId={widget.id}
                          index={index}
                      isDragDisabled={widget.pinned}
                        >
                      {(provided, snapshot) => {
                        return (
                          <motion.div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                              style={{
                                ...provided.draggableProps.style,
                              gridColumn: `span ${widget.size.width}`,
                              gridRow: `span ${widget.size.height}`
                            }}
                            >
                            <WidgetRenderer
                                widget={widget}
                              onClose={() => handleRemoveWidget(widget.id)}
                              onPin={() => handleFullscreenChange(widget.id, true)}
                              onResize={(newSize) => updateWidgetSize(widget.id, newSize)}
                              onFullscreen={() => handleFullscreenChange(widget.id, true)}
                            />
                          </motion.div>
                        );
                      }}
                        </Draggable>
                  ))}
                </AnimatePresence>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
              <Button
              variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
              Précédent
              </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} sur {totalPages}
            </span>
                <Button
              variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
              Suivant
              </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Fonctions utilitaires pour une expérience personnalisée
function getGreeting() {
  // Simuler un nom d'utilisateur - remplacer par un vrai nom d'utilisateur dans une application réelle
  return "Jelle";
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 18) return "Evening";
  return "Evening";
}