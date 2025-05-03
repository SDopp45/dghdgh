import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wand2, ImagePlus, Type, Sparkles,
  Home, Camera, Plane, Mountain,
  Maximize2, Crop, Hotel, UtensilsCrossed,
  Flower2, Sun, Palette,
  Settings2, Focus, LineChart, Building, Cloud, BedDouble,
  Trees, Eraser, Sunset, MountainSnow, LayoutGrid, Ruler
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StyleSettingsDialog } from "./StyleSettingsDialog";
import { useToast } from "@/hooks/use-toast";

interface ImageEnhancementToolsProps {
  onEnhance: (type: string, style?: string, intensity?: number) => void;
  isProcessing: boolean;
  disabled: boolean;
}

interface EnhancementTool {
  id: string;
  label: string;
  icon: any;
  requiresAI: boolean;
  description?: string;
  shortcut?: string;
  styles?: Array<{ value: string; label: string; description?: string }>;
}

export function ImageEnhancementTools({ onEnhance, isProcessing, disabled }: ImageEnhancementToolsProps) {
  const [selectedTool, setSelectedTool] = useState<EnhancementTool | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentFocusIndex, setCurrentFocusIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState("realty"); // "realty" ou "general"
  const { toast } = useToast();

  const enhancementTools: EnhancementTool[] = [
    // Outils spécifiques pour l'immobilier
    {
      id: "perspective-correction",
      label: "Correction Perspective",
      icon: Building,
      requiresAI: false,
      description: "Redresse les lignes verticales/horizontales pour des intérieurs professionnels",
      shortcut: "Alt+P",
      styles: [
        { value: "vertical", label: "Verticale", description: "Redressement lignes verticales" },
        { value: "horizontal", label: "Horizontale", description: "Redressement lignes horizontales" },
        { value: "complete", label: "Complète", description: "Correction complète" },
        { value: "subtle", label: "Subtile", description: "Correction légère" }
      ]
    },
    {
      id: "hdr-balance",
      label: "Équilibrage HDR",
      icon: LineChart,
      requiresAI: false,
      description: "Améliore les zones sombres/claires pour révéler tous les détails",
      shortcut: "Alt+H",
      styles: [
        { value: "balanced", label: "Équilibré", description: "Balance optimale ombres/lumières" },
        { value: "interior", label: "Intérieur", description: "Optimisé pour les intérieurs" },
        { value: "windows", label: "Fenêtres", description: "Équilibre vues extérieures" },
        { value: "dramatic", label: "Dramatique", description: "Contraste accentué avec détails" }
      ]
    },
    {
      id: "white-balance-realty",
      label: "Balance des Blancs Pro",
      icon: Sun,
      requiresAI: false,
      description: "Neutralise les dominantes jaunes des éclairages intérieurs",
      shortcut: "Alt+W",
      styles: [
        { value: "neutral", label: "Neutre", description: "Blancs parfaitement neutres" },
        { value: "interior", label: "Intérieur", description: "Optimisé pour lumière artificielle" },
        { value: "daylight", label: "Lumière du jour", description: "Optimisé pour lumière naturelle" },
        { value: "mixed", label: "Mixte", description: "Équilibre lumières mixtes" }
      ]
    },
    {
      id: "architecture-sharpening",
      label: "Netteté Architecturale",
      icon: Focus,
      requiresAI: false,
      description: "Renforce la netteté sur les éléments structurels",
      shortcut: "Alt+A",
      styles: [
        { value: "structure", label: "Structure", description: "Accentue lignes et détails" },
        { value: "detail", label: "Détail", description: "Renforce textures et matériaux" },
        { value: "balanced", label: "Équilibré", description: "Netteté harmonieuse" },
        { value: "subtle", label: "Subtil", description: "Netteté légère et naturelle" }
      ]
    },
    {
      id: "sky-enhancement",
      label: "Amélioration Ciel",
      icon: Cloud,
      requiresAI: true,
      description: "Remplace ou améliore le ciel des photos extérieures",
      shortcut: "Alt+K",
      styles: [
        { value: "blue", label: "Bleu clair", description: "Ciel bleu lumineux" },
        { value: "dramatic", label: "Dramatique", description: "Ciel avec nuages dramatiques" },
        { value: "sunset", label: "Coucher de soleil", description: "Teintes chaudes" },
        { value: "enhance", label: "Amélioration", description: "Améliore le ciel existant" }
      ]
    },
    {
      id: "wide-angle-correction",
      label: "Correction Grand Angle",
      icon: Maximize2,
      requiresAI: false,
      description: "Élimine les distorsions des photos prises au grand angle",
      shortcut: "Alt+G",
      styles: [
        { value: "subtle", label: "Subtile", description: "Correction légère" },
        { value: "medium", label: "Moyenne", description: "Correction modérée" },
        { value: "strong", label: "Forte", description: "Correction prononcée" },
        { value: "walls", label: "Murs", description: "Focus sur redressement murs" }
      ]
    },
    {
      id: "twilight-mode",
      label: "Mode Crépuscule",
      icon: Sunset,
      requiresAI: true,
      description: "Transforme photos de jour en ambiance soirée avec éclairages chauds",
      shortcut: "Alt+T",
      styles: [
        { value: "warm", label: "Chaud", description: "Ambiance chaleureuse" },
        { value: "blue-hour", label: "Heure bleue", description: "Teintes bleues du crépuscule" },
        { value: "lights-on", label: "Lumières allumées", description: "Avec éclairages intérieurs" },
        { value: "dramatic", label: "Dramatique", description: "Contraste fort jour/nuit" }
      ]
    },
    {
      id: "declutter-ai",
      label: "Désencombrement IA",
      icon: Eraser,
      requiresAI: true,
      description: "Supprime automatiquement les objets indésirables",
      shortcut: "Alt+D",
      styles: [
        { value: "basic", label: "Basique", description: "Suppression objets évidents" },
        { value: "thorough", label: "Approfondi", description: "Nettoyage complet" },
        { value: "furniture", label: "Mobilier", description: "Conserve uniquement l'essentiel" },
        { value: "cables", label: "Câbles", description: "Supprime câbles et fils" }
      ]
    },
    {
      id: "greenery-enhancement",
      label: "Amélioration Verdure",
      icon: Trees,
      requiresAI: false,
      description: "Optimise les jardins et espaces verts",
      shortcut: "Alt+V",
      styles: [
        { value: "vibrant", label: "Vibrant", description: "Verdure éclatante" },
        { value: "lush", label: "Luxuriant", description: "Aspect plus dense et fourni" },
        { value: "manicured", label: "Soigné", description: "Aspect jardin entretenu" },
        { value: "seasonal", label: "Saisonnier", description: "Ajustement selon saison" }
      ]
    },
    {
      id: "realty-crop",
      label: "Cadrage Immobilier",
      icon: Crop,
      requiresAI: false,
      description: "Cadrage intelligent qui met en valeur les points forts",
      shortcut: "Alt+R",
      styles: [
        { value: "wide", label: "Large", description: "Met en valeur l'espace" },
        { value: "vertical", label: "Vertical", description: "Accentue hauteur des plafonds" },
        { value: "feature", label: "Élément clé", description: "Focus sur point fort" },
        { value: "balanced", label: "Équilibré", description: "Composition harmonieuse" }
      ]
    },
    
    // Outils génériques existants
    {
      id: "color-adjustment",
      label: "Ajustement Couleurs",
      icon: Palette,
      requiresAI: false,
      description: "Modifiez les couleurs de l'image",
      shortcut: "Alt+C",
      styles: [
        { value: "vibrant", label: "Vibrant", description: "Couleurs éclatantes" },
        { value: "warm", label: "Chaud", description: "Tons chauds" },
        { value: "cool", label: "Froid", description: "Tons froids" },
        { value: "muted", label: "Atténué", description: "Couleurs douces" }
      ]
    },
    {
      id: "lighting-adjustment",
      label: "Ajustement Éclairage",
      icon: Sun,
      requiresAI: false,
      description: "Modifiez la luminosité et le contraste",
      shortcut: "Alt+L",
      styles: [
        { value: "bright", label: "Lumineux", description: "Plus de luminosité" },
        { value: "dark", label: "Sombre", description: "Plus sombre" },
        { value: "high-contrast", label: "Contraste élevé", description: "Plus de contraste" },
        { value: "soft", label: "Doux", description: "Contraste réduit" }
      ]
    },
    {
      id: "grain-adjustment",
      label: "Ajustement Grain",
      icon: Settings2,
      requiresAI: false,
      description: "Ajoutez ou réduisez le grain",
      shortcut: "Alt+G",
      styles: [
        { value: "fine", label: "Fin", description: "Grain léger" },
        { value: "medium", label: "Moyen", description: "Grain modéré" },
        { value: "rough", label: "Fort", description: "Grain prononcé" },
        { value: "remove", label: "Réduction", description: "Réduire le grain" }
      ]
    },
    {
      id: "sharpness-adjustment",
      label: "Ajustement Netteté",
      icon: Focus,
      requiresAI: false,
      description: "Modifiez la netteté de l'image",
      shortcut: "Alt+S",
      styles: [
        { value: "soft", label: "Doux", description: "Netteté légère" },
        { value: "medium", label: "Moyen", description: "Netteté modérée" },
        { value: "strong", label: "Fort", description: "Netteté prononcée" },
        { value: "extreme", label: "Extrême", description: "Netteté maximale" }
      ]
    },
    {
      id: "enhance-quality",
      label: "Amélioration Rapide",
      icon: Sparkles,
      requiresAI: false,
      description: "Optimisation rapide de la luminosité et des couleurs",
      shortcut: "Alt+Q"
    },
    {
      id: "add-logo",
      label: "Ajouter un Logo",
      icon: ImagePlus,
      requiresAI: false,
      description: "Intégrez votre logo professionnel",
      shortcut: "Alt+O"
    },
    {
      id: "add-watermark",
      label: "Ajouter un Filigrane",
      icon: Type,
      requiresAI: false,
      description: "Protégez vos images avec un filigrane",
      shortcut: "Alt+W"
    }
  ];

  const handleKeyboardNavigation = useCallback((e: KeyboardEvent) => {
    if (disabled || isProcessing) return;

    // Handle keyboard shortcuts for tools
    enhancementTools.forEach((tool) => {
      if (tool.shortcut && e.altKey && e.key.toLowerCase() === tool.shortcut.split('+')[1].toLowerCase()) {
        e.preventDefault();
        handleToolClick(tool);
      }
    });

    // Arrow key navigation
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setCurrentFocusIndex(prev =>
        prev < enhancementTools.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setCurrentFocusIndex(prev =>
        prev > 0 ? prev - 1 : enhancementTools.length - 1
      );
    }

    // Select tool with Enter or Space
    if ((e.key === 'Enter' || e.key === ' ') && currentFocusIndex >= 0) {
      e.preventDefault();
      handleToolClick(enhancementTools[currentFocusIndex]);
    }

    // Escape closes dialog
    if (e.key === 'Escape' && isSettingsOpen) {
      setIsSettingsOpen(false);
      setSelectedTool(null);
    }
  }, [currentFocusIndex, disabled, isProcessing, isSettingsOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardNavigation);
    return () => window.removeEventListener('keydown', handleKeyboardNavigation);
  }, [handleKeyboardNavigation]);

  // Focus management
  useEffect(() => {
    if (currentFocusIndex >= 0) {
      const button = document.querySelector(`[data-tool-index="${currentFocusIndex}"]`) as HTMLButtonElement;
      if (button) button.focus();
    }
  }, [currentFocusIndex]);

  const handleToolClick = (tool: EnhancementTool) => {
    if (disabled || isProcessing) return;

    if (tool.styles && tool.styles.length > 0) {
      setSelectedTool(tool);
      setIsSettingsOpen(true);
      // Announce tool selection to screen readers
      toast({
        title: `${tool.label} sélectionné`,
        description: tool.description,
        duration: 2000,
      });
      return;
    }

    onEnhance(tool.id);
  };

  const handleApplyStyle = async (style: string, intensity: number) => {
    if (selectedTool) {
      await Promise.resolve(onEnhance(selectedTool.id, style, intensity / 100));
      setIsSettingsOpen(false);
      setSelectedTool(null);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <Card
      className="p-6 backdrop-blur-sm bg-background/95 border-primary/10 shadow-lg"
      role="toolbar"
      aria-label="Outils d'amélioration d'image"
    >
      <div className="sr-only">
        Utilisez les flèches pour naviguer entre les outils, Entrée pour sélectionner,
        et Échap pour fermer les fenêtres de dialogue. Chaque outil a son propre raccourci clavier.
      </div>

      <Tabs defaultValue="realty" onValueChange={setActiveTab} className="w-full mb-6">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="grid grid-cols-2 w-[350px]">
            <TabsTrigger value="realty" className="flex gap-2 items-center">
              <Home className="h-4 w-4" />
              <span>Immobilier</span>
            </TabsTrigger>
            <TabsTrigger value="general" className="flex gap-2 items-center">
              <Camera className="h-4 w-4" />
              <span>Général</span>
            </TabsTrigger>
          </TabsList>
          
          <p className="text-xs text-muted-foreground hidden md:block">
            {activeTab === "realty" 
              ? "Optimisez vos photos immobilières pour des annonces plus attractives"
              : "Améliorez la qualité de vos photos avec des outils génériques"
            }
          </p>
        </div>

        <TabsContent value="realty" className="mt-0">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        role="group"
            aria-label="Outils d'amélioration immobilière"
          >
            {enhancementTools
              .filter(tool => [
                "perspective-correction", "hdr-balance", "white-balance-realty", 
                "architecture-sharpening", "sky-enhancement", "wide-angle-correction",
                "twilight-mode", "declutter-ai", "greenery-enhancement", "realty-crop"
              ].includes(tool.id))
              .map((tool, index) => {
          const Icon = tool.icon;
          return (
            <motion.div key={tool.id} variants={item}>
              <Button
                variant="outline"
                className="w-full h-auto py-6 px-4 flex flex-col items-center gap-3 text-center group relative hover:bg-primary/5 hover:border-primary/30 transition-all duration-300"
                onClick={() => handleToolClick(tool)}
                disabled={disabled || isProcessing}
                data-tool-index={index}
                aria-label={`${tool.label}${tool.shortcut ? `, raccourci ${tool.shortcut}` : ''}`}
                aria-description={tool.description}
                role="button"
                tabIndex={currentFocusIndex === index ? 0 : -1}
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-full blur-lg bg-primary/10 group-hover:bg-primary/20 transition-colors"></div>
                  <Icon
                    className="h-8 w-8 relative z-10 text-primary/80 group-hover:text-primary transition-colors"
                    aria-hidden="true"
                  />
                </div>
                <div className="space-y-1">
                  <span className="font-medium">{tool.label}</span>
                  {tool.description && (
                    <p className="text-xs text-muted-foreground">
                      {tool.description}
                    </p>
                  )}
                  {tool.shortcut && (
                    <p className="sr-only">Raccourci clavier: {tool.shortcut}</p>
                  )}
                </div>
                {tool.requiresAI && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-2 -right-2 text-xs bg-primary/10 text-primary hover:bg-primary/20"
                  >
                    IA
                  </Badge>
                )}
              </Button>
            </motion.div>
          );
              })
            }
          </motion.div>
        </TabsContent>

        <TabsContent value="general" className="mt-0">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            role="group"
            aria-label="Outils d'amélioration génériques"
          >
            {enhancementTools
              .filter(tool => ![
                "perspective-correction", "hdr-balance", "white-balance-realty", 
                "architecture-sharpening", "sky-enhancement", "wide-angle-correction",
                "twilight-mode", "declutter-ai", "greenery-enhancement", "realty-crop"
              ].includes(tool.id))
              .map((tool, index) => {
                const Icon = tool.icon;
                return (
                  <motion.div key={tool.id} variants={item}>
                    <Button
                      variant="outline"
                      className="w-full h-auto py-6 px-4 flex flex-col items-center gap-3 text-center group relative hover:bg-primary/5 hover:border-primary/30 transition-all duration-300"
                      onClick={() => handleToolClick(tool)}
                      disabled={disabled || isProcessing}
                      data-tool-index={enhancementTools.length - index - 1}
                      aria-label={`${tool.label}${tool.shortcut ? `, raccourci ${tool.shortcut}` : ''}`}
                      aria-description={tool.description}
                      role="button"
                      tabIndex={currentFocusIndex === enhancementTools.length - index - 1 ? 0 : -1}
                    >
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full blur-lg bg-primary/10 group-hover:bg-primary/20 transition-colors"></div>
                        <Icon
                          className="h-8 w-8 relative z-10 text-primary/80 group-hover:text-primary transition-colors"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="font-medium">{tool.label}</span>
                        {tool.description && (
                          <p className="text-xs text-muted-foreground">
                            {tool.description}
                          </p>
                        )}
                        {tool.shortcut && (
                          <p className="sr-only">Raccourci clavier: {tool.shortcut}</p>
                        )}
                      </div>
                      {tool.requiresAI && (
                        <Badge
                          variant="secondary"
                          className="absolute -top-2 -right-2 text-xs bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          IA
                        </Badge>
                      )}
                    </Button>
                  </motion.div>
                );
              })
            }
      </motion.div>
        </TabsContent>
      </Tabs>

      {isSettingsOpen && selectedTool && (
        <StyleSettingsDialog
          isOpen={isSettingsOpen}
          onClose={() => {
            setIsSettingsOpen(false);
            setSelectedTool(null);
          }}
          onApply={handleApplyStyle}
          title={`Paramètres - ${selectedTool.label}`}
          description="Ajustez l'intensité de l'amélioration"
          styles={selectedTool.styles}
        />
      )}
    </Card>
  );
}