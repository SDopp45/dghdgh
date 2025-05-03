import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { useWidgetStore } from "@/lib/stores/useWidgetStore";
import { motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import { 
  LayoutDashboard, BarChart2, LineChart, PieChart, 
  ListChecks, Calendar, Building2, Users, 
  Activity, Gauge, CreditCard, Layers, FileText,
  Laptop, Brain, Database, Sparkles, Map, BrainCircuit,
  Table2, Radar, DollarSign, AlertCircle, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface WidgetMenuProps {
  children: React.ReactNode;
}

interface WidgetType {
  id: string;
  name: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  category: "analyse" | "finance" | "propriétés" | "locataires" | "maintenance" | "predictive" | "autre" | "custom" | "activity" | "monitoring";
  aiPowered?: boolean;
}

const widgetTypes: WidgetType[] = [
  // Widgets d'analyse
  { 
    id: "property-comparison", 
    name: "Comparaison des Propriétés", 
    description: "Tableau comparatif des propriétés",
    icon: Table2,
    category: "propriétés"
  },
  { 
    id: "cashflow-sankey", 
    name: "Flux Financiers (Sankey)", 
    description: "Visualisation des flux financiers",
    icon: FileText,
    category: "finance",
    aiPowered: true
  },
  { 
    id: "predictive-analytics", 
    name: "Prédictions IA", 
    description: "Analyse prédictive des tendances du marché",
    icon: BrainCircuit,
    category: "predictive",
    aiPowered: true
  }
];

// Mapping des catégories du frontend vers les catégories du backend
// Les catégories backend acceptées sont: 'general' | 'finance' | 'rental' | 'maintenance' | 'activity' | 'monitoring' | 'predictive' | 'propriétés'
const categoryMapping: Record<string, 'general' | 'finance' | 'rental' | 'maintenance' | 'activity' | 'monitoring' | 'predictive' | 'propriétés'> = {
  "propriétés": "propriétés",
  "finance": "finance",
  "predictive": "predictive"
};

const categories = {
  "propriétés": { name: "Propriétés", icon: Building2 },
  "finance": { name: "Finance", icon: CreditCard },
  "predictive": { name: "Prédictif", icon: BrainCircuit }
};

// Composant d'alerte simple pour remplacer toast
const SimpleAlert = ({ message, variant = "default", onClose }: { message: string, variant?: "default" | "destructive", onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-md p-4 shadow-md ${
      variant === "destructive" ? "bg-red-500 text-white" : "bg-green-500 text-white"
    }`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 rounded-full p-0.5 hover:bg-white/20">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export function WidgetMenu({ children }: WidgetMenuProps) {
  const addWidget = useWidgetStore((state) => state.addWidget);
  const widgets = useWidgetStore((state) => state.widgets);
  const [isOpen, setIsOpen] = useState(false);
  const [alert, setAlert] = useState<{ message: string, variant: "default" | "destructive" } | null>(null);
  
  // Fonction pour vérifier si un type de widget est déjà utilisé dans le tableau de bord
  const isWidgetTypeUsed = React.useCallback((type: string) => {
    return widgets.some(widget => widget.type === type && widget.visible !== false);
  }, [widgets]);

  // Tous les widgets sont désormais uniques (on ne peut pas les ajouter plusieurs fois)
  const handleAddWidget = (type: string) => {
    // Vérifier si le widget est déjà présent sur le tableau de bord
    if (isWidgetTypeUsed(type)) {
      setAlert({
        message: `Le widget "${widgetTypes.find(w => w.id === type)?.name}" est déjà présent sur votre tableau de bord.`,
        variant: "destructive"
      });
      return;
    }

    const title = widgetTypes.find(w => w.id === type)?.name || "Widget";
    const frontendCategory = widgetTypes.find(w => w.id === type)?.category || "autre";
    const storeCategory = categoryMapping[frontendCategory];
    
    // Définir les tailles spécifiques pour certains widgets
    let width = type === 'section-title' ? 3 : 1;
    let height = 1;
    
    // Attribuer des tailles spécifiques à certains widgets
    if (type === 'visits-widget' || type === 'property-comparison') {
      width = 3;
      height = 2;
    }
    
    addWidget({
      id: `widget-${Date.now()}`,
      type,
      title,
      category: storeCategory,
      context: "dashboard",
      position: { x: 0, y: 0 },
      order: widgets.length,
      size: { width, height },
      visible: true,
      importance: "normal"
    });
    
    setAlert({
      message: `Le widget "${title}" a été ajouté à votre tableau de bord.`,
      variant: "default"
    });
    
    setIsOpen(false);
  };

  return (
    <>
      {alert && (
        <SimpleAlert 
          message={alert.message} 
          variant={alert.variant} 
          onClose={() => setAlert(null)} 
        />
      )}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-72 bg-gradient-to-br from-background/95 to-background/90 backdrop-blur-md border border-cyan-500/20"
        >
          <DropdownMenuLabel className="flex items-center gap-2 py-4">
            <Sparkles className="h-4 w-4 text-cyan-500" />
            <span className="bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent font-semibold">
              Ajouter un widget
            </span>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator className="bg-cyan-500/20" />
          
          {Object.entries(categories).map(([categoryKey, categoryData]) => (
            <DropdownMenuSub key={categoryKey}>
              <DropdownMenuSubTrigger className="flex items-center gap-2 group">
                <categoryData.icon className="h-4 w-4 text-muted-foreground group-hover:text-cyan-500 transition-colors" />
                <span>{categoryData.name}</span>
                {categoryKey === "analyse" && (
                  <div className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20">
                    <Brain className="h-3 w-3 text-cyan-500" />
                  </div>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent 
                  className="w-80 bg-gradient-to-br from-background/95 to-background/90 backdrop-blur-md border border-cyan-500/20"
                >
                  <DropdownMenuGroup>
                    {widgetTypes
                      .filter(widget => widget.category === categoryKey)
                      .map(widget => {
                        // Vérifier si le widget est unique et déjà utilisé
                        const isUsed = isWidgetTypeUsed(widget.id);
                        
                        return (
                          <DropdownMenuItem 
                            key={widget.id}
                            onClick={() => handleAddWidget(widget.id)}
                            className={cn(
                              "flex items-start gap-3 py-3 px-3 cursor-pointer group relative",
                              isUsed ? "opacity-40 hover:bg-transparent pointer-events-none" : "hover:bg-cyan-500/10"
                            )}
                            disabled={isUsed}
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              <motion.div 
                                className={cn(
                                  "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                                  isUsed ? "bg-gray-500/10" : "bg-cyan-500/10 group-hover:bg-cyan-500/20"
                                )}
                                whileHover={{ scale: isUsed ? 1 : 1.05 }}
                              >
                                <widget.icon className={isUsed ? "h-5 w-5 text-gray-500" : "h-5 w-5 text-cyan-500"} />
                              </motion.div>
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center">
                                <span className="font-medium">{widget.name}</span>
                                {widget.aiPowered && (
                                  <div className={cn(
                                    "ml-2 flex h-5 w-5 items-center justify-center rounded-full",
                                    isUsed ? "bg-gray-500/20" : "bg-cyan-500/20"
                                  )}>
                                    <Brain className={isUsed ? "h-3 w-3 text-gray-500" : "h-3 w-3 text-cyan-500"} />
                                  </div>
                                )}
                                {isUsed && (
                                  <div className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-500/20 text-gray-500">
                                    Déjà ajouté
                                  </div>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {widget.description}
                              </span>
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                  </DropdownMenuGroup>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}