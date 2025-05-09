import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { 
  Link2, Plus, Trash2, Copy, ExternalLink, Edit, 
  Image as ImageIcon, Save, Eye, ChevronUp, ChevronDown, 
  Loader2, MoveUp, ArrowUp, Star, StarOff, Palette, 
  LayoutGrid, Settings, BarChart3, Globe, Sparkles, X, 
  ArrowLeft, Smartphone, Split, FileText, MoreVertical,
  Check, ChevronsUpDown, Move, ArrowUpCircle, Unlock, 
  SunMoon, MoonStar, Paintbrush, Gauge, PanelTop, 
  PanelRight, FileImage, Clock, XCircle, User, LinkIcon, 
  AlertTriangle, Upload, FileX, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ColorPicker } from '@/components/ui/color-picker';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { AnimatePresence, motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { FormSubmissionsViewer } from '@/components/links/FormSubmissionsViewer';
import { Counter } from '@/components/links/Counter';

interface LinkItem {
  id: string;
  title: string;
  url: string; // URL for type 'link'
  icon?: string;
  enabled: boolean;
  clicks: number; // Clicks for type 'link', submissions for type 'form'
  position?: number;
  featured?: boolean;
  customColor?: string;
  customTextColor?: string;
  animation?: string;
  iconSize?: number;
  type: 'link' | 'form'; // New field to differentiate
  formDefinition?: FormField[]; // New field for form structure
  isNew?: boolean; // Optional new field
}

// Define the structure for form fields
interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'email' | 'number' | 'checkbox' | 'select';
  label: string;
  required: boolean;
  options?: string[];
}

interface LinkProfile {
  id: string;
  userId: string;
  slug: string;
  title: string;
  description: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  logoUrl: string;
  links: LinkItem[];
  views: number;
  backgroundImage?: string;
  backgroundPattern?: string;
  buttonStyle?: string;
  buttonRadius?: number;
  fontFamily?: string;
  animation?: string;
  customCss?: string;
  customTheme?: Record<string, any>;
  iconSize?: number;
  patternColor?: string;
  patternOpacity?: number;
  patternSize?: number;
  patternAnimation?: string;
  backgroundBlur?: number;
  backgroundBrightness?: number;
  backgroundContrast?: number;
  backgroundPosition?: string;
  backgroundOverlay?: string;
  backgroundSaturation?: number;
  backgroundHueRotate?: number;
  backgroundSepia?: number;
  backgroundGrayscale?: number;
  backgroundInvert?: number;
  backgroundColorFilter?: string;
  backgroundColorFilterOpacity?: number;
  is_paused?: boolean; // New field for pause status
}

const defaultProfile: LinkProfile = {
  id: '',
  userId: '',
  slug: '',
  title: 'Mon Linktree',
  description: 'Tous mes liens professionnels en un seul endroit',
  backgroundColor: '#ffffff',
  textColor: '#000000',
  accentColor: '#70C7BA',
  logoUrl: '',
  links: [],
  views: 0,
  backgroundPattern: '',
  buttonStyle: 'rounded',
  buttonRadius: 8,
  fontFamily: 'Inter',
  animation: 'fade',
  iconSize: 8,
  patternColor: '',
  patternOpacity: 0.2,
  patternSize: 20,
  patternAnimation: '',
  backgroundBlur: 0,
  backgroundBrightness: 100,
  backgroundContrast: 100,
  backgroundPosition: 'center',
  backgroundOverlay: '',
  backgroundSaturation: 100,
  backgroundHueRotate: 0,
  backgroundSepia: 0,
  backgroundGrayscale: 0,
  backgroundInvert: 0,
  backgroundColorFilter: '',
  backgroundColorFilterOpacity: 0.3
};

// Définir les sections possibles pour corriger l'erreur TypeScript
type SectionType = 'info' | 'links' | 'appearance' | 'stats';

// Patterns d'arrière-plan disponibles
const backgroundPatterns = [
  { id: 'none', name: 'Aucun' },
  { id: 'buildings', name: 'Immeubles' },
  { id: 'buildings-animated', name: 'Immeubles (Animé)' },
  { id: 'blueprint', name: 'Plan' },
  { id: 'circuit', name: 'Circuit' },
  { id: 'circuit-animated', name: 'Circuit (Animé)' },
  { id: 'nodes', name: 'Réseau' },
  { id: 'nodes-animated', name: 'Réseau (Animé)' },
  { id: 'smartcity', name: 'Smart City' },
  { id: 'smartcity-animated', name: 'Smart City (Animé)' },
  { id: 'keys', name: 'Clés' },
  { id: 'keys-animated', name: 'Clés (Animé)' },
  { id: 'dots', name: 'Points' },
  { id: 'grid', name: 'Grille' },
  { id: 'stripes', name: 'Rayures' },
  { id: 'waves', name: 'Vagues' },
  { id: 'squares', name: 'Carrés' },
  { id: 'circles', name: 'Cercles' },
  { id: 'hexagons', name: 'Hexagones' },
  { id: 'triangles', name: 'Triangles' },
  // Nouveaux motifs futuristes
  { id: 'futuristic-circuit', name: 'Circuit Futuriste' },
  { id: 'futuristic-hexagrid', name: 'Grille Hexa Futuriste' },
  { id: 'futuristic-network', name: 'Réseau Futuriste' },
  { id: 'futuristic-matrix', name: 'Matrice Numérique' },
  { id: 'futuristic-neon', name: 'Néon Futuriste' },
  { id: 'futuristic-cyber', name: 'Cyberpunk' },
  { id: 'futuristic-dna', name: 'ADN Futuriste' },
  { id: 'futuristic-nano', name: 'Nanotechnologie' },
  { id: 'futuristic-quantum', name: 'Quantique' },
  { id: 'futuristic-blocks', name: 'Blocs 3D' },
  { id: 'futuristic-datastream', name: 'Flux de Données' },
  { id: 'futuristic-hologram', name: 'Hologramme' }
];

// Animations disponibles
const animationOptions = [
  { id: 'none', name: 'Aucune' },
  { id: 'fade', name: 'Fondu' },
  { id: 'slide', name: 'Glissement' },
  { id: 'bounce', name: 'Rebond' },
  { id: 'scale', name: 'Zoom' },
  { id: 'flip', name: 'Retournement' },
  { id: 'pulse', name: 'Pulsation' },
  { id: 'shimmer', name: 'Scintillement' }
];

// Styles de bouton disponibles
const buttonStyles = [
  { id: 'rounded', name: 'Arrondi' },
  { id: 'square', name: 'Carré' },
  { id: 'pill', name: 'Pilule' },
  { id: 'shadow', name: 'Ombre' },
  { id: 'outline', name: 'Contour' },
  { id: 'gradient', name: 'Dégradé' },
  { id: 'glassmorphism', name: 'Verre' },
  { id: 'neon', name: 'Néon' },
  { id: 'brutalist', name: 'Brutaliste' }
];

// Polices disponibles
const fontOptions = [
  { id: 'Inter', name: 'Inter' },
  { id: 'Roboto', name: 'Roboto' },
  { id: 'Montserrat', name: 'Montserrat' },
  { id: 'Poppins', name: 'Poppins' },
  { id: 'Open Sans', name: 'Open Sans' },
  { id: 'Lato', name: 'Lato' },
  { id: 'Quicksand', name: 'Quicksand' },
  { id: 'Space Grotesk', name: 'Space Grotesk' },
  { id: 'Outfit', name: 'Outfit' }
];

// Thèmes prédéfinis
const presetThemes = [
  {
    name: 'Dark Mode',
    backgroundColor: '#121212',
    textColor: '#f5f5f5',
    accentColor: '#10b981',
    buttonStyle: 'glassmorphism',
    animation: 'fade',
    fontFamily: 'Inter'
  },
  {
    name: 'Neon Future',
    backgroundColor: '#0f172a',
    textColor: '#f8fafc',
    accentColor: '#f472b6',
    buttonStyle: 'neon',
    animation: 'shimmer',
    fontFamily: 'Space Grotesk'
  },
  {
    name: 'Brutalist',
    backgroundColor: '#f5f5f5',
    textColor: '#000000',
    accentColor: '#ef4444',
    buttonStyle: 'brutalist',
    animation: 'none',
    fontFamily: 'Roboto'
  }
];

// Ajout de palettes de couleurs prédéfinies
const colorPalettes = [
  { 
    name: 'Immobilier Classique', 
    backgroundColor: '#ffffff', 
    textColor: '#333333', 
    accentColor: '#2c6ecb'
  },
  { 
    name: 'Luxe', 
    backgroundColor: '#f8f5f0', 
    textColor: '#2c2c2c', 
    accentColor: '#c8a45c'
  },
  { 
    name: 'Moderne', 
    backgroundColor: '#f9fafb', 
    textColor: '#111827', 
    accentColor: '#3b82f6'
  },
  { 
    name: 'Professionnel', 
    backgroundColor: '#ffffff', 
    textColor: '#1f2937', 
    accentColor: '#10b981'
  },
  { 
    name: 'Urbain', 
    backgroundColor: '#18181b', 
    textColor: '#f4f4f5', 
    accentColor: '#a855f7'
  },
  { 
    name: 'Chaleureux', 
    backgroundColor: '#fffbeb', 
    textColor: '#78350f', 
    accentColor: '#f97316'
  },
];

