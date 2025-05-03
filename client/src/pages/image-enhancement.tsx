import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Plus, Trash2, Check, Download, FileType, Undo, Sparkles, Info, Image as ImageIcon, Maximize, RefreshCw, Type, MoveHorizontal, MoveVertical, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ImageDropzone } from "../components/image-enhancement/ImageDropzone";
import { ImageEnhancementTools } from "../components/image-enhancement/ImageEnhancementTools";
import { ImagePreview } from "../components/image-enhancement/ImagePreview";
import { WatermarkSettings, type WatermarkSettings as WatermarkSettingsType } from "../components/image-enhancement/WatermarkSettings";
import { FormatConversionDialog } from "../components/image-enhancement/FormatConversionDialog";
import { StyleTransferDialog } from "../components/image-enhancement/StyleTransferDialog";
import { Badge } from "@/components/ui/badge";
import { ImageGenerationDialog } from "../components/image-enhancement/ImageGenerationDialog";

interface ImageHistoryEntry {
  imageUrl: string;
  effect: string;
  method: string | 'original';
  analysis?: any;
}

export default function ImageEnhancementPage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [watermarkImage, setWatermarkImage] = useState<File | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<'openai' | 'sharp' | 'stable-diffusion' | null>(null);
  const [watermarkType, setWatermarkType] = useState<'logo' | 'text' | null>(null);
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettingsType>({
    type: 'logo',
    position: 'bottom-right',
    size: 20,
    opacity: 80,
    color: '#000000',
    font: 'Arial',
    text: '',
    sizeMode: 'percent'
  });
  const [appliedEffects, setAppliedEffects] = useState<string[]>([]);
  const [imageHistory, setImageHistory] = useState<ImageHistoryEntry[]>([]);
  const [isFormatDialogOpen, setIsFormatDialogOpen] = useState(false);
  const [currentFormat, setCurrentFormat] = useState<string>('webp');
  const [isStyleDialogOpen, setIsStyleDialogOpen] = useState(false);
  const [styleAnalysis, setStyleAnalysis] = useState<{
    description?: string;
    suggestions?: string[];
    lighting?: number;
    composition?: number;
  } | null>(null);
  const [isGenerationDialogOpen, setIsGenerationDialogOpen] = useState(false);
  const [imageMetadata, setImageMetadata] = useState<{
    width?: number;
    height?: number;
    size?: string;
    type?: string;
  }>({});

  const { toast } = useToast();

  const fontOptions = [
    { value: 'Arial', label: 'Arial' },
    { value: 'Helvetica', label: 'Helvetica' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Courier New', label: 'Courier New' },
    { value: 'Verdana', label: 'Verdana' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: 'Montserrat', label: 'Montserrat' },
    { value: 'Lato', label: 'Lato' },
    { value: 'Playfair Display', label: 'Playfair Display' },
    { value: 'Pacifico', label: 'Pacifico (Script)' },
  ];

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    setEnhancedImage(null);
    setError(null);
    setMethod(null);
    setAppliedEffects([]);
    setStyleAnalysis(null);
    setImageHistory([]);

    // Extraire les métadonnées de base
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    setImageMetadata({
      size: `${sizeMB} MB`,
      type: file.type.replace('image/', '').toUpperCase()
    });

    // Lire les dimensions
    const img = new Image();
    img.onload = () => {
      setImageMetadata(prev => ({
        ...prev,
        width: img.naturalWidth,
        height: img.naturalHeight
      }));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);

    // Create a URL for the original image and add it to history
    const originalImageUrl = URL.createObjectURL(file);
    setImageHistory([{
      imageUrl: originalImageUrl,
      effect: 'original',
      method: 'original'
    }]);
  };

  const handleWatermarkSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner une image valide pour le logo",
          variant: "destructive"
        });
        return;
      }
      setWatermarkImage(file);
      setWatermarkType('logo');
    }
  };

  const handleWatermarkRemove = () => {
    setWatermarkImage(null);
    setWatermarkType(null);
    setWatermarkSettings({
      ...watermarkSettings,
      text: ''
    });
  };

  const handleImageEnhancement = async (enhancementType: string, style?: string, intensity?: number) => {
    if (!selectedImage) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une image à améliorer",
        variant: "destructive"
      });
      return;
    }

    if (enhancementType === 'add-logo') {
      setWatermarkType('logo');
      // Montrer un toast pour guider l'utilisateur
      toast({
        title: "Ajout de logo",
        description: "Veuillez sélectionner un logo et configurer les options d'affichage",
      });
      return;
    }
    if (enhancementType === 'add-watermark') {
      setWatermarkType('text');
      // Initialiser un texte par défaut pour faciliter l'utilisation
      setWatermarkSettings(prev => ({
        ...prev,
        text: 'Votre filigrane',
        sizeMode: 'percent'
      }));
      // Montrer un toast pour guider l'utilisateur
      toast({
        title: "Ajout de filigrane",
        description: "Veuillez saisir le texte et configurer les options d'affichage",
      });
      return;
    }

    await processEnhancement(enhancementType, style, intensity);
  };

  const processEnhancement = async (enhancementType: string, style?: string, intensity?: number) => {
    if (!selectedImage) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une image à améliorer",
        variant: "destructive"
      });
      return;
    }

    // Vérifications spécifiques pour les filigranes
    if (enhancementType === 'add-logo' && !watermarkImage) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un logo à ajouter",
        variant: "destructive"
      });
      return;
    }

    if (enhancementType === 'add-watermark' && !watermarkSettings.text) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un texte pour le filigrane",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();

      if (enhancedImage) {
        const response = await fetch(enhancedImage);
        const blob = await response.blob();
        formData.append('image', blob, 'current.webp');
      } else {
        formData.append('image', selectedImage);
      }

      formData.append('enhancement', enhancementType);
      if (style) formData.append('style', style);
      if (intensity !== undefined) formData.append('intensity', intensity.toString());


      if (enhancementType === 'add-logo' && watermarkImage) {
        formData.append('watermark', watermarkImage);
        formData.append('watermarkType', 'logo');
        formData.append('watermarkSettings', JSON.stringify({
          type: 'logo',
          position: watermarkSettings.position,
          size: watermarkSettings.size,
          opacity: watermarkSettings.opacity
        }));
      } else if (enhancementType === 'add-watermark' && watermarkSettings.text) {
        formData.append('watermarkType', 'text');
        formData.append('watermarkSettings', JSON.stringify({
          ...watermarkSettings,
          type: 'text'
        }));
      }

      const response = await fetch('/api/image-enhancement', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // Vérifier si la réponse a du contenu avant de la parser
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Enhancement failed');
          } catch (jsonError) {
            throw new Error('Format de réponse invalide');
          }
        } else {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
      }

      // Vérifier si la réponse a du contenu avant de la parser
      const responseContentType = response.headers.get("content-type");
      if (!responseContentType || !responseContentType.includes("application/json")) {
        throw new Error('Le serveur n\'a pas retourné de JSON valide');
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error("Erreur de parsing JSON:", jsonError);
        throw new Error('Impossible de lire la réponse du serveur');
      }

      if (!result.imageUrl) {
        throw new Error('No enhanced image URL received');
      }

      // Sauvegarder l'état actuel dans l'historique avant d'appliquer le nouvel effet
      if (enhancedImage) {
        setImageHistory(prev => [...prev, {
          imageUrl: enhancedImage,
          effect: enhancementType,
          method: method || 'sharp',
          analysis: styleAnalysis
        }]);
      }

      setEnhancedImage(result.imageUrl);
      setMethod(result.method);
      setAppliedEffects(prev => [...prev, enhancementType]);

      if (enhancementType === 'add-logo' || enhancementType === 'add-watermark') {
        setWatermarkType(null);
      }

      toast({
        title: "Image améliorée avec succès",
        description: "L'image a été traitée selon vos préférences.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error during image enhancement:', error);
      setError(error instanceof Error ? error.message : 'Une erreur est survenue');
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de l'amélioration de l'image"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Ajouter un effet pour nettoyer les images temporaires lors du déchargement de la page
  useEffect(() => {
    // Fonction de nettoyage lors de la sortie
    const cleanupBeforeUnload = () => {
      // On utilise sendBeacon pour envoyer une requête même si la page se ferme
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/image-enhancement/cleanup');
      } else {
        // Fallback pour les navigateurs qui ne supportent pas sendBeacon
        fetch('/api/image-enhancement/cleanup', { 
          method: 'POST',
          keepalive: true 
        }).catch(e => console.error('Erreur lors du nettoyage des images:', e));
      }
    };

    // Attacher l'écouteur d'événement
    window.addEventListener('beforeunload', cleanupBeforeUnload);

    // Nettoyage à la destruction du composant
    return () => {
      window.removeEventListener('beforeunload', cleanupBeforeUnload);
      cleanupBeforeUnload();
    };
  }, []);

  const handleDownload = async () => {
    if (!enhancedImage) return;

    try {
      const response = await fetch(enhancedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enhanced-image-${Date.now()}.${currentFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Nettoyer les images temporaires après téléchargement
      fetch('/api/image-enhancement/cleanup', { 
        method: 'POST' 
      }).catch(e => console.error('Erreur lors du nettoyage des images après téléchargement:', e));
      
      toast({
        title: "Image téléchargée",
        description: "L'image a été téléchargée avec succès",
        variant: "default"
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger l'image",
        variant: "destructive"
      });
    }
  };

  const handleFormatConversion = async (format: string, quality: number) => {
    if (!enhancedImage) return;

    try {
      const response = await fetch(enhancedImage);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('image', blob);
      formData.append('enhancement', 'convert-format');
      formData.append('format', format);
      formData.append('quality', quality.toString());

      const conversionResponse = await fetch('/api/image-enhancement', {
        method: 'POST',
        body: formData,
      });

      if (!conversionResponse.ok) {
        // Vérifier le type de contenu de la réponse d'erreur
        const contentType = conversionResponse.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await conversionResponse.json();
            throw new Error(errorData.error || 'Conversion failed');
          } catch (jsonError) {
            throw new Error('Format de réponse invalide');
          }
        } else {
          throw new Error(`Erreur ${conversionResponse.status}: ${conversionResponse.statusText}`);
        }
      }

      // Vérifier si la réponse a du contenu JSON avant parsing
      const responseContentType = conversionResponse.headers.get("content-type");
      if (!responseContentType || !responseContentType.includes("application/json")) {
        throw new Error('Le serveur n\'a pas retourné de JSON valide');
      }

      let result;
      try {
        result = await conversionResponse.json();
      } catch (jsonError) {
        console.error("Erreur de parsing JSON:", jsonError);
        throw new Error('Impossible de lire la réponse du serveur');
      }
      
      setEnhancedImage(result.imageUrl);
      setCurrentFormat(format);
      setMethod('sharp');

      toast({
        title: "Format converti avec succès",
        description: `L'image a été convertie au format ${format.toUpperCase()}`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error converting format:', error);
      toast({
        title: "Erreur",
        description: "La conversion du format a échoué",
        variant: "destructive"
      });
    }
  };

  const handleStyleTransfer = async (style: string, prompt?: string, strength?: number) => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('style', style);
      if (prompt) formData.append('prompt', prompt);
      if (strength) formData.append('strength', strength.toString());

      const response = await fetch('/api/image-enhancement/style-transfer', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // Vérifier le type de contenu de la réponse d'erreur
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Style transfer failed');
          } catch (jsonError) {
            throw new Error('Format de réponse invalide');
          }
        } else {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
      }

      // Vérifier si la réponse a du contenu JSON avant parsing
      const responseContentType = response.headers.get("content-type");
      if (!responseContentType || !responseContentType.includes("application/json")) {
        throw new Error('Le serveur n\'a pas retourné de JSON valide');
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error("Erreur de parsing JSON:", jsonError);
        throw new Error('Impossible de lire la réponse du serveur');
      }
      
      setEnhancedImage(result.imageUrl);
      setMethod(result.method);
      setStyleAnalysis(result.analysis);
      setAppliedEffects(prev => [...prev, `style-${style}`]);

      if (result.notice) {
        toast({
          title: "Style appliqué avec succès (Mode local)",
          description: result.notice,
          variant: "default"
        });
      } else {
        toast({
          title: "Style appliqué avec succès",
          description: "L'image a été transformée selon le style choisi.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error during style transfer:', error);
      setError(error instanceof Error ? error.message : 'Une erreur est survenue');
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors du transfert de style",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRollback = () => {
    if (imageHistory.length > 1) {
      // Get the previous state (one step back)
      const previousState = imageHistory[imageHistory.length - 2];
      setEnhancedImage(previousState.imageUrl);
      setMethod(previousState.method as 'openai' | 'sharp' | 'stable-diffusion' | null);
      setStyleAnalysis(previousState.analysis);

      // Remove the last effect from applied effects
      setAppliedEffects(prev => prev.slice(0, -1));

      // Remove the last state from history
      setImageHistory(prev => prev.slice(0, -1));

      toast({
        title: "Effet annulé",
        description: "Le dernier effet a été retiré.",
      });
    } else if (imageHistory.length === 1) {
      // If we're at the original image
      const originalState = imageHistory[0];
      setEnhancedImage(originalState.imageUrl);
      setMethod(null);
      setStyleAnalysis(null);
      setAppliedEffects([]);
      setImageHistory([originalState]);

      toast({
        title: "Retour à l'original",
        description: "Tous les effets ont été retirés.",
      });
    }
  };

  const handleImageGeneration = (generatedImageUrl: string) => {
    setEnhancedImage(generatedImageUrl);
    setMethod('stable-diffusion');
    setAppliedEffects(prev => [...prev, 'generate-image']);
  };

  // Add type check for suggestions
  const hasSuggestions = styleAnalysis?.suggestions && styleAnalysis.suggestions.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto py-8 space-y-8"
      >
            <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl border border-gray-200"
        >
          <div>
            <motion.div
              className="flex items-center gap-3 mb-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Sparkles className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent animate-gradient">
                Amélioration d'Images
              </h1>
            </motion.div>
            <motion.p
              className="text-muted-foreground text-lg ml-[52px]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Optimisez vos photos simplement et efficacement
            </motion.p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="backdrop-blur-sm bg-background/95 border-primary/10 shadow-lg h-full">
              <CardHeader className="pb-3 border-b border-muted/40">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                <CardTitle>Image Source</CardTitle>
                </div>
                <CardDescription className="pt-1">
                  Téléchargez une image à améliorer
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {!selectedImage ? (
                <ImageDropzone onImageSelect={handleImageSelect} />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="space-y-4"
                  >
                    <div className="relative border border-muted rounded-lg overflow-hidden bg-muted/20 p-1 flex items-center justify-center min-h-[500px]">
                    <ImagePreview
                      file={selectedImage}
                        className="max-h-[calc(100vh-300px)] max-w-full object-contain rounded shadow-sm m-auto"
                      />
                    </div>
                    
                    {/* Détails de l'image */}
                    {imageMetadata.width && (
                      <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground py-2 px-3 bg-muted/10 rounded-md">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-foreground/80">Format:</span>
                          <span className="ml-1">{imageMetadata.type}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-foreground/80">Taille:</span>
                          <span className="ml-1">{imageMetadata.size}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-foreground/80">Dimensions:</span>
                          <span className="ml-1">{imageMetadata.width} × {imageMetadata.height}px</span>
                        </div>
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs hover:bg-primary/10 px-2 py-1 h-auto"
                            onClick={() => document.getElementById('image-upload')?.click()}
                          >
                            Changer
                            <input
                              id="image-upload"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  handleImageSelect(e.target.files[0]);
                                }
                              }}
                            />
                          </Button>
                        </div>
                      </div>
                    )}
                    </motion.div>
                  )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="backdrop-blur-sm bg-background/95 border-primary/10 shadow-lg h-full">
              <CardHeader className="pb-3 border-b border-muted/40">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle>Image Améliorée</CardTitle>
                  </div>
                  <div className="flex gap-2">
                  {enhancedImage && imageHistory.length > 0 && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRollback}
                        className="h-8 w-8 hover:bg-primary/10 transition-colors"
                    >
                      <Undo className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                </div>
                <CardDescription className="pt-1">
                  {method === 'openai' ? "Amélioration IA avancée" :
                    method === 'sharp' ? "Amélioration professionnelle" :
                      method === 'stable-diffusion' ? "Image générée" :
                        "Résultat de l'amélioration"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <AnimatePresence mode="wait">
                  {isProcessing ? (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg border-primary/20 bg-primary/5 min-h-[500px]"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full blur-xl bg-primary/20"></div>
                        <div className="relative animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      </div>
                      <p className="mt-4 text-sm text-primary/80">
                        Amélioration en cours...
                      </p>
                    </motion.div>
                  ) : enhancedImage ? (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-5"
                    >
                      <div className="relative border border-muted rounded-lg overflow-hidden bg-muted/20 p-1 flex items-center justify-center min-h-[500px]">
                        <ImagePreview
                          src={enhancedImage}
                          className="max-h-[calc(100vh-300px)] max-w-full object-contain rounded shadow-sm m-auto"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute bottom-2 right-2 h-8 w-8 bg-background/70 backdrop-blur-sm hover:bg-background/90 transition-colors"
                          onClick={() => {
                            window.open(enhancedImage, '_blank');
                          }}
                        >
                          <Maximize className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <AnimatePresence>
                        {appliedEffects.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-wrap gap-2 mb-3"
                          >
                            <span className="text-sm font-medium text-foreground/80">Effets appliqués:</span>
                            {appliedEffects.map((effect, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="bg-primary/10 text-primary text-xs px-2"
                              >
                                {effect}
                              </Badge>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      {styleAnalysis && method === 'openai' && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm p-4 rounded-lg bg-primary/5 border border-primary/10 space-y-2"
                        >
                          <div className="flex gap-2 items-center">
                            <Info className="h-4 w-4 text-primary" />
                            <p className="font-medium text-primary">Analyse IA</p>
                          </div>
                          <p className="text-muted-foreground">{styleAnalysis.description}</p>
                          {hasSuggestions && styleAnalysis?.suggestions && (
                            <div>
                              <p className="font-medium text-primary mt-2">Suggestions:</p>
                              <ul className="list-disc pl-4 space-y-1">
                                {styleAnalysis.suggestions.map((suggestion, index) => (
                                  <li key={index} className="text-muted-foreground">{suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="flex gap-4 mt-2 pt-2 border-t border-muted/30">
                            <div>
                              <span className="font-medium text-primary">Éclairage:</span>
                              {" "}<span className="text-muted-foreground">{styleAnalysis.lighting}/10</span>
                            </div>
                            <div>
                              <span className="font-medium text-primary">Composition:</span>
                              {" "}<span className="text-muted-foreground">{styleAnalysis.composition}/10</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsFormatDialogOpen(true)}
                          className="group hover:bg-primary/10"
                        >
                          <FileType className="h-4 w-4 mr-2 group-hover:text-primary transition-colors" />
                          Changer le format
                        </Button>
                        <Button
                          onClick={handleDownload}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg border-primary/20 bg-primary/5 min-h-[500px]"
                    >
                      <Upload className="h-12 w-12 text-primary/40" />
                      <p className="mt-2 text-sm text-center max-w-md text-primary/60">
                        {error || "Sélectionnez une amélioration ci-dessous pour voir le résultat"}
                      </p>
                      {selectedImage && (
                        <p className="text-xs text-center text-muted-foreground mt-1">
                          Utilisez les options d'amélioration pour transformer votre image
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {watermarkType && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="backdrop-blur-sm bg-background/95 border-primary/10 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Options de {watermarkType === 'logo' ? 'Logo' : 'Filigrane'}</CardTitle>
                  <CardDescription>
                    Configurez les paramètres d'ajout de {watermarkType === 'logo' ? 'logo' : 'filigrane'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleWatermarkRemove}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => processEnhancement(watermarkType === 'logo' ? 'add-logo' : 'add-watermark')}
                    disabled={watermarkType === 'logo' && !watermarkImage || watermarkType === 'text' && !watermarkSettings.text}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Appliquer
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {watermarkType === 'logo' ? (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Logo</label>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      className="relative hover:bg-primary/10 group"
                      onClick={() => document.getElementById('watermark-input')?.click()}
                    >
                      <Plus className="mr-2 h-4 w-4 group-hover:text-primary transition-colors" />
                      Choisir un logo
                      <input
                        id="watermark-input"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleWatermarkSelect}
                      />
                    </Button>
                        {watermarkImage ? (
                      <span className="text-sm text-muted-foreground">
                        {watermarkImage.name}
                      </span>
                        ) : (
                          <span className="text-sm text-destructive">
                            Aucun logo sélectionné
                      </span>
                    )}
                  </div>
                    </div>
                    {watermarkImage && (
                      <div className="relative border border-muted rounded-lg overflow-hidden bg-muted/20 p-2 flex items-center justify-center h-20">
                        <ImagePreview
                          file={watermarkImage}
                          className="max-h-full max-w-full object-contain rounded shadow-sm m-auto"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="watermark-text" className="text-sm font-medium">Texte du filigrane</label>
                      <input
                        id="watermark-text"
                        type="text"
                        value={watermarkSettings.text || ''}
                        onChange={(e) => setWatermarkSettings({...watermarkSettings, text: e.target.value})}
                        className="w-full px-3 py-2 border border-muted rounded-md"
                        placeholder="Saisissez votre texte"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-1">
                          <Type className="h-4 w-4" />
                          Police
                        </label>
                        <select 
                          value={watermarkSettings.font} 
                          onChange={(e) => setWatermarkSettings({...watermarkSettings, font: e.target.value})}
                          className="w-full px-3 py-2 border border-muted rounded-md bg-background"
                        >
                          {fontOptions.map(font => (
                            <option key={font.value} value={font.value} style={{fontFamily: font.value}}>
                              {font.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-1">
                          <MoveHorizontal className="h-4 w-4" />
                          Position
                        </label>
                        <select 
                          value={watermarkSettings.position} 
                          onChange={(e) => setWatermarkSettings({...watermarkSettings, position: e.target.value})}
                          className="w-full px-3 py-2 border border-muted rounded-md bg-background"
                        >
                          <option value="top-left">Haut Gauche</option>
                          <option value="top-center">Haut Centre</option>
                          <option value="top-right">Haut Droite</option>
                          <option value="center-left">Centre Gauche</option>
                          <option value="center">Centre</option>
                          <option value="center-right">Centre Droite</option>
                          <option value="bottom-left">Bas Gauche</option>
                          <option value="bottom-center">Bas Centre</option>
                          <option value="bottom-right">Bas Droite</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-1">
                          <Sliders className="h-4 w-4" />
                          Type de taille
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className={`flex-1 px-2 py-1 text-sm border ${watermarkSettings.sizeMode === 'percent' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-muted'} rounded-md`}
                            onClick={() => setWatermarkSettings({...watermarkSettings, sizeMode: 'percent'})}
                          >
                            Pourcentage
                          </button>
                          <button
                            type="button"
                            className={`flex-1 px-2 py-1 text-sm border ${watermarkSettings.sizeMode === 'pixels' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-muted'} rounded-md`}
                            onClick={() => setWatermarkSettings({...watermarkSettings, sizeMode: 'pixels'})}
                          >
                            Pixels
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="watermark-size" className="text-sm font-medium flex items-center gap-1">
                          <MoveVertical className="h-4 w-4" />
                          Taille {watermarkSettings.sizeMode === 'percent' ? '(%)' : '(px)'}
                        </label>
                        <input
                          id="watermark-size"
                          type="number"
                          min={watermarkSettings.sizeMode === 'percent' ? 1 : 8}
                          max={watermarkSettings.sizeMode === 'percent' ? 100 : 500}
                          value={watermarkSettings.size}
                          onChange={(e) => setWatermarkSettings({...watermarkSettings, size: Number(e.target.value)})}
                          className="w-full px-3 py-2 border border-muted rounded-md"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="watermark-opacity" className="text-sm font-medium">Opacité (%)</label>
                        <input
                          id="watermark-opacity"
                          type="number"
                          min={10}
                          max={100}
                          value={watermarkSettings.opacity}
                          onChange={(e) => setWatermarkSettings({...watermarkSettings, opacity: Number(e.target.value)})}
                          className="w-full px-3 py-2 border border-muted rounded-md"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="watermark-color" className="text-sm font-medium">Couleur</label>
                        <div className="flex items-center gap-2">
                          <input
                            id="watermark-color"
                            type="color"
                            value={watermarkSettings.color}
                            onChange={(e) => setWatermarkSettings({...watermarkSettings, color: e.target.value})}
                            className="w-10 h-10 rounded p-0 border border-muted overflow-hidden"
                          />
                          <span className="text-sm">{watermarkSettings.color}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-4 border border-muted rounded-md">
                      <p className="text-sm font-medium mb-2">Aperçu:</p>
                      <div 
                        className="p-3 bg-muted/20 rounded-md"
                      >
                        <p style={{ 
                          fontFamily: watermarkSettings.font, 
                          color: watermarkSettings.color,
                          opacity: watermarkSettings.opacity / 100,
                          fontSize: watermarkSettings.sizeMode === 'percent' ? `${Math.min(watermarkSettings.size, 30)}px` : `${Math.min(watermarkSettings.size, 72)}px`
                        }}>
                          {watermarkSettings.text || 'Votre filigrane'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {watermarkType === 'logo' && (
                <WatermarkSettings
                  settings={watermarkSettings}
                  onSettingsChange={setWatermarkSettings}
                  type={watermarkType}
                />
                )}

                <div className="pt-4 border-t border-muted/30">
                  <p className="text-sm text-muted-foreground">Cliquez sur "Appliquer" pour ajouter le {watermarkType === 'logo' ? 'logo' : 'filigrane'} à votre image.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ImageEnhancementTools
            onEnhance={handleImageEnhancement}
            isProcessing={isProcessing}
            disabled={!selectedImage}
          />
        </motion.div>

        <FormatConversionDialog
          isOpen={isFormatDialogOpen}
          onClose={() => setIsFormatDialogOpen(false)}
          onConvert={handleFormatConversion}
          currentFormat={currentFormat}
        />
        <StyleTransferDialog
          isOpen={isStyleDialogOpen}
          onClose={() => setIsStyleDialogOpen(false)}
          onApplyStyle={handleStyleTransfer}
        />
        <ImageGenerationDialog
          isOpen={isGenerationDialogOpen}
          onClose={() => setIsGenerationDialogOpen(false)}
          onGenerate={handleImageGeneration}
        />
      </motion.div>
    </div>
  );
}