// Composant EditLinkForm pour isoler la logique d'édition
const EditLinkForm = ({ 
  link, 
  onUpdate, 
  onClose 
}: { 
  link: LinkItem | undefined | null; 
  onUpdate: (id: string, updates: Partial<LinkItem>) => void;
  onClose: () => void;
}) => {
  // Debug: Ajout de logs pour comprendre pourquoi le lien n'est pas trouvé
  console.log("EditLinkForm - link reçu:", link);

  // Si le lien n'est pas trouvé, afficher un message d'erreur
  if (!link) {
    return (
      <div className="p-4 text-center text-destructive">
        Le lien sélectionné n'a pas pu être trouvé.
        <Button 
          variant="outline" 
          size="sm" 
          className="ml-2" 
          onClick={onClose}
        >
          Fermer
        </Button>
      </div>
    );
  }

  // Clone local du lien pour éviter les problèmes de référence
  const linkData = { ...link };
  
  // Debug: Vérification des données après la copie
  console.log("EditLinkForm - linkData après copie:", linkData);

  // Formulaire d'édition simplifié
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Titre</Label>
          <Input 
            value={linkData.title} 
            onChange={(e) => onUpdate(linkData.id, { title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>URL</Label>
          <Input 
            value={linkData.url} 
            onChange={(e) => onUpdate(linkData.id, { url: e.target.value })}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Taille de l'icône</Label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { value: "", label: "Défaut" },
            { value: "5", label: "Petit" },
            { value: "8", label: "Moyen" }, 
            { value: "12", label: "Grand" }, 
            { value: "16", label: "Très grand" }
          ].map(size => (
            <Button
              key={size.value}
              type="button"
              variant={linkData.iconSize === (size.value ? parseInt(size.value) : undefined) ? "default" : "outline"}
              className="py-1"
              onClick={() => onUpdate(linkData.id, { 
                iconSize: size.value ? parseInt(size.value) : undefined 
              })}
            >
              {size.label}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Mettre en avant</Label>
          <Switch 
            checked={linkData.featured || false} 
            onCheckedChange={(checked) => onUpdate(linkData.id, { featured: checked })}
          />
        </div>
      </div>
      
      <div className="pt-3 flex justify-end">
        <Button
          variant="default"
          className="gap-2"
          onClick={onClose}
        >
          Terminer
        </Button>
      </div>
    </div>
  );
};

export default function LinksPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<LinkProfile>(defaultProfile);
  const [originalProfile, setOriginalProfile] = useState<LinkProfile>(defaultProfile);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [newLink, setNewLink] = useState<Partial<LinkItem>>({ 
    title: '', 
    url: '', 
    enabled: true,
    type: 'link'
  });
  const [editingLink, setEditingLink] = useState<{ id: string | null; link: LinkItem | null }>({ id: null, link: null });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [uploadingLinkIcon, setUploadingLinkIcon] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const linkIconInputRef = useRef<HTMLInputElement>(null);
  const newLinkIconInputRef = useRef<HTMLInputElement>(null);
  const [expandedSections, setExpandedSections] = useState({
    info: true,
    links: true,
    appearance: true,
    stats: true
  });
  const [currentTab, setCurrentTab] = useState<'info' | 'links' | 'forms' | 'appearance' | 'stats'>('info');
  const [previewMode, setPreviewMode] = useState(true);
  const [isSideBySideView, setIsSideBySideView] = useState(true);
  const [previewProfile, setPreviewProfile] = useState<LinkProfile>(defaultProfile);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Getter pour l'ID d'édition (pour la compatibilité avec le code existant)
  const editingLinkId = editingLink.id;
  
  // Setter pour l'ID d'édition qui met à jour également la référence au lien
  const setEditingLinkId = (id: string | null) => {
    if (id === null) {
      setEditingLink({ id: null, link: null });
    } else {
      const link = profile.links.find(l => String(l.id) === String(id)) || null;
      setEditingLink({ id, link });
    }
  };
  
  // Fetch user's link profile
  const { data: userProfile, isLoading, isError } = useQuery({
    queryKey: ['linkProfile'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/links/profile');
        return response.data || defaultProfile;
      } catch (error) {
        console.error('Error fetching link profile:', error);
        return defaultProfile;
      }
    }
  });
  
  // Update profile when data is loaded
  useEffect(() => {
    if (userProfile) {
      const profileData = JSON.parse(JSON.stringify(userProfile));
      setProfile(profileData);
      setPreviewProfile(profileData);
      setOriginalProfile(profileData);
      
      // Mettre à jour la référence au lien en cours d'édition si nécessaire
      if (editingLinkId) {
        const link = userProfile.links.find((l: LinkItem) => String(l.id) === String(editingLinkId)) || null;
        setEditingLink({ id: editingLinkId, link });
      }
    }
  }, [userProfile, editingLinkId]);
  
  // Update preview profile whenever profile changes
  useEffect(() => {
    setPreviewProfile(profile);
  }, [profile]);
  
  // Track unsaved changes
  useEffect(() => {
    if (userProfile) {
      setHasUnsavedChanges(JSON.stringify(profile) !== JSON.stringify(originalProfile));
    }
  }, [profile, originalProfile]);
  
  // Save profile mutation
  const saveProfileMutation = useMutation({
    mutationFn: async (updatedProfile: LinkProfile) => {
      console.log('Envoi du profil mis à jour:', JSON.stringify(updatedProfile, null, 2));
      
      try {
        const response = await apiRequest('/api/links/profile', {
          method: 'POST',
          body: JSON.stringify(updatedProfile)
        });
        console.log('Réponse du serveur:', response);
        return response;
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du profil:', error);
        // Afficher des détails sur l'erreur pour mieux diagnostiquer
        if (error instanceof Error) {
          console.error('Message d\'erreur:', error.message);
          console.error('Stack trace:', error.stack);
        }
        
        if (error instanceof Response) {
          try {
            const errorData = await error.json();
            console.error('Détails de l\'erreur serveur:', errorData);
          } catch (e) {
            console.error('Impossible de parser les détails de l\'erreur');
          }
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkProfile'] });
      setOriginalProfile(JSON.parse(JSON.stringify(profile)));
      setHasUnsavedChanges(false);
      toast({
        title: "Profil enregistré",
        description: "Vos modifications ont été sauvegardées avec succès.",
        variant: "default"
      });
    },
    onError: (error) => {
      console.error('Erreur de mutation:', error);
      let errorMessage = "Impossible d'enregistrer vos modifications. Veuillez réessayer.";
      
      // Tenter d'extraire un message d'erreur plus précis
      if (error instanceof Error) {
        errorMessage = `Erreur: ${error.message}`;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });
  
  // Add link to profile
  const addLink = () => {
    if (!newLink.title) {
      toast({
        title: "Erreur",
        description: "Le titre est requis.",
        variant: "destructive"
      });
      return;
    }

    if (newLink.type === 'link') {
      if (!newLink.url) {
        toast({
          title: "Erreur",
          description: "L'URL est requise pour un lien simple.",
        variant: "destructive"
      });
      return;
    }
    
    if (!newLink.url.startsWith('http://') && !newLink.url.startsWith('https://')) {
      newLink.url = `https://${newLink.url}`;
      }
    }
    
    const newLinkWithDefaults: LinkItem = {
      id: Date.now().toString(),
      title: newLink.title || '',
      url: newLink.type === 'link' ? newLink.url || '' : '',
      icon: newLink.icon,
      enabled: true,
      clicks: 0,
      position: profile.links.length,
      featured: false,
      customColor: undefined,
      customTextColor: undefined,
      animation: undefined,
      iconSize: newLink.iconSize,
      type: newLink.type || 'link',
      formDefinition: newLink.type === 'form' ? newLink.formDefinition : undefined
    };
    
    const updatedProfile = {
      ...profile,
      links: [...profile.links, newLinkWithDefaults]
    };
    
    setProfile(updatedProfile);
    setNewLink({ title: '', url: '', enabled: true });
    setHasUnsavedChanges(true);
  };
  
  // Remove link from profile
  const removeLink = (id: string) => {
    const updatedLinks = profile.links.filter((l) => l.id !== id);
    
    setProfile({ ...profile, links: updatedLinks });
    setHasUnsavedChanges(true);
  };
  
  // Update link
  const updateLink = (id: string, updates: Partial<LinkItem>) => {
    console.log('Mise à jour du lien:', id, 'avec les données:', updates);
    
    const updatedProfile = {
      ...profile,
      links: profile.links.map(link => 
        link.id === id ? { ...link, ...updates } : link
      )
    };
    
    console.log('Nouveau profil à sauvegarder:', updatedProfile);
    
    setProfile(updatedProfile);
    setHasUnsavedChanges(true);
  };
  
  // Save profile
  const saveProfile = () => {
    saveProfileMutation.mutate(profile);
  };
  
  // Cancel changes
  const cancelChanges = () => {
    setProfile(JSON.parse(JSON.stringify(originalProfile)));
    setHasUnsavedChanges(false);
    toast({
      title: "Modifications annulées",
      description: "Vos modifications ont été annulées.",
      variant: "default"
    });
  };
  
  // Handle profile slug change
  const handleSlugChange = (value: string) => {
    const slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setProfile({ ...profile, slug });
  };
  
  // Copy link to clipboard
  const copyLinkToClipboard = () => {
    const url = `${window.location.origin}/u/${profile.slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Lien copié",
      description: "Le lien a été copié dans le presse-papier.",
      variant: "default"
    });
  };

  // Toggle section expansion - corrigé pour TypeScript
  const toggleSection = (section: SectionType) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };

  // Section header component - corrigé pour TypeScript
  const SectionHeader = ({ title, description, section }: { title: string, description?: string, section: SectionType }) => (
    <div 
      className="flex items-center justify-between cursor-pointer p-4 rounded-lg bg-card hover:bg-muted/50 shadow-sm border mb-4"
      onClick={() => toggleSection(section)}
    >
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {expandedSections[section] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
    </div>
  );
  
  // Upload logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Type de fichier non supporté",
        description: "Veuillez sélectionner une image (JPG, PNG, etc.)",
        variant: "destructive"
      });
      return;
    }
    
    // Max file size: 2MB
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 2 Mo",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setUploadingLogo(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('logo', file);
      
      // Upload file to server
      const response = await fetch('/api/links/upload-logo', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de l\'upload');
      }
      
      // Update profile with new logo URL
      const updatedProfile = {
        ...profile,
        logoUrl: result.logoUrl
      };
      
      setProfile(updatedProfile);
      saveProfileMutation.mutate(updatedProfile);
      
      toast({
        title: "Logo mis à jour",
        description: "Votre logo a été changé avec succès",
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'uploader le logo. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setUploadingLogo(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  // Toggle featured status for a link
  const toggleFeatured = (id: string) => {
    const updatedProfile = {
      ...profile,
      links: profile.links.map(link => 
        link.id === id ? { ...link, featured: !link.featured } : link
      )
    };
    
    setProfile(updatedProfile);
    saveProfileMutation.mutate(updatedProfile);
  };
  
  // Move link up in order (decrease position)
  const moveLinkUp = (id: string) => {
    // Find the current index of the link
    const currentIndex = profile.links.findIndex(link => link.id === id);
    if (currentIndex <= 0) return; // Already at the top
    
    // Create a new array with the link moved up
    const newLinks = [...profile.links];
    const temp = newLinks[currentIndex];
    newLinks[currentIndex] = newLinks[currentIndex - 1];
    newLinks[currentIndex - 1] = temp;
    
    // Update positions
    const updatedLinks = newLinks.map((link, index) => ({
      ...link,
      position: index
    }));
    
    const updatedProfile = {
      ...profile,
      links: updatedLinks
    };
    
    setProfile(updatedProfile);
    saveProfileMutation.mutate(updatedProfile);
  };
  
  // Upload background image
  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Type de fichier non supporté",
        description: "Veuillez sélectionner une image (JPG, PNG, etc.)",
        variant: "destructive"
      });
      return;
    }
    
    // Max file size: 2MB
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 2 Mo",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setUploadingBackground(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('background', file);
      
      // Upload file to server
      const response = await fetch('/api/links/upload-background', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de l\'upload');
      }
      
      // Update profile with new background URL
      const updatedProfile = {
        ...profile,
        backgroundImage: result.backgroundUrl
      };
      
      setProfile(updatedProfile);
      saveProfileMutation.mutate(updatedProfile);
      
      toast({
        title: "Image de fond mise à jour",
        description: "Votre image de fond a été changée avec succès",
      });
    } catch (error) {
      console.error('Error uploading background:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'uploader l'image de fond. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setUploadingBackground(false);
      // Reset file input
      if (backgroundInputRef.current) {
        backgroundInputRef.current.value = '';
      }
    }
  };
  
  // Trigger background file input click
  const triggerBackgroundInput = () => {
    backgroundInputRef.current?.click();
  };

  // Ajoutez cette fonction pour déterminer si le motif sélectionné est animé
  const isAnimatedPattern = (patternName: string) => {
    return patternName && patternName.includes('-animated');
  };

  // Modifiez la fonction generatePatternUrl pour inclure les animations CSS
  const generatePatternUrl = (patternName: string, color: string) => {
    // Si aucun motif n'est sélectionné, retourner undefined
    if (!patternName || patternName === 'none') return undefined;
    
    // Utiliser la couleur spécifique au motif ou la couleur du texte par défaut
    const patternColor = profile.patternColor || color;
    
    // Encoder la couleur pour l'URL
    const encodedColor = encodeURIComponent(patternColor);
    
    // Ajouter l'opacité et la taille aux paramètres
    const opacity = profile.patternOpacity ?? 0.2;
    const size = profile.patternSize ?? 20;
    
    // Retourner l'URL du motif avec les paramètres
    return `/api/statics/patterns/${patternName}.svg?color=${encodedColor}&opacity=${opacity}&size=${size}`;
  };

  // Upload link icon
  const handleLinkIconUpload = async (e: React.ChangeEvent<HTMLInputElement>, linkId: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Type de fichier non supporté",
        description: "Veuillez sélectionner une image (JPG, PNG, etc.)",
        variant: "destructive"
      });
      return;
    }
    
    // Max file size: 1MB
    if (file.size > 1 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 1 Mo",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setUploadingLinkIcon(true);
      console.log('Début de l\'upload d\'icône, fichier:', file.name, file.size, file.type);
      
      // Create form data
      const formData = new FormData();
      formData.append('icon', file);
      
      // Upload file to server
      console.log('Envoi de la requête POST vers /api/links/upload-link-icon');
      const response = await fetch('/api/links/upload-link-icon', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      console.log('Réponse reçue:', result);
      
      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de l\'upload');
      }
      
      // Update link with new icon URL
      console.log('Mise à jour du lien avec la nouvelle icône URL:', result.iconUrl);
      updateLink(linkId, { icon: result.iconUrl });
      
      toast({
        title: "Icône mise à jour",
        description: "L'icône du lien a été changée avec succès",
      });
    } catch (error) {
      console.error('Error uploading link icon:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'uploader l'icône. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setUploadingLinkIcon(false);
      // Reset file input
      if (linkIconInputRef.current) {
        linkIconInputRef.current.value = '';
      }
    }
  };
  
  // Trigger link icon file input click
  const triggerLinkIconInput = () => {
    if (linkIconInputRef.current) {
      linkIconInputRef.current.click();
    } else {
      console.error('La référence linkIconInputRef est null');
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir le sélecteur de fichier. Veuillez réessayer.",
        variant: "destructive"
      });
    }
  };

  // Upload new link icon
  const handleNewLinkIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Type de fichier non supporté",
        description: "Veuillez sélectionner une image (JPG, PNG, etc.)",
        variant: "destructive"
      });
      return;
    }
    
    // Max file size: 1MB
    if (file.size > 1 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 1 Mo",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setUploadingLinkIcon(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('icon', file);
      
      // Upload file to server
      const response = await fetch('/api/links/upload-link-icon', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de l\'upload');
      }
      
      // Update new link with icon URL and include required fields
      setNewLink({
        ...newLink, 
        icon: result.iconUrl,
        position: 0,
        featured: false,
        customColor: undefined,
        customTextColor: undefined,
        animation: undefined,
        iconSize: newLink.iconSize
      });
      
      toast({
        title: "Icône ajoutée",
        description: "L'icône a été ajoutée au nouveau lien",
      });
    } catch (error) {
      console.error('Error uploading new link icon:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'uploader l'icône. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setUploadingLinkIcon(false);
      // Reset file input
      if (newLinkIconInputRef.current) {
        newLinkIconInputRef.current.value = '';
      }
    }
  };
  
  // Trigger new link icon file input click
  const triggerNewLinkIconInput = () => {
    newLinkIconInputRef.current?.click();
  };

  // Dans le composant EditLinkDialog
  function EditLinkDialog() {
    const editingLink = profile.links.find(l => l.id === editingLinkId);
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [icon, setIcon] = useState('');
    const [customColor, setCustomColor] = useState('');
    const [type, setType] = useState<'link' | 'form'>('link');
    const [formFields, setFormFields] = useState<FormField[]>([]);

    useEffect(() => {
      if (editingLink) {
        setTitle(editingLink.title || '');
        setUrl(editingLink.url || '');
        setIcon(editingLink.icon || '');
        setCustomColor(editingLink.customColor || '');
        setType((editingLink.type as 'link' | 'form') || 'link');
        setFormFields(editingLink.formDefinition || []);
      }
    }, [editingLink]);

    const handleTypeChange = (value: 'link' | 'form') => {
      setType(value);
      // Initialiser avec un champ par défaut si on passe à un formulaire
      if (value === 'form' && formFields.length === 0) {
        setFormFields([{
          id: Date.now().toString(),
          label: 'Nom',
          type: 'text',
          required: true
        }]);
      }
    };

    const handleFieldTypeChange = (
      index: number, 
      value: "number" | "text" | "textarea" | "email" | "checkbox" | "select"
    ) => {
      const newFields = [...formFields];
      newFields[index] = {
        ...newFields[index],
        type: value,
        options: value === 'select' ? [''] : undefined
      };
      setFormFields(newFields);
    };

    const addFormField = () => {
      const newField: FormField = {
        id: Date.now().toString(),
        label: '',
        type: 'text',
        required: false
      };
      setFormFields([...formFields, newField]);
    };

    const removeFormField = (index: number) => {
      const newFields = [...formFields];
      newFields.splice(index, 1);
      setFormFields(newFields);
    };

    const updateFormField = (index: number, updates: Partial<FormField>) => {
      const newFields = [...formFields];
      newFields[index] = {
        ...newFields[index],
        ...updates
      };
      setFormFields(newFields);
    };

    const handleLinkIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setIcon(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!editingLink) return;
      
      // Valider les champs
      if (type === 'form' && formFields.length === 0) {
        toast({
          title: "Formulaire incomplet",
          description: "Veuillez ajouter au moins un champ à votre formulaire",
          variant: "destructive"
        });
        return;
      }

      if (type === 'form' && !formFields.every(f => f.label)) {
        toast({
          title: "Formulaire incomplet",
          description: "Tous les champs doivent avoir un libellé",
          variant: "destructive"
        });
        return;
      }
      
      const updatedLink = {
        title,
        url: type === 'link' ? url : '',
        icon,
        customColor,
        type,
        formDefinition: type === 'form' ? formFields : undefined
      };
      
      await updateLink(editingLink.id, updatedLink);
      setEditingLinkId(null);
    };

    return (
      <Dialog open={!!editingLinkId} onOpenChange={() => setEditingLinkId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le lien</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroup value={type} onValueChange={handleTypeChange} className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="link" id="link-type" />
                      <Label htmlFor="link-type">Lien simple</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="form" id="form-type" />
                      <Label htmlFor="form-type">Formulaire</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="linkTitle">Titre</Label>
                  <Input
                    id="linkTitle"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Mon lien"
                  />
                </div>
                
                {type === 'link' ? (
                  <div className="space-y-2">
                    <Label htmlFor="linkUrl">URL</Label>
                    <Input
                      id="linkUrl"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Champs du formulaire</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addFormField}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter un champ
                      </Button>
                    </div>
                    
                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                      {formFields.map((field, index) => (
                        <Card key={field.id} className="p-4">
                          <div className="flex justify-between mb-3">
                            <h4 className="font-medium">Champ #{index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFormField(index)}
                              className="h-8 w-8 p-0 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Libellé</Label>
                              <Input
                                value={field.label}
                                onChange={(e) => updateFormField(index, { label: e.target.value })}
                                placeholder="Ex: Nom complet"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Type de champ</Label>
                              <Select
                                value={field.type}
                                onValueChange={(value: any) => handleFieldTypeChange(index, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Texte</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="textarea">Zone de texte</SelectItem>
                                  <SelectItem value="number">Nombre</SelectItem>
                                  <SelectItem value="checkbox">Case à cocher</SelectItem>
                                  <SelectItem value="select">Liste déroulante</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex items-center">
                            <Checkbox
                              id={`required-${field.id}`}
                              checked={field.required}
                              onCheckedChange={(checked) => updateFormField(index, { required: !!checked })}
                            />
                            <Label htmlFor={`required-${field.id}`} className="ml-2">
                              Champ obligatoire
                            </Label>
                          </div>
                          
                          {field.type === 'select' && (
                            <div className="mt-4 space-y-2">
                              <Label>Options (une par ligne)</Label>
                              <textarea
                                className="w-full p-2 border rounded-md"
                                value={field.options?.join('\n') || ''}
                                onChange={(e) => {
                                  const options = e.target.value.split('\n').filter(o => o.trim());
                                  updateFormField(index, { options });
                                }}
                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                                rows={3}
                              />
                            </div>
                          )}
                        </Card>
                      ))}
                      
                      {formFields.length === 0 && (
                        <div className="p-8 rounded-lg border border-dashed border-muted-foreground/20 flex flex-col items-center justify-center text-center">
                          <p className="text-sm text-muted-foreground mb-2">
                            Aucun champ dans ce formulaire
                          </p>
                          <Button
                            type="button" 
                            variant="outline"
                            size="sm"
                            onClick={addFormField}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Ajouter un champ
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Icône (optionnel)</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      {icon ? (
                        <img src={icon} alt="Icon" className="h-full w-full object-cover" />
                      ) : (
                        <Link2 className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={triggerLinkIconInput} 
                      className="gap-2"
                    >
                      <ImageIcon className="h-4 w-4" />
                      {icon ? 'Changer l\'icône' : 'Ajouter une icône'}
                    </Button>
                    
                    {icon && (
                      <Button 
                        type="button"
                        variant="ghost" 
                        onClick={() => setIcon('')}
                        className="h-9 w-9 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <input 
                      type="file" 
                      ref={linkIconInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleLinkIconChange}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingLinkId(null)}
              >
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // Mutation pour activer/désactiver le mode pause
  const togglePauseMutation = useMutation({
    mutationFn: async (isPaused: boolean) => {
      const response = await apiRequest('/api/links/profile/toggle-pause', {
        method: 'PATCH',
        body: JSON.stringify({ isPaused })
      });
      return response;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['linkProfile'] });
      const { isPaused } = response.data;
      
      // Mise à jour du profil local
      setProfile(prev => ({
        ...prev,
        is_paused: isPaused
      }));
      
      toast({
        title: isPaused ? "Profil en pause" : "Profil activé",
        description: isPaused 
          ? "Votre profil n'est plus accessible publiquement."
          : "Votre profil est maintenant accessible publiquement.",
        variant: "default"
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'état de pause du profil.",
        variant: "destructive"
      });
    }
  });

  // Gestionnaire pour toggle pause
  const handleTogglePause = () => {
    const newPauseState = !(profile.is_paused || false);
    togglePauseMutation.mutate(newPauseState);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex flex-col space-y-6">
        {/* En-tête repris du style de maintenance.tsx */}
        <Card className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <Link2 className="h-6 w-6" />
              </div>
          <div>
                <h1 className="text-2xl font-bold tracking-tight">Personnalisation de lien</h1>
                <p className="text-muted-foreground text-sm">
                  Créez et gérez le profil public pour partager vos liens.
                </p>
          </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
               {/* Barre de lien - style adapté */}
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg text-sm border border-gray-200">
                <span className="text-muted-foreground text-xs">Lien public:</span>
                <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-gray-200">{window.location.origin}/u/{profile.slug || 'votre-lien'}</code>
              <Button
                variant="ghost"
                size="icon"
                  className="h-6 w-6 text-gray-500 hover:text-gray-700"
                onClick={copyLinkToClipboard}
                  title="Copier le lien"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            
              {/* Boutons d'actions */}
            {previewMode ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setPreviewMode(false)}
              >
                <Edit className="h-4 w-4" />
                Éditer
              </Button>
            ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setPreviewMode(true)}
                >
                  <Eye className="h-4 w-4" />
                    Aperçu
                </Button>
            )}
            
            {hasUnsavedChanges && !previewMode && (
              <Button
                variant="outline"
                size="sm"
                    className="gap-2 text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={cancelChanges}
              >
                <X className="h-4 w-4" />
                Annuler
              </Button>
            )}
            
            <Button
              variant="default"
              size="sm"
              className="gap-2"
              onClick={saveProfile}
              disabled={!hasUnsavedChanges || saveProfileMutation.isPending}
            >
              {saveProfileMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer
              {hasUnsavedChanges && "*"}
            </Button>
          </div>
        </div>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {previewMode ? (
            <div className="lg:col-span-12">
              <Card className="shadow-xl overflow-hidden border-none bg-gradient-to-br from-primary/5 to-background">
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row h-[calc(100vh-200px)]">
                    <div className="p-8 lg:w-1/3 flex items-center justify-center border-r">
                      <div className="mb-4 flex flex-col items-center">
                        <div className="relative w-[320px] h-[640px] border-8 border-gray-800 rounded-[40px] shadow-xl overflow-hidden bg-black">
                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[120px] h-[30px] bg-gray-800 rounded-b-[14px] z-10"></div>
                          <iframe
                            key={JSON.stringify(previewProfile)} // Force refresh when previewProfile changes
                            src={`/u/${previewProfile.slug || 'preview'}?preview=true&data=${encodeURIComponent(JSON.stringify(previewProfile))}`}
                            className="w-full h-full border-0"
                            title="Aperçu de votre page"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-8 lg:w-2/3 overflow-auto">
                      <div className="space-y-8">
                        <div>
                          <h2 className="text-2xl font-bold mb-4">Statistiques</h2>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Card className="bg-gradient-to-br from-primary/5 to-background border border-primary/10 shadow-sm hover:shadow-md transition-all">
                              <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                  <div className="p-3 rounded-full bg-primary/10">
                                    <Eye className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                      <p className="text-sm text-muted-foreground">Vues totales</p>
                                      <Counter value={profile.views} className="text-3xl font-bold" />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            </motion.div>
                            
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: 0.1 }}
                            >
                              <Card className="bg-gradient-to-br from-primary/5 to-background border border-primary/10 shadow-sm hover:shadow-md transition-all">
                              <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                  <div className="p-3 rounded-full bg-primary/10">
                                    <Link2 className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                      <p className="text-sm text-muted-foreground">Clics totaux</p>
                                      <Counter 
                                        value={profile.links.reduce((acc: number, link: LinkItem) => acc + link.clicks, 0)} 
                                        className="text-3xl font-bold"
                                      />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            </motion.div>
                            
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: 0.2 }}
                            >
                              <Card className="bg-gradient-to-br from-primary/5 to-background border border-primary/10 shadow-sm hover:shadow-md transition-all">
                              <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                  <div className="p-3 rounded-full bg-primary/10">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Taux de clic</p>
                                      <div className="flex items-end gap-1">
                                        <Counter 
                                          value={profile.views > 0 
                                        ? Math.round((profile.links.reduce((acc: number, link: LinkItem) => acc + link.clicks, 0) / profile.views) * 100) 
                                            : 0} 
                                          className="text-3xl font-bold"
                                        />
                                        <span className="text-xl font-bold text-muted-foreground">%</span>
                                      </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            </motion.div>
                          </div>
                        </div>
                        
                        {profile.links.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.3 }}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-medium">Performance par lien</h3>
                              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                {profile.links.reduce((acc: number, link: LinkItem) => acc + link.clicks, 0)} clics au total
                              </Badge>
                            </div>
                            
                            <Card className="border border-muted-foreground/10 overflow-hidden">
                              <CardContent className="p-4 space-y-3">
                                {profile.links
                                  .filter(link => link.enabled)
                                  .sort((a, b) => b.clicks - a.clicks)
                                  .map((link, index) => {
                                    const totalClicks = profile.links.reduce((acc: number, link: LinkItem) => acc + link.clicks, 0);
                                    const percentage = totalClicks > 0 ? (link.clicks / totalClicks) * 100 : 0;
                                    
                                    return (
                                      <motion.div 
                                        key={link.id} 
                                        className="space-y-2"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3, delay: index * 0.05 }}
                                      >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                            {link.icon ? (
                                              <div className="h-8 w-8 rounded-full overflow-hidden">
                                            <img src={link.icon} alt="" className="h-full w-full object-cover" />
                                          </div>
                                            ) : (
                                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                                {link.type === 'form' ? (
                                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                  <Link2 className="h-4 w-4 text-muted-foreground" />
                                                )}
                                          </div>
                                        )}
                                        <div>
                                          <p className="font-medium">{link.title}</p>
                                              {link.type === 'form' ? (
                                                <p className="text-xs text-muted-foreground">Formulaire</p>
                                              ) : (
                                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{link.url}</p>
                                              )}
                                        </div>
                                      </div>
                                        <div className="text-right">
                                          <p className="text-xl font-bold">{link.clicks}</p>
                                            <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% des clics</p>
                                        </div>
                                        </div>
                                        <div className="relative w-full h-2 bg-muted/30 rounded-full overflow-hidden">
                                          <motion.div 
                                            className="absolute left-0 top-0 h-full bg-primary"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.max(3, percentage)}%` }}
                                            transition={{ duration: 0.5, delay: 0.2 + index * 0.05 }}
                                          ></motion.div>
                                      </div>
                                      </motion.div>
                                    );
                                  })}
                                  </CardContent>
                                </Card>
                          </motion.div>
                        )}
                        
                        {/* Nouvelle section Réponses aux formulaires */}
                        {profile.links.filter(link => link.type === 'form' && link.clicks > 0).length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.4 }}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-medium">Réponses aux formulaires</h3>
                              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
                                {profile.links.filter(link => link.type === 'form').reduce((acc, link) => acc + link.clicks, 0)} réponses au total
                              </Badge>
                            </div>
                            
                            <Card className="border border-muted-foreground/10">
                              <CardContent className="p-4">
                                <FormSubmissionsViewer 
                                  links={profile.links.filter(link => link.type === 'form' && link.clicks > 0)} 
                                  profile={profile}
                                />
                              </CardContent>
                            </Card>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {/* Tabs and Editor */}
              <div className={isSideBySideView ? "lg:col-span-8" : "lg:col-span-12"}>
                <Card className="border-none shadow-lg bg-gradient-to-br from-background to-muted/50">
                  <CardContent className="p-0">
                    <Tabs 
                      value={currentTab} 
                      onValueChange={(value) => setCurrentTab(value as 'info' | 'links' | 'forms' | 'appearance' | 'stats')} 
                      className="w-full"
                    >
                      <div className="border-b">
                        <TabsList className="w-full justify-start rounded-none h-auto p-0 bg-transparent">
                          <TabsTrigger 
                            value="info" 
                            className="py-3 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                          >
                            <div className="flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              <span>Informations</span>
                            </div>
                          </TabsTrigger>
                          <TabsTrigger 
                            value="links" 
                            className="py-3 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                          >
                            <div className="flex items-center gap-2">
                              <LayoutGrid className="h-4 w-4" />
                              <span>Liens</span>
                              {profile.links.filter(link => link.type === 'link').length > 0 && (
                                <Badge variant="secondary" className="ml-1 h-5 bg-primary/10 text-primary hover:bg-primary/20">
                                  {profile.links.filter(link => link.type === 'link').length}
                                </Badge>
                              )}
                            </div>
                          </TabsTrigger>
                          <TabsTrigger 
                            value="forms" 
                            className="py-3 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span>Formulaires</span>
                              {profile.links.filter(link => link.type === 'form').length > 0 && (
                                <Badge variant="secondary" className="ml-1 h-5 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20">
                                  {profile.links.filter(link => link.type === 'form').length}
                                </Badge>
                              )}
                            </div>
                          </TabsTrigger>
                          <TabsTrigger 
                            value="appearance" 
                            className="py-3 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                          >
                            <div className="flex items-center gap-2">
                              <Palette className="h-4 w-4" />
                              <span>Apparence</span>
                            </div>
                          </TabsTrigger>
                          <TabsTrigger 
                            value="stats" 
                            className="py-3 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                          >
                            <div className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              <span>Statistiques</span>
                            </div>
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      {/* Rest of the tabs content */}
                      <TabsContent value="info" className="p-6 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="profileTitle">Titre de la page</Label>
                              <Input
                                id="profileTitle"
                                value={profile.title}
                                onChange={(e) => setProfile({...profile, title: e.target.value})}
                                placeholder="Mon profil professionnel"
                                className="bg-background/50 border-muted-foreground/20"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="profileDescription">Description</Label>
                              <Input
                                id="profileDescription"
                                value={profile.description}
                                onChange={(e) => setProfile({...profile, description: e.target.value})}
                                placeholder="Tous mes liens professionnels en un seul endroit"
                                className="bg-background/50 border-muted-foreground/20"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="profileSlug">Nom d'utilisateur / Slug</Label>
                              <div className="flex items-center">
                                <span className="bg-muted/50 px-3 py-2 rounded-l-md border-y border-l border-muted-foreground/20 text-muted-foreground text-sm">
                                  {window.location.origin}/u/
                                </span>
                                <Input
                                  id="profileSlug"
                                  value={profile.slug}
                                  onChange={(e) => handleSlugChange(e.target.value)}
                                  placeholder="votreidentifiant"
                                  className="bg-background/50 border-muted-foreground/20 rounded-l-none"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">L'URL de votre profil public</p>
                            </div>
                            
                            <div className="space-y-2 pt-4 border-t border-muted-foreground/10">
                              <div className="flex justify-between items-center">
                                <div>
                                  <Label className="text-lg">État du profil</Label>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {profile.is_paused ? 
                                      "Votre profil n'est actuellement pas visible publiquement." : 
                                      "Votre profil est actuellement visible publiquement."}
                                  </p>
                                </div>
                                <Button 
                                  variant={profile.is_paused ? "default" : "outline"}
                                  className={profile.is_paused ? "bg-emerald-600 hover:bg-emerald-700" : "border-amber-500 text-amber-600 hover:bg-amber-50"}
                                  onClick={handleTogglePause}
                                  disabled={togglePauseMutation.isPending}
                                >
                                  {togglePauseMutation.isPending ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Chargement...
                                    </>
                                  ) : profile.is_paused ? (
                                    <>
                                      <Unlock className="mr-2 h-4 w-4" />
                                      Activer le profil
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle className="mr-2 h-4 w-4" />
                                      Mettre en pause
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-6">
                            <div className="space-y-2">
                              <Label>Logo</Label>
                              <div className="flex items-start gap-4">
                                <div 
                                  className="h-28 w-28 rounded-xl border-2 border-primary/20 flex items-center justify-center overflow-hidden bg-gradient-to-br from-background to-muted shadow-md"
                                  style={{ 
                                    backgroundColor: profile.backgroundColor || '#ffffff',
                                  }}
                                >
                                  {profile.logoUrl ? (
                                    <img src={profile.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex flex-col items-center justify-center h-full w-full text-muted-foreground">
                                      <Link2 className="h-10 w-10 mb-1" />
                                      <span className="text-xs">Aucun logo</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                  <Button 
                                    variant="outline" 
                                    className="gap-2 items-center whitespace-nowrap"
                                    onClick={triggerFileInput}
                                    disabled={uploadingLogo}
                                  >
                                    {uploadingLogo ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Chargement...
                                      </>
                                    ) : (
                                      <>
                                        <ImageIcon className="h-4 w-4" />
                                        {profile.logoUrl ? 'Changer le logo' : 'Ajouter un logo'}
                                      </>
                                    )}
                                  </Button>
                                  
                                  {profile.logoUrl && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="text-destructive"
                                      onClick={() => {
                                        const updatedProfile = { ...profile, logoUrl: '' };
                                        setProfile(updatedProfile);
                                        saveProfileMutation.mutate(updatedProfile);
                                        toast({
                                          title: "Logo supprimé",
                                          description: "Votre logo a été supprimé",
                                        });
                                      }}
                                    >
                                      Supprimer
                                    </Button>
                                  )}
                                  
                                  <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleLogoUpload}
                                  />
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Format recommandé : image carrée (1:1) au format JPG ou PNG
                              </p>
                            </div>
                            
                            <Card className="border border-primary/20 bg-primary/5">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className="p-2 rounded-full bg-primary/10 text-primary mt-1">
                                    <Sparkles className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-sm">Conseils pour optimiser votre page</h4>
                                    <ul className="text-xs text-muted-foreground mt-2 space-y-1.5 list-disc list-inside">
                                      <li>Utilisez un titre court et mémorable</li>
                                      <li>Ajoutez un logo professionnel pour renforcer votre marque</li>
                                      <li>Choisissez une URL personnalisée facile à retenir</li>
                                      <li>Ajoutez une description claire de vos activités</li>
                                    </ul>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="links" className="p-6 space-y-8">
                        <div className="space-y-6">
                          <div className="flex justify-between items-center">
                            <h2 className="text-xl font-medium">Mes Liens</h2>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center bg-muted/50 rounded-md p-0.5">
                                <Button 
                                  variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                                  size="sm" 
                                  className="h-8 px-3"
                                  onClick={() => setViewMode('list')}
                                >
                                  <LayoutGrid className="h-4 w-4 mr-1" />
                                  Liste
                                </Button>
                                <Button 
                                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                                  size="sm"
                                  className="h-8 px-3" 
                                  onClick={() => setViewMode('grid')}
                                >
                                  <Split className="h-4 w-4 mr-1" />
                                  Grille
                                </Button>
                              </div>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                              {profile.links.length} {profile.links.length > 1 ? 'liens' : 'lien'}
                            </Badge>
                            </div>
                          </div>
                        
                          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
                            <AnimatePresence>
                              {profile.links.map((link, index) => (
                                <motion.div
                                  key={link.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, x: -10 }}
                                  transition={{ duration: 0.2, delay: index * 0.05 }}
                                  className={`group relative flex ${viewMode === 'grid' ? 'flex-col h-full' : 'items-center justify-between'} p-4 bg-card rounded-xl border hover:border-primary/50 hover:shadow-md transition-all ${link.featured ? 'border-l-4 border-l-primary bg-primary/5' : 'border-muted-foreground/10'}`}
                                >
                                  <div className={`flex ${viewMode === 'grid' ? 'flex-col w-full' : 'items-center'} gap-3`}>
                                    {viewMode !== 'grid' && (
                                    <div className="flex flex-col items-center">
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => moveLinkUp(link.id)}
                                        disabled={index === 0}
                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Déplacer vers le haut"
                                      >
                                        <ArrowUp className="h-3.5 w-3.5" />
                                      </Button>
                                      <span className="text-xs font-medium text-muted-foreground">{index + 1}</span>
                                    </div>
                                    )}
                                    
                                    <div className={`flex ${viewMode === 'grid' ? 'justify-between w-full mb-3' : 'items-center'}`}>
                                      {viewMode === 'grid' && (
                                        <span className="text-xs font-medium text-muted-foreground bg-muted/70 px-2 py-1 rounded-md">#{index + 1}</span>
                                      )}
                                    <Switch 
                                      checked={link.enabled} 
                                      onCheckedChange={(checked) => updateLink(link.id, { enabled: checked })}
                                    />
                                    </div>
                                    
                                    <div className={`flex ${viewMode === 'grid' ? 'flex-col items-start' : 'items-center'} gap-3`}>
                                      {link.icon ? (
                                        <div 
                                          className={`${viewMode === 'grid' ? 'h-14 w-14 mx-auto mb-2' : 'h-10 w-10'} rounded-full overflow-hidden border border-muted-foreground/20 shadow-sm flex items-center justify-center`}
                                          style={{ backgroundColor: link.customColor || profile.accentColor || '#70C7BA' }}
                                        >
                                          <img 
                                            src={link.icon} 
                                            alt={link.title} 
                                            className="h-full w-full object-cover"
                                          />
                                        </div>
                                      ) : (
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className={`${viewMode === 'grid' ? 'h-14 w-14 mx-auto mb-2' : 'h-10 w-10'} rounded-full border-dashed`}
                                          onClick={() => {
                                            setEditingLinkId(link.id);
                                            setTimeout(() => triggerLinkIconInput(), 100);
                                          }}
                                        >
                                          {link.type === 'form' ? (
                                            <FileText className={`${viewMode === 'grid' ? 'h-6 w-6' : 'h-4 w-4'} text-muted-foreground`} />
                                          ) : (
                                            <Link2 className={`${viewMode === 'grid' ? 'h-6 w-6' : 'h-4 w-4'} text-muted-foreground`} />
                                          )}
                                        </Button>
                                      )}
                                      <div className={viewMode === 'grid' ? "text-center w-full" : ""}>
                                        <div className={`flex ${viewMode === 'grid' ? 'justify-center' : ''} items-center gap-2 mb-1`}>
                                          <p className="font-medium">{link.title}</p>
                                          {link.featured && (
                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] py-0 h-4">
                                              <Star className="h-3 w-3 mr-0.5 fill-amber-500" />
                                              Favoris
                                            </Badge>
                                          )}
                                        </div>
                                        <div className={`flex ${viewMode === 'grid' ? 'justify-center' : ''} items-center gap-1 text-sm text-muted-foreground mt-0.5`}>
                                          {link.type === 'form' ? (
                                            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                              <FileText className="h-3 w-3 mr-1" />
                                              {link.formDefinition?.length || 0} champ{link.formDefinition?.length !== 1 ? 's' : ''} • {link.clicks} réponse{link.clicks !== 1 ? 's' : ''}
                                            </Badge>
                                          ) : (
                                            <>
                                          <p className="truncate max-w-[180px] text-xs">{link.url}</p>
                                          <a 
                                            href={link.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-primary hover:text-primary/80"
                                          >
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {link.clicks > 0 && viewMode === 'grid' && (
                                    <div className="mt-2 mb-3 w-full">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-muted-foreground">Performance</span>
                                        <Badge variant="outline" className="bg-background border-muted-foreground/20">
                                          {link.type === 'form' ? (
                                            <FileText className="h-3 w-3 mr-1" />
                                          ) : (
                                            <Eye className="h-3 w-3 mr-1" />
                                          )}
                                          <span>{link.clicks}</span>
                                        </Badge>
                                      </div>
                                      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-primary"
                                          style={{ 
                                            width: `${Math.min(100, Math.max(5, (link.clicks / Math.max(1, profile.links.reduce((max: number, l: LinkItem) => Math.max(max, l.clicks), 0))) * 100))}%` 
                                          }}
                                        ></div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className={`flex items-center ${viewMode === 'grid' ? 'justify-center w-full border-t border-muted-foreground/10 pt-3 mt-auto' : 'gap-1'}`}>
                                    {link.clicks > 0 && viewMode !== 'grid' && (
                                      <Badge variant="outline" className="mr-2 bg-background border-muted-foreground/20">
                                        {link.type === 'form' ? (
                                          <FileText className="h-3 w-3 mr-1" />
                                        ) : (
                                        <Eye className="h-3 w-3 mr-1" />
                                        )}
                                        <span>{link.clicks}</span>
                                      </Badge>
                                    )}
                                    
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => toggleFeatured(link.id)}
                                      className="h-8 w-8"
                                      title={link.featured ? "Retirer des favoris" : "Mettre en favoris"}
                                    >
                                      {link.featured ? 
                                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> : 
                                        <StarOff className="h-4 w-4" />
                                      }
                                    </Button>
                                    
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => setEditingLinkId(link.id)}
                                      className="h-8 w-8"
                                      title="Modifier"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="text-destructive hover:text-destructive/80 h-8 w-8"
                                      onClick={() => removeLink(link.id)}
                                      title="Supprimer"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                            
                            {profile.links.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/30 rounded-xl border border-dashed border-muted-foreground/20">
                                <div className="p-4 rounded-full bg-primary/10">
                                  <Link2 className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="text-lg font-medium mt-4">Aucun lien</h3>
                                <p className="text-muted-foreground max-w-md mx-auto mt-2 text-sm">
                                  Ajoutez des liens ci-dessous pour commencer à créer votre page de liens personnalisée.
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {editingLinkId && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 20 }}
                              className="mt-4"
                            >
                              <Card className="border border-primary/20 bg-primary/5 backdrop-blur-sm">
                                <CardHeader className="py-3 px-4 flex flex-row justify-between items-center">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <Edit className="h-4 w-4" />
                                    Édition avancée du lien
                                  </CardTitle>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8" 
                                    onClick={() => setEditingLinkId(null)}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                  </Button>
                                </CardHeader>
                                <CardContent className="pt-0 pb-3 px-4">
                                  <EditLinkForm 
                                    link={editingLink.link} 
                                    onUpdate={updateLink}
                                    onClose={() => setEditingLinkId(null)}
                                  />
                                </CardContent>
                              </Card>
                            </motion.div>
                          )}
                          
                          <Separator />
                          
                          <div className="p-4 bg-background rounded-xl border border-muted-foreground/10 shadow-sm">
                            <h3 className="text-lg font-medium mb-4">Ajouter un nouveau lien</h3>
                            
                            <div className="grid gap-4">
                              <div className="space-y-2">
                                <Label>Type</Label>
                                <RadioGroup
                                  value="link"
                                  className="flex gap-4"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="link" id="link" checked />
                                    <Label htmlFor="link">Lien simple</Label>
                                  </div>
                                </RadioGroup>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="linkTitle">Titre</Label>
                                  <Input 
                                    id="linkTitle" 
                                    value={newLink.title} 
                                    onChange={(e) => setNewLink({...newLink, title: e.target.value, type: 'link'})}
                                    placeholder="Mon Site Web"
                                    className="bg-background/50 border-muted-foreground/20" 
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="linkUrl">URL</Label>
                                  <Input 
                                    id="linkUrl" 
                                    value={newLink.url} 
                                    onChange={(e) => setNewLink({...newLink, url: e.target.value})}
                                    placeholder="https://monsite.com"
                                    className="bg-background/50 border-muted-foreground/20" 
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Icône personnalisée</Label>
                                <div className="flex items-center gap-4">
                                  <div className="h-14 w-14 border border-muted-foreground/20 rounded-xl overflow-hidden flex items-center justify-center bg-muted/30">
                                    {newLink.icon ? (
                                      <img 
                                        src={newLink.icon} 
                                        alt="Icône" 
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex flex-col gap-2">
                                    <Button 
                                      variant="outline" 
                                      className="gap-2 items-center"
                                      onClick={triggerNewLinkIconInput}
                                      disabled={uploadingLinkIcon}
                                    >
                                      {uploadingLinkIcon ? (
                                        <>
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          Chargement...
                                        </>
                                      ) : (
                                        <>
                                          <ImageIcon className="h-4 w-4" />
                                          Ajouter une icône
                                        </>
                                      )}
                                    </Button>
                                    
                                    {newLink.icon && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="text-destructive"
                                        onClick={() => {
                                          setNewLink({...newLink, icon: undefined});
                                          toast({
                                            title: "Icône supprimée",
                                            description: "L'icône a été supprimée du nouveau lien",
                                          });
                                        }}
                                      >
                                        Supprimer
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex gap-2 justify-end mt-2">
                                <Button
                                  variant="outline"
                                  onClick={() => setNewLink({ 
                                    title: '', 
                                    url: '', 
                                    enabled: true, 
                                    type: 'link'
                                  })}
                                >
                                  Réinitialiser
                                </Button>
                                <Button 
                                  onClick={addLink} 
                                  className="gap-2 items-center"
                                  disabled={!newLink.title || (newLink.type === 'link' && !newLink.url) || (newLink.type === 'form' && (!newLink.formDefinition?.length || !newLink.formDefinition.every(f => f.label)))}
                                >
                                  <Plus className="h-4 w-4" />
                                  Ajouter
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="forms" className="p-6 space-y-8">
                        <div className="space-y-6">
                          <div className="flex justify-between items-center">
                            <h2 className="text-xl font-medium">Mes Formulaires</h2>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                              {profile.links.filter(link => link.type === 'form').length} {profile.links.filter(link => link.type === 'form').length > 1 ? 'formulaires' : 'formulaire'}
                            </Badge>
                          </div>
                        
                          <div className="space-y-4">
                            <AnimatePresence>
                              {profile.links
                                .filter(link => link.type === 'form')
                                .map((link, index) => (
                                <motion.div
                                  key={link.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, x: -10 }}
                                  transition={{ duration: 0.2 }}
                                  className={`group relative flex items-center justify-between p-4 bg-card rounded-xl border hover:border-primary/50 hover:shadow-md transition-all ${link.featured ? 'border-l-4 border-l-primary bg-primary/5' : 'border-muted-foreground/10'}`}
                                >
                                  <div className="flex items-center gap-3 flex-grow min-w-0">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                      {link.icon ? (
                                        <img src={link.icon} alt="Icon" className="h-6 w-6 object-contain" />
                                      ) : (
                                        <FileText className="h-5 w-5" />
                                      )}
                                    </div>
                                    
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-medium truncate">{link.title}</h3>
                                        {link.featured && (
                                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">
                                            Mis en avant
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                                        <p className="text-xs">
                                          {link.formDefinition?.length || 0} champ{link.formDefinition?.length !== 1 ? 's' : ''} • {link.clicks} réponse{link.clicks !== 1 ? 's' : ''}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={link.enabled}
                                      onCheckedChange={(value) => updateLink(link.id, { enabled: value })}
                                      className="data-[state=checked]:bg-primary"
                                    />
                                    
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setEditingLinkId(link.id)}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          Modifier
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => toggleFeatured(link.id)}>
                                          {link.featured ? (
                                            <>
                                              <StarOff className="h-4 w-4 mr-2" />
                                              Retirer de la une
                                            </>
                                          ) : (
                                            <>
                                              <Star className="h-4 w-4 mr-2" />
                                              Mettre à la une
                                            </>
                                          )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => copyLinkToClipboard()}>
                                          <Copy className="h-4 w-4 mr-2" />
                                          Copier le lien
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => removeLink(link.id)}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Supprimer
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>

                          {/* Section pour créer un formulaire */}
                          <Card className="p-6 border border-muted-foreground/10">
                            <CardHeader className="p-0 pb-4">
                              <CardTitle className="text-xl">Créer un nouveau formulaire</CardTitle>
                              <CardDescription>
                                Créez un formulaire pour recueillir des informations auprès de vos visiteurs.
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 space-y-4">
                              <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="formTitle">Titre du formulaire</Label>
                                  <Input 
                                    id="formTitle" 
                                    placeholder="Formulaire de contact" 
                                    value={newLink.title}
                                    onChange={(e) => setNewLink({...newLink, title: e.target.value, type: 'form'})}
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label>Champs du formulaire</Label>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const newField: FormField = {
                                          id: Date.now().toString(),
                                          label: '',
                                          type: 'text',
                                          required: false
                                        };
                                        setNewLink({
                                          ...newLink,
                                          type: 'form',
                                          formDefinition: [...(newLink.formDefinition || []), newField]
                                        });
                                      }}
                                      className="gap-2"
                                    >
                                      <Plus className="h-4 w-4" />
                                      Ajouter un champ
                                    </Button>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    {newLink.formDefinition?.map((field, index) => (
                                      <Card key={field.id} className="p-4">
                                        <div className="grid gap-4">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                              <Label>Label du champ</Label>
                                              <Input
                                                value={field.label}
                                                onChange={(e) => {
                                                  const updatedFields = [...(newLink.formDefinition || [])];
                                                  updatedFields[index] = { ...field, label: e.target.value };
                                                  setNewLink({ ...newLink, type: 'form', formDefinition: updatedFields });
                                                }}
                                                placeholder="Ex: Nom complet"
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label>Type de champ</Label>
                                              <Select
                                                value={field.type}
                                                onValueChange={(value: any) => {
                                                  const updatedFields = [...(newLink.formDefinition || [])];
                                                  updatedFields[index] = { 
                                                    ...field, 
                                                    type: value,
                                                    options: value === 'select' ? ['Option 1'] : undefined
                                                  };
                                                  setNewLink({ ...newLink, type: 'form', formDefinition: updatedFields });
                                                }}
                                              >
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Sélectionner un type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="text">Texte court</SelectItem>
                                                  <SelectItem value="textarea">Texte long</SelectItem>
                                                  <SelectItem value="email">Email</SelectItem>
                                                  <SelectItem value="number">Nombre</SelectItem>
                                                  <SelectItem value="checkbox">Case à cocher</SelectItem>
                                                  <SelectItem value="select">Liste déroulante</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          </div>
                                          
                                          {field.type === 'select' && (
                                            <div className="space-y-2">
                                              <Label>Options (séparées par des virgules)</Label>
                                              <Input
                                                value={field.options?.join(', ') || ''}
                                                onChange={(e) => {
                                                  const options = e.target.value.split(',').map(opt => opt.trim()).filter(opt => opt);
                                                  const updatedFields = [...(newLink.formDefinition || [])];
                                                  updatedFields[index] = { ...field, options };
                                                  setNewLink({ ...newLink, type: 'form', formDefinition: updatedFields });
                                                }}
                                                placeholder="Option 1, Option 2, Option 3"
                                              />
                                            </div>
                                          )}
                                          
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                              <Switch
                                                checked={field.required}
                                                onCheckedChange={(checked) => {
                                                  const updatedFields = [...(newLink.formDefinition || [])];
                                                  updatedFields[index] = { ...field, required: checked };
                                                  setNewLink({ ...newLink, type: 'form', formDefinition: updatedFields });
                                                }}
                                              />
                                              <Label>Champ requis</Label>
                                            </div>
                                            
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="text-destructive"
                                              onClick={() => {
                                                const updatedFields = (newLink.formDefinition || []).filter(
                                                  (_, i) => i !== index
                                                );
                                                setNewLink({ ...newLink, type: 'form', formDefinition: updatedFields });
                                              }}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      </Card>
                                    ))}
                                    
                                    {!newLink.formDefinition?.length && (
                                      <div className="text-center py-8 text-muted-foreground">
                                        Aucun champ ajouté. Cliquez sur "Ajouter un champ" pour commencer.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                            <CardFooter className="flex justify-end p-0 pt-4">
                              <Button
                                onClick={() => {
                                  if (!newLink.title) {
                                    toast({
                                      title: "Erreur",
                                      description: "Le titre du formulaire est requis.",
                                      variant: "destructive"
                                    });
                                    return;
                                  }
                                
                                  if (!newLink.formDefinition?.length) {
                                    toast({
                                      title: "Erreur",
                                      description: "Vous devez ajouter au moins un champ au formulaire.",
                                      variant: "destructive"
                                    });
                                    return;
                                  }
                                
                                  if (newLink.formDefinition.some(field => !field.label)) {
                                    toast({
                                      title: "Erreur",
                                      description: "Tous les champs doivent avoir un label.",
                                      variant: "destructive"
                                    });
                                    return;
                                  }
                                
                                  // Créer le nouveau lien de type formulaire
                                  const newFormItem: LinkItem = {
                                    id: '', // ID vide pour un nouvel élément
                                    title: newLink.title,
                                    url: '',
                                    enabled: true,
                                    clicks: 0,
                                    position: profile.links.length,
                                    featured: false,
                                    type: 'form',
                                    isNew: true, // Marquer comme nouveau
                                    formDefinition: newLink.formDefinition.map(field => ({
                                      id: field.id,
                                      type: field.type,
                                      label: field.label,
                                      required: Boolean(field.required),
                                      options: Array.isArray(field.options) ? field.options : []
                                    }))
                                  };
                                  
                                  // Mise à jour du profil
                                  const updatedProfile = {
                                    ...profile,
                                    links: [...profile.links, newFormItem]
                                  };
                                  
                                  setProfile(updatedProfile);
                                  setHasUnsavedChanges(true);
                                  
                                  // Réinitialisation du formulaire
                                  setNewLink({ 
                                    title: '', 
                                    url: '', 
                                    enabled: true, 
                                    type: 'form',
                                    formDefinition: [] 
                                  });
                                  
                                  toast({
                                    title: "Formulaire créé",
                                    description: "Votre formulaire a été ajouté avec succès.",
                                  });
                                }}
                                className="gap-2"
                              >
                                <Plus className="h-4 w-4" />
                                Créer le formulaire
                              </Button>
                            </CardFooter>
                          </Card>
                          
                          {profile.links.filter(link => link.type === 'form').length === 0 && newLink.formDefinition?.length === 0 && (
                            <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                              <div className="p-2 rounded-full bg-primary/10 text-primary mt-1">
                                <Sparkles className="h-4 w-4" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">Conseils pour vos formulaires</h4>
                                <ul className="text-xs text-muted-foreground mt-2 space-y-1.5 list-disc list-inside">
                                  <li>Utilisez des intitulés clairs pour chaque champ</li>
                                  <li>Limitez-vous aux champs essentiels pour augmenter le taux de conversion</li>
                                  <li>Indiquez clairement quels champs sont obligatoires</li>
                                  <li>Donnez à vos formulaires des titres explicites</li>
                                  <li>Les formulaires apparaîtront sur votre page de liens</li>
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="appearance" className="p-6 space-y-8">
                        <div className="space-y-6">
                          <Tabs defaultValue="colors" className="w-full">
                            <TabsList className="w-full grid grid-cols-4">
                              <TabsTrigger value="colors">Couleurs</TabsTrigger>
                              <TabsTrigger value="background">Arrière-plan</TabsTrigger>
                              <TabsTrigger value="buttons">Boutons</TabsTrigger>
                              <TabsTrigger value="typography">Typographie</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="colors" className="space-y-4 mt-4">
                              <div className="space-y-4">
                          <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Palette className="h-5 w-5 text-muted-foreground" />
                                    <Label className="block font-medium">Palettes de couleurs</Label>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    Sélectionnez une palette prédéfinie ou personnalisez vos couleurs ci-dessous.
                                  </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                              {presetThemes.map((theme, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  className="p-4 border rounded-xl hover:border-primary/50 transition-all text-left flex flex-col h-full"
                                  style={{ 
                                    backgroundColor: theme.backgroundColor,
                                    color: theme.textColor,
                                    borderColor: profile.accentColor === theme.accentColor && 
                                               profile.backgroundColor === theme.backgroundColor ? 
                                               theme.accentColor : undefined
                                  }}
                                  onClick={() => {
                                    setProfile({
                                      ...profile,
                                      backgroundColor: theme.backgroundColor,
                                      textColor: theme.textColor,
                                      accentColor: theme.accentColor,
                                      buttonStyle: theme.buttonStyle,
                                      animation: theme.animation,
                                      fontFamily: theme.fontFamily
                                    });
                                  }}
                                >
                                  <div 
                                    className="h-2 w-16 rounded-full mb-2"
                                    style={{ backgroundColor: theme.accentColor }}
                                  ></div>
                                  <h3 className="text-sm font-medium" style={{ color: theme.textColor }}>{theme.name}</h3>
                                  <div className="flex flex-1 items-end">
                                    <div className="flex gap-1 mt-2">
                                      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: theme.backgroundColor }}></div>
                                      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: theme.textColor }}></div>
                                      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: theme.accentColor }}></div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                    {colorPalettes.map((palette, index) => (
                                      <button
                                        key={index}
                                        type="button"
                                        className={`aspect-square rounded-md border p-2 flex flex-col hover:border-primary/50 transition-all ${
                                          profile.backgroundColor === palette.backgroundColor && 
                                          profile.textColor === palette.textColor && 
                                          profile.accentColor === palette.accentColor 
                                            ? 'ring-2 ring-primary border-primary' 
                                            : 'border-muted-foreground/20'
                                        }`}
                                        onClick={() => {
                                          setProfile({
                                            ...profile,
                                            backgroundColor: palette.backgroundColor,
                                            textColor: palette.textColor,
                                            accentColor: palette.accentColor
                                          });
                                        }}
                                      >
                                        <div className="flex-1 rounded-md overflow-hidden p-1" style={{ backgroundColor: palette.backgroundColor }}>
                                          <div className="h-full w-full rounded flex flex-col justify-between p-1">
                                            <div className="w-full h-2 rounded-full" style={{ backgroundColor: palette.accentColor }}></div>
                                            <div className="text-[8px] text-center font-medium" style={{ color: palette.textColor }}>
                                              {palette.name}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex justify-center gap-1 mt-1">
                                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: palette.backgroundColor }}></div>
                                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: palette.textColor }}></div>
                                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: palette.accentColor }}></div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                          
                                <Separator className="my-4" />
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label>Arrière-plan</Label>
                                  <div className="flex items-center gap-2">
                                    <ColorPicker 
                                      color={profile.backgroundColor} 
                                      onChange={(value) => setProfile({...profile, backgroundColor: value})}
                                      className="flex-1"
                                    />
                                    <div 
                                      className="h-10 w-10 rounded-md border flex items-center justify-center"
                                      style={{ backgroundColor: profile.backgroundColor, color: profile.textColor, borderColor: profile.accentColor }}
                                    >
                                      <span>T</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Texte</Label>
                                  <div className="flex items-center gap-2">
                                    <ColorPicker 
                                      color={profile.textColor} 
                                      onChange={(value) => setProfile({...profile, textColor: value})}
                                      className="flex-1"
                                    />
                                    <div 
                                      className="h-10 w-10 rounded-md flex items-center justify-center"
                                      style={{ backgroundColor: profile.textColor, color: profile.backgroundColor }}
                                    >
                                      <span>A</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Accent</Label>
                                  <div className="flex items-center gap-2">
                                    <ColorPicker 
                                      color={profile.accentColor} 
                                      onChange={(value) => setProfile({...profile, accentColor: value})}
                                      className="flex-1"
                                    />
                                    <div 
                                      className="h-10 w-10 rounded-md flex items-center justify-center"
                                      style={{ backgroundColor: profile.accentColor, color: '#ffffff' }}
                                    >
                                      <span>A</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-6 bg-muted/30 p-4 rounded-lg border border-muted-foreground/10">
                                <h3 className="text-sm font-medium mb-3">Aperçu des couleurs</h3>
                                <div 
                                  className="p-4 rounded-lg flex flex-col items-center space-y-3 min-h-[100px]"
                                  style={{ 
                                    backgroundColor: profile.backgroundColor,
                                    color: profile.textColor
                                  }}
                                >
                                  <div className="text-base font-medium" style={{ color: profile.textColor }}>
                                    Texte normal
                                  </div>
                                  <div className="text-sm" style={{ color: profile.textColor }}>
                                    Description plus petite
                                  </div>
                                  <div 
                                    className="px-4 py-2 rounded-md text-sm font-medium"
                                    style={{ 
                                      backgroundColor: profile.accentColor,
                                      color: '#ffffff'
                                    }}
                                  >
                                    Bouton d'action
                                  </div>
                                </div>
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="background" className="space-y-4 mt-4">
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Image d'arrière-plan</Label>
                                  <div className="flex items-start gap-4">
                                    <div 
                                      className="h-28 w-28 rounded-lg overflow-hidden bg-muted/30 border border-muted-foreground/10 flex items-center justify-center"
                                    >
                                      {profile.backgroundImage ? (
                                        <img 
                                          src={profile.backgroundImage} 
                                          alt="Arrière-plan" 
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="flex flex-col items-center justify-center h-full w-full text-muted-foreground">
                                          <ImageIcon className="h-6 w-6 mb-1" />
                                          <span className="text-xs">Aucune image</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="flex flex-col gap-2">
                                      <Button 
                                        variant="outline" 
                                        className="gap-2 items-center"
                                        onClick={triggerBackgroundInput}
                                        disabled={uploadingBackground}
                                      >
                                        {uploadingBackground ? (
                                          <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Chargement...
                                          </>
                                        ) : (
                                          <>
                                            <ImageIcon className="h-4 w-4" />
                                            {profile.backgroundImage ? 'Changer l\'image' : 'Ajouter une image'}
                                          </>
                                        )}
                                      </Button>
                                      
                                      {profile.backgroundImage && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          className="text-destructive"
                                          onClick={() => {
                                            const updatedProfile = { ...profile, backgroundImage: '' };
                                            setProfile(updatedProfile);
                                            saveProfileMutation.mutate(updatedProfile);
                                            toast({
                                              title: "Image d'arrière-plan supprimée",
                                              description: "L'image d'arrière-plan a été supprimée",
                                            });
                                          }}
                                        >
                                          Supprimer
                                        </Button>
                                      )}
                                      
                                      <input 
                                        type="file" 
                                        ref={backgroundInputRef}
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleBackgroundUpload}
                                      />
                                    </div>
                                  </div>
                                </div>
                                
                                {profile.backgroundImage && (
                                  <div className="space-y-4 mt-4 border border-border rounded-lg p-4">
                                    <h3 className="text-sm font-semibold">Options d'image</h3>
                                    
                                    <div className="space-y-6">
                                <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <Label>Position</Label>
                                          <span className="text-xs text-muted-foreground">{profile.backgroundPosition || 'center'}</span>
                                        </div>
                                        <Select
                                          value={profile.backgroundPosition || 'center'}
                                          onValueChange={(value) => setProfile({...profile, backgroundPosition: value})}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Position" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="center">Centre</SelectItem>
                                            <SelectItem value="top">Haut</SelectItem>
                                            <SelectItem value="bottom">Bas</SelectItem>
                                            <SelectItem value="left">Gauche</SelectItem>
                                            <SelectItem value="right">Droite</SelectItem>
                                            <SelectItem value="top left">Haut Gauche</SelectItem>
                                            <SelectItem value="top right">Haut Droite</SelectItem>
                                            <SelectItem value="bottom left">Bas Gauche</SelectItem>
                                            <SelectItem value="bottom right">Bas Droite</SelectItem>
                                          </SelectContent>
                                        </Select>
                                                </div>
                                      
                                      <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <Label>Flou</Label>
                                          <span className="text-xs text-muted-foreground">{profile.backgroundBlur || 0}px</span>
                                              </div>
                                        <Slider
                                          min={0}
                                          max={20}
                                          step={1}
                                          value={[profile.backgroundBlur || 0]}
                                          onValueChange={(value) => setProfile({...profile, backgroundBlur: value[0]})}
                                        />
                                          </div>
                                      
                                      <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <Label>Luminosité</Label>
                                          <span className="text-xs text-muted-foreground">{profile.backgroundBrightness || 100}%</span>
                                          </div>
                                        <Slider
                                          min={20}
                                          max={200}
                                          step={5}
                                          value={[profile.backgroundBrightness || 100]}
                                          onValueChange={(value) => setProfile({...profile, backgroundBrightness: value[0]})}
                                        />
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <Label>Contraste</Label>
                                          <span className="text-xs text-muted-foreground">{profile.backgroundContrast || 100}%</span>
                                  </div>
                                        <Slider
                                          min={20}
                                          max={200}
                                          step={5}
                                          value={[profile.backgroundContrast || 100]}
                                          onValueChange={(value) => setProfile({...profile, backgroundContrast: value[0]})}
                                        />
                                </div>
                                
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <Label>Saturation</Label>
                                          <span className="text-xs text-muted-foreground">{profile.backgroundSaturation || 100}%</span>
                                        </div>
                                        <Slider
                                          min={0}
                                          max={200}
                                          step={5}
                                          value={[profile.backgroundSaturation || 100]}
                                          onValueChange={(value) => setProfile({...profile, backgroundSaturation: value[0]})}
                                        />
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <Label>Rotation teinte</Label>
                                          <span className="text-xs text-muted-foreground">{profile.backgroundHueRotate || 0}°</span>
                                        </div>
                                        <Slider
                                          min={0}
                                          max={360}
                                          step={5}
                                          value={[profile.backgroundHueRotate || 0]}
                                          onValueChange={(value) => setProfile({...profile, backgroundHueRotate: value[0]})}
                                        />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <Label>Sépia</Label>
                                          <span className="text-xs text-muted-foreground">{profile.backgroundSepia || 0}%</span>
                                        </div>
                                        <Slider 
                                          min={0}
                                          max={100} 
                                          step={5}
                                          value={[profile.backgroundSepia || 0]}
                                          onValueChange={(value) => setProfile({...profile, backgroundSepia: value[0]})}
                                        />
                                        </div>
                                      
                                      <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <Label>Noir et blanc</Label>
                                          <span className="text-xs text-muted-foreground">{profile.backgroundGrayscale || 0}%</span>
                                        </div>
                                        <Slider
                                          min={0}
                                          max={100}
                                          step={5}
                                          value={[profile.backgroundGrayscale || 0]}
                                          onValueChange={(value) => setProfile({...profile, backgroundGrayscale: value[0]})}
                                        />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <Label>Inverser</Label>
                                          <span className="text-xs text-muted-foreground">{profile.backgroundInvert || 0}%</span>
                                        </div>
                                        <Slider 
                                          min={0}
                                          max={100}
                                          step={5}
                                          value={[profile.backgroundInvert || 0]}
                                          onValueChange={(value) => setProfile({...profile, backgroundInvert: value[0]})}
                                        />
                                        </div>
                                      
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                          <Label>Filtre couleur</Label>
                                          {profile.backgroundColorFilter && (
                                            <Button 
                                              variant="ghost" 
                                              size="sm"
                                              className="h-6 text-xs"
                                              onClick={() => setProfile({...profile, backgroundColorFilter: ''})}
                                            >
                                              <X className="h-3 w-3 mr-1" />
                                              Supprimer
                                            </Button>
                                          )}
                                      </div>
                                        <div className="flex items-center gap-2">
                                          <ColorPicker 
                                            color={profile.backgroundColorFilter || '#000000'} 
                                            onChange={(value) => setProfile({...profile, backgroundColorFilter: value})}
                                            className="flex-1"
                                          />
                                          <div 
                                            className="h-10 w-10 rounded-md flex items-center justify-center"
                                            style={{ 
                                              backgroundColor: profile.backgroundColorFilter || '#000000'
                                            }}
                                          ></div>
                                    </div>
                                    
                                        {profile.backgroundColorFilter && (
                                          <div className="mt-2">
                                            <div className="flex justify-between">
                                              <Label>Opacité du filtre</Label>
                                              <span className="text-xs text-muted-foreground">{Math.round((profile.backgroundColorFilterOpacity || 0.3) * 100)}%</span>
                                            </div>
                                            <Slider
                                              min={0}
                                              max={100}
                                              step={5}
                                              value={[Math.round((profile.backgroundColorFilterOpacity || 0.3) * 100)]}
                                              onValueChange={(value) => setProfile({...profile, backgroundColorFilterOpacity: value[0] / 100})}
                                            />
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                          <Label>Superposition</Label>
                                          {profile.backgroundOverlay && (
                                            <Button 
                                              variant="ghost" 
                                              size="sm"
                                              className="h-6 text-xs"
                                              onClick={() => setProfile({...profile, backgroundOverlay: ''})}
                                            >
                                              <X className="h-3 w-3 mr-1" />
                                              Supprimer
                                            </Button>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-5 gap-2">
                                          {[
                                            { id: '', name: 'Aucune', color: 'transparent' },
                                            { id: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 100%)', name: 'Fondu noir', color: '#000000' },
                                            { id: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 100%)', name: 'Fondu blanc', color: '#ffffff' },
                                            { id: 'rgba(0,0,0,0.3)', name: 'Sombre', color: '#000000' },
                                            { id: 'rgba(255,255,255,0.3)', name: 'Clair', color: '#ffffff' },
                                          ].map(overlay => (
                                            <div
                                              key={overlay.name}
                                              className={`aspect-square rounded-md overflow-hidden cursor-pointer border transition-all ${profile.backgroundOverlay === overlay.id ? 'border-primary ring-2 ring-primary/20' : 'border-muted-foreground/10'}`}
                                        style={{
                                                background: overlay.id || '#666',
                                                opacity: overlay.id ? 1 : 0.1
                                              }}
                                              onClick={() => {
                                                console.log('Overlay sélectionné:', overlay.id);
                                                // Assurez-vous que l'overlay est correctement appliqué
                                                const updatedProfile = {
                                                  ...profile, 
                                                  backgroundOverlay: overlay.id
                                                };
                                                console.log('Profil mis à jour:', updatedProfile);
                                                setProfile(updatedProfile);
                                                // Forcer un rafraîchissement de l'aperçu
                                                setPreviewProfile({
                                                  ...profile,
                                                  backgroundOverlay: overlay.id
                                                });
                                              }}
                                              title={overlay.name}
                                            >
                                              {!overlay.id && (
                                                <div className="w-full h-full flex items-center justify-center">
                                                  <X className="h-3 w-3 text-muted-foreground" />
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Section "Motif d'arrière-plan" supprimée */}
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="buttons" className="space-y-4 mt-4">
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Style des boutons</Label>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {buttonStyles.map(style => (
                                      <div
                                        key={style.id}
                                        className={`relative p-4 rounded-md cursor-pointer border ${profile.buttonStyle === style.id ? 'border-primary ring-2 ring-primary/20' : 'border-muted-foreground/10'}`}
                                        onClick={() => {
                                          setProfile({...profile, buttonStyle: style.id});
                                        }}
                                      >
                                        <div 
                                          className={`w-full py-2 text-center text-sm font-medium ${
                                            style.id === 'pill' ? 'rounded-full' :
                                            style.id === 'square' ? 'rounded-none' :
                                            style.id === 'rounded' ? 'rounded-md' :
                                            style.id === 'shadow' ? 'rounded-md shadow-md' :
                                            style.id === 'outline' ? 'rounded-md border-2' :
                                            style.id === 'gradient' ? 'rounded-md bg-gradient-to-r' :
                                            style.id === 'glassmorphism' ? 'rounded-md bg-white/10 backdrop-blur-sm' :
                                            style.id === 'neon' ? 'rounded-md shadow-[0_0_10px_rgba(0,0,0,0.3)]' :
                                            style.id === 'brutalist' ? 'rounded-none border-4 border-black' :
                                            'rounded-md'
                                          }`}
                                          style={
                                            style.id === 'gradient' ? 
                                            { backgroundImage: `linear-gradient(to right, ${profile.accentColor}, ${profile.accentColor}90)` } : 
                                            style.id === 'neon' ?
                                            { boxShadow: `0 0 10px ${profile.accentColor}, 0 0 20px ${profile.accentColor}50` } :
                                            style.id === 'brutalist' ?
                                            { borderColor: profile.accentColor, borderStyle: 'solid' } :
                                            { backgroundColor: style.id !== 'outline' && style.id !== 'glassmorphism' ? profile.accentColor : 'transparent', borderColor: profile.accentColor }
                                          }
                                        >
                                          <span style={{ color: style.id === 'outline' ? profile.accentColor : '#ffffff' }}>
                                            {style.name}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="buttonRadius">Arrondi des boutons</Label>
                                  <div className="flex flex-col space-y-1">
                                    <Slider 
                                      id="buttonRadius"
                                      min={0} 
                                      max={20} 
                                      step={1}
                                      value={[profile.buttonRadius || 8]} 
                                      onValueChange={([value]) => setProfile({...profile, buttonRadius: value})}
                                      disabled={profile.buttonStyle === 'pill'}
                                      className="py-2"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                      <span>Carré</span>
                                      <span>Arrondi</span>
                                      <span>Très arrondi</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Animation des boutons</Label>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {animationOptions.map(animation => (
                                      <button
                                        key={animation.id}
                                        type="button"
                                        className={`relative p-3 rounded-md border text-center ${profile.animation === animation.id ? 'border-primary ring-2 ring-primary/20' : 'border-muted-foreground/10'}`}
                                        onClick={() => {
                                          setProfile({...profile, animation: animation.id === 'none' ? '' : animation.id});
                                        }}
                                      >
                                        <span className="text-sm">{animation.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="typography" className="space-y-4 mt-4">
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Police</Label>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {fontOptions.map(font => (
                                      <button
                                        key={font.id}
                                        type="button"
                                        className={`relative p-3 rounded-md border text-center ${profile.fontFamily === font.id ? 'border-primary ring-2 ring-primary/20' : 'border-muted-foreground/10'}`}
                                        style={{ fontFamily: font.id }}
                                        onClick={() => {
                                          setProfile({...profile, fontFamily: font.id});
                                        }}
                                      >
                                        <span className="text-sm font-medium">{font.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="iconSize">Taille des icônes</Label>
                                  <div className="flex flex-col space-y-1">
                                    <Slider 
                                      id="iconSize"
                                      min={4} 
                                      max={16} 
                                      step={1}
                                      value={[profile.iconSize || 8]} 
                                      onValueChange={([value]) => setProfile({...profile, iconSize: value})}
                                      className="py-2"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                      <span>Petit</span>
                                      <span>Moyen</span>
                                      <span>Grand</span>
                                    </div>
                                    <div className="flex justify-center mt-2">
                                      <div 
                                        className="rounded-full overflow-hidden border border-muted-foreground/20"
                                        style={{ 
                                          width: `${profile.iconSize ? profile.iconSize * 4 : 32}px`, 
                                          height: `${profile.iconSize ? profile.iconSize * 4 : 32}px`,
                                          backgroundColor: profile.accentColor
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="stats" className="p-6 space-y-8">
                        <div className="space-y-6">
                          <h2 className="text-xl font-medium">Statistiques & Performances</h2>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="bg-gradient-to-br from-primary/5 to-background border border-primary/10 shadow-sm">
                              <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                  <div className="p-3 rounded-full bg-primary/10">
                                    <Eye className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Vues totales</p>
                                    <p className="text-3xl font-bold">{profile.views}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card className="bg-gradient-to-br from-primary/5 to-background border border-primary/10 shadow-sm">
                              <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                  <div className="p-3 rounded-full bg-primary/10">
                                    <Link2 className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Clics totaux</p>
                                    <p className="text-3xl font-bold">
                                      {profile.links.reduce((acc: number, link: LinkItem) => acc + link.clicks, 0)}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card className="bg-gradient-to-br from-primary/5 to-background border border-primary/10 shadow-sm">
                              <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                  <div className="p-3 rounded-full bg-primary/10">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Taux de clic</p>
                                    <p className="text-3xl font-bold">
                                      {profile.views > 0 
                                        ? Math.round((profile.links.reduce((acc: number, link: LinkItem) => acc + link.clicks, 0) / profile.views) * 100) 
                                        : 0}%
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                          
                          {profile.links.length > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium">Performance par lien</h3>
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                  {profile.links.reduce((acc: number, link: LinkItem) => acc + link.clicks, 0)} clics au total
                                </Badge>
                              </div>
                              
                              <Card className="border border-muted-foreground/10">
                                <CardContent className="p-4 space-y-3">
                                  {profile.links
                                    .filter(link => link.enabled)
                                    .sort((a, b) => b.clicks - a.clicks)
                                    .map((link, index) => {
                                      const totalClicks = profile.links.reduce((acc: number, link: LinkItem) => acc + link.clicks, 0);
                                      const percentage = totalClicks > 0 ? (link.clicks / totalClicks) * 100 : 0;
                                      
                                      return (
                                        <div key={link.id} className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              {link.icon ? (
                                                <div className="h-8 w-8 rounded-full overflow-hidden">
                                                  <img src={link.icon} alt="" className="h-full w-full object-cover" />
                                                </div>
                                              ) : (
                                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                                  <Link2 className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                              )}
                                              <div>
                                                <p className="font-medium">{link.title}</p>
                                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{link.url}</p>
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <p className="text-xl font-bold">{link.clicks}</p>
                                              <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% des clics</p>
                                            </div>
                                          </div>
                                          <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
                                            <div 
                                              className="h-full bg-primary"
                                              style={{ width: `${Math.max(3, percentage)}%` }}
                                            ></div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </CardContent>
                              </Card>
                            </div>
                          )}
                          
                          {/* Section Réponses aux formulaires */}
                          {profile.links.filter(link => link.type === 'form' && link.clicks > 0).length > 0 && (
                            <div className="mt-8">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium">Réponses aux formulaires</h3>
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                  {profile.links.filter(link => link.type === 'form').reduce((acc, link) => acc + link.clicks, 0)} réponses au total
                                </Badge>
                              </div>
                              
                              <FormSubmissionsViewer 
                                links={profile.links.filter(link => link.type === 'form' && link.clicks > 0)} 
                                profile={profile}
                              />
                            </div>
                          )}
                          
                          {profile.links.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-xl border border-dashed border-muted-foreground/20">
                              <div className="p-4 rounded-full bg-primary/10">
                                <BarChart3 className="h-8 w-8 text-primary" />
                              </div>
                              <h3 className="text-lg font-medium mt-4">Aucune donnée disponible</h3>
                              <p className="text-muted-foreground max-w-md mx-auto mt-2 text-sm">
                                Ajoutez des liens et commencez à partager votre page pour générer des statistiques.
                              </p>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
              
              {/* Mobile Preview */}
              {!previewMode && isSideBySideView && (
                <div className="lg:col-span-4">
                  <Card className="border-none shadow-lg sticky top-24 bg-gradient-to-br from-background to-muted/50">
                    <CardContent className="p-6 flex flex-col items-center">
                      <div className="flex items-center justify-between w-full mb-6">
                        <h3 className="text-lg font-medium">Aperçu en direct</h3>
                        {hasUnsavedChanges && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                            Non enregistré
                          </Badge>
                        )}
                      </div>
                      <motion.div 
                        className="relative w-[280px] h-[560px] border-8 border-gray-800 rounded-[40px] shadow-xl overflow-hidden bg-black"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[120px] h-[30px] bg-gray-800 rounded-b-[14px] z-10"></div>
                        <div className="absolute right-[-4px] top-[70px] h-[60px] w-[4px] bg-gray-900 rounded-l-lg"></div>
                        <div className="absolute right-[-4px] top-[140px] h-[100px] w-[4px] bg-gray-900 rounded-l-lg"></div>
                        <div className="absolute left-[-4px] top-[180px] h-[40px] w-[4px] bg-gray-900 rounded-r-lg"></div>
                        <iframe
                          key={JSON.stringify(previewProfile)} // Force refresh when previewProfile changes
                          src={`/u/${previewProfile.slug || 'preview'}?preview=true&data=${encodeURIComponent(JSON.stringify(previewProfile))}`}
                          className="w-full h-full border-0 z-0"
                          title="Aperçu de votre page"
                        />
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-[120px] h-[4px] bg-gray-700 rounded-full"></div>
                      </motion.div>
                      <div className="mt-6 flex flex-col items-center">
                        <p className="text-sm text-muted-foreground">URL de partage</p>
                        <div className="flex items-center mt-2">
                          <div className="relative group">
                            <div className="flex items-center bg-muted/70 backdrop-blur-sm rounded-md py-1.5 px-3 pr-8 border border-muted-foreground/10">
                              <Globe className="h-3.5 w-3.5 text-muted-foreground mr-2" />
                              <code className="text-xs">
                            {window.location.origin}/u/{previewProfile.slug || 'votre-lien'}
                          </code>
                            </div>
                          <Button
                            variant="ghost"
                            size="icon"
                              className="h-6 w-6 absolute right-1 top-1"
                            onClick={copyLinkToClipboard}
                          >
                              <Copy className="h-3 w-3 group-hover:scale-110 transition-transform" />
                          </Button>
                        </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-4 text-sm bg-muted/50 hover:bg-muted"
                          onClick={() => window.open(`/u/${previewProfile.slug}`, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-2" />
                          Ouvrir dans un nouvel onglet
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 