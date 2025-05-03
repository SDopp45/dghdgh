import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building, 
  Sparkles, 
  Home, 
  Settings, 
  FileText, 
  MessageSquare, 
  PenSquare, 
  Sliders, 
  Globe, 
  Lightbulb, 
  Image, 
  Zap,
  Wallet,
  UserCheck,
  BarChart2,
  ArrowRight,
  Target,
  ChevronDown
} from "lucide-react";
import { Property } from "@/lib/types";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";

interface ListingGeneratorFormProps {
  properties: Property[];
  isLoading: boolean;
  selectedProperty: Property | null;
  onPropertySelect: (propertyId: string) => void;
  listingType: 'sale' | 'rental';
  onListingTypeChange: (type: 'sale' | 'rental') => void;
  selectedPortal: string;
  onPortalChange: (portal: string) => void;
  targetAudience: string;
  onTargetAudienceChange: (audience: string) => void;
  onGenerate: (options?: any) => void;
  isGenerating: boolean;
}

export function ListingGeneratorForm({
  properties,
  isLoading,
  selectedProperty,
  onPropertySelect,
  listingType,
  onListingTypeChange,
  selectedPortal,
  onPortalChange,
  targetAudience,
  onTargetAudienceChange,
  onGenerate,
  isGenerating
}: ListingGeneratorFormProps) {
  const [advancedMode, setAdvancedMode] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [tone, setTone] = useState("professional");
  const [detailLevel, setDetailLevel] = useState(50);
  const [includeCompanyInfo, setIncludeCompanyInfo] = useState(false);
  const [includeFees, setIncludeFees] = useState(false);
  const [includeVirtualTour, setIncludeVirtualTour] = useState(false);
  const [includeAvailability, setIncludeAvailability] = useState(false);
  const [includeTechnicalDocs, setIncludeTechnicalDocs] = useState(false);
  const [includeExclusivity, setIncludeExclusivity] = useState(false);
  const [virtualTourLink, setVirtualTourLink] = useState("");
  const [availabilityInfo, setAvailabilityInfo] = useState({
    availableFrom: "",
    visitDays: ""
  });
  const [technicalDocsInfo, setTechnicalDocsInfo] = useState({
    hasDPE: false,
    hasAsbestos: false,
    hasLead: false,
    hasElectrical: false
  });
  const [companyInfo, setCompanyInfo] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    siret: ""
  });
  const [feesInfo, setFeesInfo] = useState({
    agencyFees: "",
    notaryFees: "",
    otherFees: ""
  });
  const [emphasisFeatures, setEmphasisFeatures] = useState({
    location: true,
    amenities: true,
    energyRating: true,
    transport: false,
    schools: false,
    investment: false,
    surroundings: false,
    localServices: false,
    security: false,
    view: false,
    renovations: false,
    exteriors: false,
    parking: false,
    buildingQuality: false,
    connectivity: false,
    quietness: false,
    potentialDevelopment: false,
    lowCharges: false
  });
  const [customDescription, setCustomDescription] = useState("");
  const [maxLength, setMaxLength] = useState(2000);
  const [includeKeywords, setIncludeKeywords] = useState("");
  const [generateImages, setGenerateImages] = useState(false);
  const [showCompanyInfo, setShowCompanyInfo] = useState(false);
  const [showFeesInfo, setShowFeesInfo] = useState(false);
  const [hideAddressNumber, setHideAddressNumber] = useState(false);
  const [includeRentalDetails, setIncludeRentalDetails] = useState(false);
  const [rentalDetails, setRentalDetails] = useState({
    charges: "",
    deposit: "",
    availabilityDate: "",
    leaseDuration: ""
  });

  const portals = [
    { id: "leboncoin", name: "Leboncoin" },
    { id: "seloger", name: "SeLoger" },
    { id: "logic-immo", name: "Logic-Immo" },
    { id: "pap", name: "PAP" },
    { id: "bienici", name: "Bien'ici" },
    { id: "avendrealouer", name: "À Vendre À Louer" },
    { id: "century21", name: "Century 21" },
    { id: "orpi", name: "Orpi" },
    { id: "foncia", name: "Foncia" },
    { id: "iadfrance", name: "IAD France" },
    { id: "laforet", name: "Laforêt" },
    { id: "nestenn", name: "Nestenn" },
    { id: "stephaneplazaimmobilier", name: "Stéphane Plaza Immobilier" },
    { id: "facebook", name: "Facebook Marketplace" },
    { id: "instagram", name: "Instagram" },
    { id: "meilleurs-agents", name: "Meilleurs Agents" },
    { id: "immoweb", name: "Immoweb (Belgique)" },
    { id: "idealista", name: "Idealista (Espagne/Portugal)" },
    { id: "rightmove", name: "Rightmove (UK)" },
    { id: "zillow", name: "Zillow (USA)" },
    { id: "fnaim", name: "FNAIM" },
    { id: "figaro-immobilier", name: "Figaro Immobilier" },
    { id: "autres", name: "Autres portails" },
  ];

  const audiences = [
    { id: "general", name: "Grand public" },
    { id: "luxury", name: "Haut de gamme" },
    { id: "investor", name: "Investisseurs" },
    { id: "firsttime", name: "Premiers acheteurs" },
    { id: "family", name: "Familles" },
    { id: "student", name: "Étudiants" },
    { id: "senior", name: "Seniors" },
    { id: "expat", name: "Expatriés" },
    { id: "professional", name: "Professionnels" },
    { id: "airbnb", name: "Locataires courts séjours" },
    { id: "coliving", name: "Colocation" },
    { id: "retirement", name: "Retraités" },
    { id: "entrepreneur", name: "Entrepreneurs" },
    { id: "international", name: "Clientèle internationale" },
    { id: "ecofriendly", name: "Écologistes" }
  ];

  const tones = [
    { id: "professional", name: "Professionnel" },
    { id: "friendly", name: "Amical" },
    { id: "luxury", name: "Haut de gamme" },
    { id: "enthusiastic", name: "Enthousiaste" },
    { id: "minimal", name: "Minimaliste" },
    { id: "authentic", name: "Authentique" },
    { id: "persuasive", name: "Persuasif" },
    { id: "storytelling", name: "Narratif" },
    { id: "technical", name: "Technique" }
  ];

  // Chargement des données sauvegardées depuis localStorage
  useEffect(() => {
    const savedCompanyInfo = localStorage.getItem('listing_companyInfo');
    const savedFeesInfo = localStorage.getItem('listing_feesInfo');
    const savedIncludeCompanyInfo = localStorage.getItem('listing_includeCompanyInfo');
    const savedIncludeFees = localStorage.getItem('listing_includeFees');
    
    if (savedCompanyInfo) {
      try {
        setCompanyInfo(JSON.parse(savedCompanyInfo));
      } catch (e) {
        console.error('Erreur lors du chargement des infos de l\'entreprise:', e);
      }
    }
    
    if (savedFeesInfo) {
      try {
        setFeesInfo(JSON.parse(savedFeesInfo));
      } catch (e) {
        console.error('Erreur lors du chargement des infos des frais:', e);
      }
    }
    
    if (savedIncludeCompanyInfo) {
      setIncludeCompanyInfo(savedIncludeCompanyInfo === 'true');
    }
    
    if (savedIncludeFees) {
      setIncludeFees(savedIncludeFees === 'true');
    }
  }, []);
  
  // Sauvegarde des données dans localStorage
  const saveDataToLocalStorage = () => {
    localStorage.setItem('listing_companyInfo', JSON.stringify(companyInfo));
    localStorage.setItem('listing_feesInfo', JSON.stringify(feesInfo));
    localStorage.setItem('listing_includeCompanyInfo', String(includeCompanyInfo));
    localStorage.setItem('listing_includeFees', String(includeFees));
    
    toast({
      title: "Informations sauvegardées",
      description: "Vos informations ont été enregistrées pour une utilisation future",
      duration: 3000,
    });
  };
  
  // Sauvegarde automatique lorsque les informations changent
  useEffect(() => {
    if (companyInfo.name || feesInfo.agencyFees) {
      localStorage.setItem('listing_companyInfo', JSON.stringify(companyInfo));
      localStorage.setItem('listing_feesInfo', JSON.stringify(feesInfo));
      localStorage.setItem('listing_includeCompanyInfo', String(includeCompanyInfo));
      localStorage.setItem('listing_includeFees', String(includeFees));
    }
  }, [companyInfo, feesInfo, includeCompanyInfo, includeFees]);

  // Mise à jour automatique du ton et des caractéristiques en fonction du portail et de l'audience
  React.useEffect(() => {
    // Adapter le ton selon le portail
    let newTone = "professional";
    
    // Configuration du ton par portail
    if (selectedPortal === "leboncoin") {
      newTone = "friendly";
    } else if (selectedPortal === "seloger") {
      newTone = "professional";
    } else if (selectedPortal === "bienici") {
      newTone = "persuasive";
    } else if (selectedPortal === "pap") {
      newTone = "authentic";
    } else if (selectedPortal === "facebook" || selectedPortal === "instagram") {
      newTone = "enthusiastic";
    } else if (selectedPortal === "logic-immo") {
      newTone = "persuasive";
    } else if (selectedPortal === "avendrealouer") {
      newTone = "professional";
    } else if (selectedPortal === "century21" || selectedPortal === "orpi" || selectedPortal === "foncia" || 
              selectedPortal === "laforet" || selectedPortal === "stephaneplazaimmobilier" || selectedPortal === "nestenn") {
      newTone = "professional";
    } else if (selectedPortal === "iadfrance") {
      newTone = "authentic";
    } else if (selectedPortal === "meilleurs-agents") {
      newTone = "technical";
    } else if (selectedPortal === "figaro-immobilier") {
      newTone = "luxury";
    } else if (selectedPortal === "immoweb" || selectedPortal === "idealista" || 
              selectedPortal === "rightmove" || selectedPortal === "zillow") {
      newTone = "storytelling"; // Plus narratif pour les portails internationaux
    }
    
    // Affiner le ton selon l'audience cible (priorité sur le portail)
    if (targetAudience === "luxury") {
      newTone = "luxury";
    } else if (targetAudience === "investor") {
      newTone = "technical";
    } else if (targetAudience === "family") {
      newTone = "storytelling";
    } else if (targetAudience === "student") {
      newTone = "minimal";
    } else if (targetAudience === "ecofriendly") {
      newTone = "authentic";
    } else if (targetAudience === "firsttime") {
      newTone = "friendly";
    } else if (targetAudience === "senior" || targetAudience === "retirement") {
      newTone = "authentic";
    } else if (targetAudience === "expat" || targetAudience === "international") {
      newTone = "storytelling";
    } else if (targetAudience === "professional" || targetAudience === "entrepreneur") {
      newTone = "persuasive";
    } else if (targetAudience === "airbnb" || targetAudience === "coliving") {
      newTone = "enthusiastic";
    }
    
    // Adapter le niveau de détail selon le portail et l'audience
    let newDetailLevel = 50;
    
    // Niveau de détail par portail
    if (selectedPortal === "seloger" || selectedPortal === "bienici" || 
        selectedPortal === "figaro-immobilier" || selectedPortal === "meilleurs-agents") {
      newDetailLevel = 70; // Portails premium, plus détaillés
    } else if (selectedPortal === "leboncoin" || selectedPortal === "pap" || 
              selectedPortal === "century21" || selectedPortal === "orpi" || selectedPortal === "foncia") {
      newDetailLevel = 50; // Portails standard
    } else if (selectedPortal === "facebook" || selectedPortal === "instagram") {
      newDetailLevel = 30; // Réseaux sociaux, plus concis
    } else if (selectedPortal === "immoweb" || selectedPortal === "idealista" || 
              selectedPortal === "rightmove" || selectedPortal === "zillow") {
      newDetailLevel = 75; // Portails internationaux, très détaillés
    } else if (selectedPortal === "iadfrance" || selectedPortal === "stephaneplazaimmobilier") {
      newDetailLevel = 65; // Réseaux d'agents, assez détaillés
    }
    
    // Ajustement par audience
    if (targetAudience === "investor" || targetAudience === "luxury") {
      newDetailLevel += 20; // Plus de détails pour ces audiences
    } else if (targetAudience === "student" || targetAudience === "firsttime") {
      newDetailLevel -= 10; // Moins de détails pour ces audiences
    } else if (targetAudience === "professional" || targetAudience === "entrepreneur") {
      newDetailLevel += 15; // Audience business, détail technique
    } else if (targetAudience === "family") {
      newDetailLevel += 5; // Détails sur l'environnement et les services
    } else if (targetAudience === "senior" || targetAudience === "retirement") {
      newDetailLevel += 10; // Détails sur l'accessibilité et les services
    } else if (targetAudience === "expat" || targetAudience === "international") {
      newDetailLevel += 15; // Détails sur le contexte local
    } else if (targetAudience === "airbnb") {
      newDetailLevel -= 5; // Concis mais attractif
    } else if (targetAudience === "coliving") {
      newDetailLevel += 5; // Focus sur espaces communs
    } else if (targetAudience === "ecofriendly") {
      newDetailLevel += 10; // Détails sur la performance énergétique
    }
    
    // S'assurer que les valeurs restent dans les limites
    newDetailLevel = Math.min(Math.max(newDetailLevel, 20), 90);
    
    // Mise à jour des caractéristiques à mettre en avant selon l'audience
    const newEmphasisFeatures = {
      location: true, // Toujours actif par défaut
      amenities: true, // Toujours actif par défaut
      energyRating: targetAudience === "ecofriendly" || targetAudience === "investor",
      transport: targetAudience === "student" || targetAudience === "expat" || targetAudience === "international" || targetAudience === "coliving",
      schools: targetAudience === "family" || targetAudience === "firsttime",
      investment: targetAudience === "investor" || targetAudience === "professional" || targetAudience === "entrepreneur",
      surroundings: targetAudience === "luxury" || targetAudience === "family" || targetAudience === "ecofriendly" || targetAudience === "retirement" || targetAudience === "senior",
      localServices: targetAudience === "senior" || targetAudience === "retirement" || targetAudience === "expat" || targetAudience === "international" || targetAudience === "airbnb" || targetAudience === "coliving",
      security: targetAudience === "luxury" || targetAudience === "family" || targetAudience === "ecofriendly" || targetAudience === "retirement" || targetAudience === "senior",
      view: targetAudience === "luxury" || targetAudience === "family" || targetAudience === "ecofriendly" || targetAudience === "retirement" || targetAudience === "senior",
      renovations: targetAudience === "luxury" || targetAudience === "family" || targetAudience === "ecofriendly" || targetAudience === "retirement" || targetAudience === "senior",
      exteriors: targetAudience === "luxury" || targetAudience === "family" || targetAudience === "ecofriendly" || targetAudience === "retirement" || targetAudience === "senior",
      parking: targetAudience === "luxury" || targetAudience === "family" || targetAudience === "ecofriendly" || targetAudience === "retirement" || targetAudience === "senior",
      buildingQuality: targetAudience === "luxury" || targetAudience === "family" || targetAudience === "ecofriendly" || targetAudience === "retirement" || targetAudience === "senior",
      connectivity: targetAudience === "luxury" || targetAudience === "family" || targetAudience === "ecofriendly" || targetAudience === "retirement" || targetAudience === "senior",
      quietness: targetAudience === "luxury" || targetAudience === "family" || targetAudience === "ecofriendly" || targetAudience === "retirement" || targetAudience === "senior",
      potentialDevelopment: targetAudience === "luxury" || targetAudience === "family" || targetAudience === "ecofriendly" || targetAudience === "retirement" || targetAudience === "senior",
      lowCharges: targetAudience === "luxury" || targetAudience === "family" || targetAudience === "ecofriendly" || targetAudience === "retirement" || targetAudience === "senior"
    };
    
    // Ajustements spécifiques par portail
    if (selectedPortal === "leboncoin") {
      newEmphasisFeatures.localServices = true; // Leboncoin valorise la proximité
    } else if (selectedPortal === "seloger" || selectedPortal === "figaro-immobilier") {
      newEmphasisFeatures.surroundings = true; // SeLoger valorise le cadre de vie
    } else if (selectedPortal === "facebook" || selectedPortal === "instagram") {
      // Réseaux sociaux: simplifier pour être attractif
      newEmphasisFeatures.energyRating = false;
      newEmphasisFeatures.transport = targetAudience === "student"; // Seulement pour les étudiants
    } else if (selectedPortal === "meilleurs-agents") {
      newEmphasisFeatures.investment = true; // Focus sur la valeur
    } else if (selectedPortal === "immoweb" || selectedPortal === "idealista" || 
              selectedPortal === "rightmove" || selectedPortal === "zillow") {
      // Portails internationaux: plus d'informations contextuelles
      newEmphasisFeatures.localServices = true;
      newEmphasisFeatures.surroundings = true;
      newEmphasisFeatures.transport = true;
    }
    
    // Mettre à jour l'état
    setTone(newTone);
    setDetailLevel(newDetailLevel);
    setEmphasisFeatures(prev => ({...prev, ...newEmphasisFeatures}));
    
    // ===== SECTION OPTIMISATION SEO 2025-2026 AVANCÉE =====
    // Stratégie SEO immobilier français optimisée pour 2025-2026
    
    // Mots-clés universels tendances SEO immobilier 2025-2026
    const universalKeywords = [
      "immobilier sans frais caché", "visite virtuelle immersive", "estimation IA précise", 
      "diagnostic énergétique nouvelle norme", "surface Carrez certifiée",
      "quartier note Greenpeace", "indice biodiversité", "empreinte carbone logement", 
      "micro-localisation précise", "proximité services essentiels",
      "certification numérique NF Habitat", "domotique éco-responsable", "éligibilité fibre 10G"
    ];
    
    // Mots-clés optimisés pour la recherche vocale (tendance forte 2025-2026)
    const voiceSearchKeywords = [
      "où trouver appartement proche de", "comment acheter maison sans apport", 
      "quel prix immobilier dans quartier", "quelles aides achat immobilier disponibles", 
      "comment calculer rentabilité locative", "meilleur quartier pour famille avec enfants",
      "comment négocier prix immobilier", "quelle économie d'énergie rénovation"
    ];
    
    // Mots-clés géographiques et locaux (impact SEO local renforcé 2025-2026)
    const geoKeywords = [
      "immobilier quartier recherché", "score walkability quartier", "microquartier émergent",
      "secteur valorisation rapide", "zone franche urbaine", "quartier prioritaire", 
      "secteur résidentiel tranquille", "éco-quartier labellisé", "zone verte protégée",
      "proximité infrastructure nouvelle", "accès mobilité douce"
    ];
    
    // Mots-clés adaptés aux nouvelles préoccupations 2025-2026
    const futureKeywords = [
      "espace télétravail optimisé", "bureau professionnel intégré", "connectivité haut débit garantie",
      "adapté changement climatique", "faible risque inondation", "indice résilience habitat",
      "espace extérieur privatif", "qualité air intérieur", "habitat modulable flexibe",
      "accessibilité PMR totale", "évolutivité logement", "adaptabilité seniors"
    ];
    
    // Mots-clés généraux selon le type de transaction - optimisés SEO 2025
    let seoKeywords: string[] = [];
    if (listingType === 'sale') {
      seoKeywords.push(...[
        "achat immobilier sans intermédiaire", "propriété coup de cœur à saisir", 
        "acquisition pierre sécurisée", "investissement patrimoine durable", 
        "prix m² négocié", "estimation précise intelligence artificielle", 
        "frais de notaire réduits", "prêt immobilier nouveau taux", 
        "PTZ élargi 2025", "défiscalisation immobilière", "achat clé en main"
      ]);
    } else {
      seoKeywords.push(...[
        "location immobilière directe propriétaire", "loyer maîtrisé encadré", 
        "location longue durée garantie", "bail sécurisé nouvelle norme", 
        "sans frais d'agence cachés", "colocation responsable certifiée", 
        "garantie loyer impayé incluse", "dépôt garantie sécurisé", 
        "DPE nouvelle classification 2025", "loyer charges tout inclus"
      ]);
    }
    
    // === MOTS-CLÉS ULTRA-CIBLÉS PAR AUDIENCE 2025-2026 ===
    if (targetAudience === "luxury") {
      seoKeywords.push(...[
        "propriété luxe exception française", "immobilier haut standing signature", 
        "bien prestige ultra-confidentiel", "résidence luxe sécurité maximale",
        "propriété d'architecte unique", "penthouse vue panoramique exclusive", 
        "triplex dernier étage privatif", "matériaux nobles sourcés éthiques",
        "prestations haut de gamme certifiées", "domotique intelligente intégrée",
        "conciergerie privée 24/7", "collection immobilière grand luxe",
        "résidence d'exception rare", "adresse prestigieuse confidentielle"
      ]);
    } else if (targetAudience === "investor") {
      seoKeywords.push(...[
        "investissement locatif haute rentabilité", "rendement immobilier brut garanti", 
        "défiscalisation Pinel optimisée 2025", "LMNP amortissement maximal",
        "LMP avantages fiscaux 2025", "plus-value immobilière sécurisée", 
        "investissement pierre rendement prouvé", "gestion locative tout inclus",
        "cashflow positif immédiat", "SCPI rendement stable", "revenus passifs mensuels", 
        "placement pierre anti-inflation", "stratégie patrimoniale éprouvée",
        "ROI immobilier calculé", "TRI double chiffre", "actif tangible valorisation"
      ]);
    } else if (targetAudience === "family") {
      seoKeywords.push(...[
        "maison familiale écoles classées", "quartier familial sécurisé noté", 
        "école maternelle proximité immédiate", "jardin familial clos arboré",
        "environnement calme mesuré", "espace jeux enfants sécurisé", 
        "pièce familiale lumineuse spacieuse", "proximité crèche labellisée",
        "activités extrascolaires accessibles", "parc public surveillé", 
        "espaces verts quotidien", "piscine municipale proximité",
        "aire jeux rénovée", "collège excellence proximité", 
        "lycée secteur valorisé", "cuisine familiale aménagée"
      ]);
    } else if (targetAudience === "student") {
      seoKeywords.push(...[
        "studio étudiant meublé équipé", "logement CROUS conventionné agréé", 
        "résidence étudiante sécurisée services", "campus université proximité immédiate",
        "colocation étudiante tout inclus", "APL maximum éligible", 
        "Wi-Fi fibre ultra rapide inclus", "bail mobilité étudiant flexible",
        "transports directs université", "quartier étudiant animé", 
        "commerces ouverts tard proximité", "logement étudiant économique",
        "charges tout inclus fixées", "laverie moderne immeuble"
      ]);
    } else if (targetAudience === "ecofriendly") {
      seoKeywords.push(...[
        "maison écologique passive certifiée", "bâtiment basse consommation BBC effinergie", 
        "énergie positive autoconsommation", "rénovation écologique complète",
        "panneaux solaires rendement optimal", "géothermie installation récente", 
        "isolation biosourcée performante", "triple vitrage économies prouvées",
        "récupération eau pluie autonomie", "composteur collectif partagé", 
        "pompe chaleur dernière génération", "circuit court local quartier",
        "certification HQE excellence", "éco-quartier labellisé", 
        "matériaux biosourcés locaux", "habitat zéro carbone certifié"
      ]);
    } else if (targetAudience === "firsttime") {
      seoKeywords.push(...[
        "premier achat accompagné conseillé", "primo-accédant offre dédiée", 
        "PTZ 2025 éligibilité maximale", "frais notaire réduits primo-acquéreur",
        "achat neuf TVA réduite avantage", "aide accession propriété locale", 
        "prêt conventionné taux préférentiel", "accompagnement achat première fois",
        "faibles charges garanties", "garantie revente incluse", 
        "protection perte emploi incluse", "financement optimisé premier achat",
        "assurance emprunteur prix bas", "étapes achat guidées"
      ]);
    } else if (targetAudience === "senior" || targetAudience === "retirement") {
      seoKeywords.push(...[
        "logement senior adapté certifié", "résidence services seniors complète", 
        "habitat plain-pied total", "accessibilité PMR 100% norme",
        "ascenseur normes seniors", "domotique sécurité seniors", 
        "assistance intégrée appel 24/7", "appartement évolutif silver économie",
        "aménagement prévention chute", "proximité services médicaux complets", 
        "pharmacie livraison domicile", "commerces alimentaires accessibles",
        "viager occupé protégé", "bouquet rente optimisés", 
        "usufruit sécurisé garanti", "espace retraite tranquille"
      ]);
    } else if (targetAudience === "expat" || targetAudience === "international") {
      seoKeywords.push(...[
        "propriété française expatriés", "logement international standards", 
        "investissement non-résident facilité", "visa investisseur immobilier",
        "prêt non-résidents fiscaux", "avantages fiscaux expatriés France", 
        "gestion distance garantie", "écoles internationales proximité",
        "quartier international cosmopolite", "gestion locative expatriés", 
        "formalités administratives incluses", "conseils fiscalité internationale",
        "rentabilité euros devise garantie", "plus-value internationale"
      ]);
    } else if (targetAudience === "professional" || targetAudience === "entrepreneur") {
      seoKeywords.push(...[
        "local professionnel normes 2025", "bureau professions libérales aménagé", 
        "espace coworking privatif", "bail commercial sécurisé",
        "murs commerciaux rentabilité prouvée", "investissement SCPI rendement", 
        "fiscalité professionnelle optimisée", "avantages Pinel commercial",
        "emplacement commercial stratégique", "analyse flux clients fournie", 
        "visibilité commerciale mesurée", "fonds commerce valorisé",
        "potentiel développement activité", "étude marché zone incluse"
      ]);
    } else if (targetAudience === "airbnb" || targetAudience === "coliving") {
      seoKeywords.push(...[
        "location courte durée autorisée", "airbnb rentabilité calculée prouvée", 
        "meublé touristique déclaré conforme", "autorisation changement usage obtenue",
        "LMNP saisonnier optimisé fiscal", "rendement locatif saisonnier garanti", 
        "coliving design tout équipé", "habitat partagé services inclus",
        "espaces communs aménagés premium", "coliving tout inclus", 
        "bail mobilité conforme législation", "location flex courte longue durée",
        "gestion locative saisonnière incluse", "optimisation plateforme location"
      ]);
    } else {
      // Audience générale - mots-clés polyvalents
      seoKeywords.push(...[
        "bien immobilier coup de cœur", "acquisition immobilière sans stress", 
        "propriété rare sur marché", "logement idéal quotidien",
        "estimation gratuite précise", "visite virtuelle 3D HD", 
        "transaction immobilière sécurisée", "marché immobilier analyse locale",
        "opportunité immobilière vérifiée", "logement idéalement situé", 
        "cadre vie exceptionnel quotidien", "négociation prix avantageuse"
      ]);
    }
    
    // === MOTS-CLÉS OPTIMISÉS PAR PORTAIL IMMOBILIER 2025-2026 ===
    if (selectedPortal === "seloger") {
      seoKeywords.push(...[
        "annonce premium SeLoger vérifiée", "exclusivité seloger garantie", 
        "estimation valeur précise SeLoger", "coup de cœur agents SeLoger",
        "sélection SeLoger prestige", "meilleures propriétés région", 
        "recherche avancée multicritères", "alerte email personnalisée",
        "visite 3D haute définition", "négociation prix accompagnée", 
        "proposition d'achat sécurisée", "avis vérifiés vendeurs",
        "accord préliminaire bancaire", "expertise SeLoger locale"
      ]);
    } else if (selectedPortal === "leboncoin") {
      seoKeywords.push(...[
        "annonce particulier direct leboncoin", "sans frais agence économie", 
        "disponible immédiatement visite", "contact propriétaire direct",
        "bon rapport qualité prix vérifié", "annonce récente moins 24h", 
        "annonce vérifiée certifiée", "prix négociable directement",
        "visite immédiate possible", "prix fixé raisonnable", 
        "urgent cause déménagement", "photos réelles récentes",
        "transaction rapide possible", "paiement sécurisé proposé",
        "économie frais intermédiaires"
      ]);
    } else if (selectedPortal === "bienici") {
      seoKeywords.push(...[
        "performance énergétique bienici", "simulation prêt immobilier précise", 
        "estimation quartier exacte", "prix négocié quartier BienIci",
        "tendance immobilière localisée", "score voisinage BienIci", 
        "exclusivité BienIci garantie", "photos professionnelles HDR",
        "visites virtuelles interactives", "data immobilière quartier", 
        "cartographie précise avantages", "transport temps réel",
        "services proximité notés", "indice qualité vie BienIci"
      ]);
    } else if (selectedPortal === "logic-immo") {
      seoKeywords.push(...[
        "annonce vérifiée Logic-Immo fiable", "estimation précise Logic-Immo", 
        "simulation personnalisée financement", "conseil immobilier expert",
        "meilleure affaire secteur", "expertise immobilière gratuite", 
        "forte demande quartier", "investissement rentabilité Logic-Immo",
        "frais réduits négociés", "accompagnement Logic-Immo", 
        "suivi personnalisé Logic-Immo", "dossier complet logement",
        "étude comparative marché", "historique prix quartier"
      ]);
    } else if (selectedPortal === "pap") {
      seoKeywords.push(...[
        "particulier à particulier direct", "zéro commission économie", 
        "contact propriétaire sans intermédiaire", "économie frais agence calculée",
        "accompagnement vente PAP", "conseils juridiques inclus", 
        "modèles documents fiables", "diagnostic offert PAP",
        "vente directe sécurisée", "aide rédaction annonce", 
        "visibilité maximale garantie", "visite organisée PAP",
        "négociation directe avantageuse", "guides pratiques transaction"
      ]);
    } else if (selectedPortal === "facebook" || selectedPortal === "instagram") {
      seoKeywords.push(...[
        "annonce immobilière réseau social", "marketplace immobilier exclusivité", 
        "coup de cœur à partager", "visites virtuelles story Instagram",
        "stories immobilières exclusives", "hashtag immobilier local", 
        "#immobilier #bonplan", "reel visite virtuelle",
        "direct visite possible", "commentaires acheteurs précédents", 
        "avis voisins quartier", "partage communauté locale",
        "photos lifestyle bien", "vidéo quartier ambiance"
      ]);
    } else if (selectedPortal === "avendrealouer") {
      seoKeywords.push(...[
        "annonce vérifiée avendrealouer", "offre immobilière sélectionnée", 
        "estimation prix précise", "comparaison marché locale",
        "biens similaires vendus prix", "conseils transaction inclus", 
        "guide quartier détaillé", "analyse marché immobilier locale",
        "tendance prix secteur", "potentiel valorisation estimé", 
        "négociation accompagnée", "achat sécurisé étapes"
      ]);
    } else if (selectedPortal === "figaro-immobilier") {
      seoKeywords.push(...[
        "sélection Figaro Immobilier prestige", "propriété haut standing vérifiée", 
        "collection exclusive Figaro", "adresse prestigieuse confidentielle",
        "expertise immobilière premium", "réseau international acquéreurs", 
        "clientèle sélectionnée", "discrétion transaction garantie",
        "patrimoine exceptionnel rare", "conseiller dédié personnalisé", 
        "visite privée organisée", "documentation complète historique"
      ]);
    } else if (selectedPortal === "century21" || selectedPortal === "orpi" || selectedPortal === "foncia") {
      seoKeywords.push(...[
        "expertise agence réseau national", "estimation gratuite professionnelle", 
        "accompagnement personnalisé transaction", "garantie satisfaction client",
        "sécurité juridique maximale", "conseiller dédié expérimenté", 
        "avis clients vérifiés", "historique transactions quartier",
        "connaissance marché local", "négociation optimale prix", 
        "dossier complet transparent", "suivi après-vente inclus"
      ]);
    }

    // Intégration intelligente de longues expressions (long tail keywords)
    const longTailKeywords = [
      `${listingType === 'sale' ? 'acheter' : 'louer'} ${selectedProperty?.type?.toLowerCase() || 'bien'} ${selectedProperty?.rooms || ''} pièces ${selectedProperty?.address?.split(',')[0] || 'centre-ville'}`,
      `${selectedProperty?.type?.toLowerCase() || 'logement'} ${selectedProperty?.livingArea || ''} m² ${listingType === 'sale' ? 'à vendre' : 'à louer'} secteur recherché`,
      `${targetAudience === "family" ? "familial" : targetAudience === "luxury" ? "haut standing" : "idéalement situé"} ${selectedProperty?.hasGarden ? "avec jardin" : selectedProperty?.hasBalcony ? "avec balcon" : ""} ${selectedProperty?.address?.split(',')[0] || ''}`
    ];
    
    // Intégration de mots-clés conversationnels (optimisés recherche vocale)
    const selectedVoiceKeywords = voiceSearchKeywords.slice(0, 2);
    
    // Intégration de mots-clés géolocalisés
    const selectedGeoKeywords = selectedProperty?.address ? 
      [`immobilier ${selectedProperty.address.split(',')[0]}`, `${selectedProperty.type?.toLowerCase()} à ${listingType === 'sale' ? 'acheter' : 'louer'} ${selectedProperty.address.split(',')[0]}`] : 
      geoKeywords.slice(0, 2);
    
    // Intégration de mots-clés tendances futures
    const selectedFutureKeywords = futureKeywords.slice(0, 2);
    
    // Construire une liste intelligente basée sur tous les aspects
    const buildOptimalKeywords = (): string[] => {
      const keywords: string[] = [];
      
      // Mots-clés universels
      keywords.push(
        'immobilier',
        'bien immobilier',
        'propriété',
        'logement',
        'habitation'
      );
      
      // Mots-clés selon le type de transaction
      if (listingType === 'sale') {
        keywords.push('à vendre', 'vente', 'achat', 'acquisition');
      } else {
        keywords.push('à louer', 'location', 'bail', 'loyer');
      }
      
      // Mots-clés selon le portail
      switch(selectedPortal) {
        case 'leboncoin':
          keywords.push('particulier', 'direct', 'sans frais');
          break;
        case 'seloger':
          keywords.push('professionnel', 'agence', 'expertise');
          break;
        case 'bienici':
          keywords.push('coup de cœur', 'estimation', 'expert');
          break;
        case 'pap':
          keywords.push('particulier', 'sans intermédiaire', 'direct');
          break;
        case 'figaro-immobilier':
          keywords.push('prestige', 'luxe', 'standing');
          break;
        // ... autres portails
      }
      
      // Mots-clés selon l'audience
      switch(targetAudience) {
        case 'luxury':
          keywords.push('prestige', 'haut de gamme', 'standing', 'exceptionnel');
          break;
        case 'investor':
          keywords.push('investissement', 'rentabilité', 'rendement', 'placement');
          break;
        case 'family':
          keywords.push('familial', 'confort', 'sécurité', 'proximité écoles');
          break;
        case 'student':
          keywords.push('étudiant', 'proche université', 'meublé', 'colocation');
          break;
        case 'senior':
          keywords.push('senior', 'plain-pied', 'sécurité', 'proximité commerces');
          break;
        case 'expat':
          keywords.push('expatrié', 'international', 'services', 'proximité');
          break;
        case 'ecofriendly':
          keywords.push('écologique', 'durable', 'énergie', 'performance');
          break;
        // ... autres audiences
      }
      
      // Limiter le nombre de mots-clés pour éviter la sur-optimisation
      return keywords.slice(0, 10);
    };
    
    // Obtention des mots-clés finaux optimisés
    const optimizedKeywords = buildOptimalKeywords();
    
    // Limiter et dédoublonner
    const uniqueKeywords = Array.from(new Set(optimizedKeywords)).slice(0, 10);
    
    // Mise à jour des mots-clés
    if (uniqueKeywords.length > 0) {
      setIncludeKeywords(uniqueKeywords.join(', '));
    }
    
  }, [selectedPortal, targetAudience, listingType, selectedProperty]);

  const handleEmphasisFeatureChange = (key: string, checked: boolean) => {
    setEmphasisFeatures(prev => ({
      ...prev,
      [key]: checked
    }));
  };

  const handleGenerate = () => {
    const options = {
      tone,
      detailLevel,
      emphasisFeatures,
      customDescription,
      maxLength,
      includeKeywords: includeKeywords || buildOptimalKeywords(),
      generateImages,
      includeCompanyInfo,
      includeFees,
      includeVirtualTour,
      includeAvailability,
      includeTechnicalDocs,
      includeExclusivity,
      hideAddressNumber,
      includeRentalDetails,
      companyInfo: includeCompanyInfo ? companyInfo : null,
      feesInfo: includeFees ? feesInfo : null,
      virtualTourLink: includeVirtualTour ? virtualTourLink : null,
      availabilityInfo: includeAvailability ? availabilityInfo : null,
      technicalDocsInfo: includeTechnicalDocs ? technicalDocsInfo : null,
      rentalDetails: includeRentalDetails ? rentalDetails : null
    };
    
    onGenerate(options);
  };

  const buildOptimalKeywords = (): string[] => {
    const keywords: string[] = [];
    
    // Mots-clés universels
    keywords.push(
      'immobilier',
      'bien immobilier',
      'propriété',
      'logement',
      'habitation'
    );
    
    // Mots-clés selon le type de transaction
    if (listingType === 'sale') {
      keywords.push('à vendre', 'vente', 'achat', 'acquisition');
    } else {
      keywords.push('à louer', 'location', 'bail', 'loyer');
    }
    
    // Mots-clés selon le portail
    switch(selectedPortal) {
      case 'leboncoin':
        keywords.push('particulier', 'direct', 'sans frais');
        break;
      case 'seloger':
        keywords.push('professionnel', 'agence', 'expertise');
        break;
      case 'bienici':
        keywords.push('coup de cœur', 'estimation', 'expert');
        break;
      case 'pap':
        keywords.push('particulier', 'sans intermédiaire', 'direct');
        break;
      case 'figaro-immobilier':
        keywords.push('prestige', 'luxe', 'standing');
        break;
      // ... autres portails
    }
    
    // Mots-clés selon l'audience
    switch(targetAudience) {
      case 'luxury':
        keywords.push('prestige', 'haut de gamme', 'standing', 'exceptionnel');
        break;
      case 'investor':
        keywords.push('investissement', 'rentabilité', 'rendement', 'placement');
        break;
      case 'family':
        keywords.push('familial', 'confort', 'sécurité', 'proximité écoles');
        break;
      case 'student':
        keywords.push('étudiant', 'proche université', 'meublé', 'colocation');
        break;
      case 'senior':
        keywords.push('senior', 'plain-pied', 'sécurité', 'proximité commerces');
        break;
      case 'expat':
        keywords.push('expatrié', 'international', 'services', 'proximité');
        break;
      case 'ecofriendly':
        keywords.push('écologique', 'durable', 'énergie', 'performance');
        break;
      // ... autres audiences
    }
    
    // Limiter le nombre de mots-clés pour éviter la sur-optimisation
    return keywords.slice(0, 10);
  };

  // Remplacer les gestionnaires de changement d'état pour includeCompanyInfo et includeFees
  const handleCompanyToggle = (checked: boolean) => {
    setIncludeCompanyInfo(checked);
    localStorage.setItem('listing_includeCompanyInfo', String(checked));
    if (!checked) {
      setShowCompanyInfo(false);
    }
  };
  
  const handleFeesToggle = (checked: boolean) => {
    setIncludeFees(checked);
    localStorage.setItem('listing_includeFees', String(checked));
    if (!checked) {
      setShowFeesInfo(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-xl p-1 h-auto dark:bg-slate-800">
          <TabsTrigger value="basic" className="rounded-lg py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-blue-500 dark:data-[state=active]:from-indigo-600 dark:data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
            <Home className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="advanced" className="rounded-lg py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-blue-500 dark:data-[state=active]:from-indigo-600 dark:data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
            <Settings className="h-4 w-4 mr-2" />
            Options avancées
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6 pt-6">
          {/* Propriété avec aperçu amélioré */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="property" className="flex items-center gap-1.5 text-sm font-medium">
                <Building className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                Sélectionner une propriété
              </Label>
              {selectedProperty && (
                <Badge variant="outline" className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
                  {selectedProperty.livingArea} m² • {selectedProperty.rooms} pièces
                </Badge>
              )}
            </div>
            
            {isLoading ? (
              <Skeleton className="h-10 w-full dark:bg-slate-700" />
            ) : (
              <Select
                value={selectedProperty ? String(selectedProperty.id) : ""}
                onValueChange={onPropertySelect}
              >
                <SelectTrigger id="property" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
                  <SelectValue placeholder="Choisir une propriété" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] dark:bg-slate-800 dark:border-slate-700">
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={String(property.id)} className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                        <span>{property.name}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({property.type}, {property.livingArea}m²)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Type d'annonce */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <FileText className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              Type d'annonce
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={listingType === 'sale' ? "default" : "outline"}
                size="sm"
                className={`${listingType === 'sale' ? 'bg-gradient-to-r from-indigo-500 to-blue-500 dark:from-indigo-600 dark:to-blue-700 text-white border-0 shadow-md' : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70'} rounded-xl py-5 h-auto`}
                onClick={() => onListingTypeChange('sale')}
              >
                <Wallet className="h-4 w-4 mr-2" />
                Vente
              </Button>
              <Button
                variant={listingType === 'rental' ? "default" : "outline"}
                size="sm"
                className={`${listingType === 'rental' ? 'bg-gradient-to-r from-indigo-500 to-blue-500 dark:from-indigo-600 dark:to-blue-700 text-white border-0 shadow-md' : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70'} rounded-xl py-5 h-auto`}
                onClick={() => onListingTypeChange('rental')}
              >
                <Home className="h-4 w-4 mr-2" />
                Location
              </Button>
            </div>
          </div>

          {/* Portail cible */}
          <div className="space-y-3">
            <Label htmlFor="portal" className="flex items-center gap-1.5 text-sm font-medium">
              <Globe className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              Portail immobilier
            </Label>
            <Select value={selectedPortal} onValueChange={onPortalChange}>
              <SelectTrigger id="portal" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
                <SelectValue placeholder="Choisir un portail" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] dark:bg-slate-800 dark:border-slate-700">
                {portals.map((portal) => (
                  <SelectItem key={portal.id} value={portal.id} className="cursor-pointer">
                    {portal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Audience cible */}
          <div className="space-y-3">
            <Label htmlFor="audience" className="flex items-center gap-1.5 text-sm font-medium">
              <UserCheck className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              Audience cible
            </Label>
            <Select value={targetAudience} onValueChange={onTargetAudienceChange}>
              <SelectTrigger id="audience" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
                <SelectValue placeholder="Choisir une audience" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] dark:bg-slate-800 dark:border-slate-700">
                {audiences.map((audience) => (
                  <SelectItem key={audience.id} value={audience.id} className="cursor-pointer">
                    {audience.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bouton de génération */}
          <Button 
            onClick={() => handleGenerate()} 
            disabled={isGenerating || !selectedProperty} 
            className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-700 dark:to-blue-800 text-white rounded-xl py-6 h-auto shadow-lg hover:shadow-xl transition-all hover:from-indigo-500 hover:to-blue-500 dark:hover:from-indigo-600 dark:hover:to-blue-700"
          >
            {isGenerating ? (
              <>
                <Sparkles className="h-5 w-5 mr-2 animate-pulse" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Générer l'annonce
              </>
            )}
          </Button>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6 pt-6">
          <div className="space-y-6">
            {/* Style et ton */}
            <Card className="border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden dark:bg-slate-800/50">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <PenSquare className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  Style et ton
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {tones.map(toneOption => (
                    <Button
                      key={toneOption.id}
                      variant="outline"
                      size="sm"
                      className={`${tone === toneOption.id ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-900/40 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'} rounded-lg h-auto py-1 text-xs`}
                      onClick={() => setTone(toneOption.id)}
                    >
                      {toneOption.name}
                    </Button>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs text-muted-foreground">Niveau de détail</Label>
                    <Badge variant="outline" className="font-mono text-xs dark:border-slate-700 dark:bg-slate-800">{detailLevel}%</Badge>
                  </div>
                  <Slider
                    value={[detailLevel]}
                    onValueChange={(value) => setDetailLevel(value[0])}
                    min={10}
                    max={90}
                    step={10}
                    className="py-1"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Concis</span>
                    <span>Détaillé</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Accentuation des caractéristiques */}
            <Card className="border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden dark:bg-slate-800/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 font-medium text-sm mb-2">
                  <Target className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  Accentuer les caractéristiques
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="location" 
                      checked={emphasisFeatures.location}
                      onCheckedChange={(checked) => handleEmphasisFeatureChange('location', checked as boolean)}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                    />
                    <Label htmlFor="location" className="text-sm cursor-pointer">Emplacement</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="amenities" 
                      checked={emphasisFeatures.amenities}
                      onCheckedChange={(checked) => handleEmphasisFeatureChange('amenities', checked as boolean)}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                    />
                    <Label htmlFor="amenities" className="text-sm cursor-pointer">Équipements</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="energyRating" 
                      checked={emphasisFeatures.energyRating}
                      onCheckedChange={(checked) => handleEmphasisFeatureChange('energyRating', checked as boolean)}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                    />
                    <Label htmlFor="energyRating" className="text-sm cursor-pointer">Performance énergétique</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="transport" 
                      checked={emphasisFeatures.transport}
                      onCheckedChange={(checked) => handleEmphasisFeatureChange('transport', checked as boolean)}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                    />
                    <Label htmlFor="transport" className="text-sm cursor-pointer">Transports</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="schools" 
                      checked={emphasisFeatures.schools}
                      onCheckedChange={(checked) => handleEmphasisFeatureChange('schools', checked as boolean)}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                    />
                    <Label htmlFor="schools" className="text-sm cursor-pointer">Écoles</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="investment" 
                      checked={emphasisFeatures.investment}
                      onCheckedChange={(checked) => handleEmphasisFeatureChange('investment', checked as boolean)}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                    />
                    <Label htmlFor="investment" className="text-sm cursor-pointer">Rentabilité</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="surroundings" 
                      checked={emphasisFeatures.surroundings}
                      onCheckedChange={(checked) => handleEmphasisFeatureChange('surroundings', checked as boolean)}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                    />
                    <Label htmlFor="surroundings" className="text-sm cursor-pointer">Environnement</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="localServices" 
                      checked={emphasisFeatures.localServices}
                      onCheckedChange={(checked) => handleEmphasisFeatureChange('localServices', checked as boolean)}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                    />
                    <Label htmlFor="localServices" className="text-sm cursor-pointer">Services de proximité</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="security" 
                      checked={emphasisFeatures.security}
                      onCheckedChange={(checked) => handleEmphasisFeatureChange('security', checked as boolean)}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                    />
                    <Label htmlFor="security" className="text-sm cursor-pointer">Sécurité</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="view" 
                      checked={emphasisFeatures.view}
                      onCheckedChange={(checked) => handleEmphasisFeatureChange('view', checked as boolean)}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                    />
                    <Label htmlFor="view" className="text-sm cursor-pointer">Vue et exposition</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="renovations" 
                      checked={emphasisFeatures.renovations}
                      onCheckedChange={(checked) => handleEmphasisFeatureChange('renovations', checked as boolean)}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                    />
                    <Label htmlFor="renovations" className="text-sm cursor-pointer">Rénovations récentes</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="exteriors" 
                      checked={emphasisFeatures.exteriors}
                      onCheckedChange={(checked) => handleEmphasisFeatureChange('exteriors', checked as boolean)}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                    />
                    <Label htmlFor="exteriors" className="text-sm cursor-pointer">Extérieurs</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="parking" 
                      checked={emphasisFeatures.parking}
                      onCheckedChange={(checked) => handleEmphasisFeatureChange('parking', checked as boolean)}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                    />
                    <Label htmlFor="parking" className="text-sm cursor-pointer">Stationnement</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="buildingQuality" 
                      checked={emphasisFeatures.buildingQuality}
                      onCheckedChange={(checked) => handleEmphasisFeatureChange('buildingQuality', checked as boolean)}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                    />
                    <Label htmlFor="buildingQuality" className="text-sm cursor-pointer">Qualité du bâti</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="connectivity" 
                      checked={emphasisFeatures.connectivity}
                      onCheckedChange={(checked) => handleEmphasisFeatureChange('connectivity', checked as boolean)}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                    />
                    <Label htmlFor="connectivity" className="text-sm cursor-pointer">Connectivité</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="quietness" 
                      checked={emphasisFeatures.quietness}
                      onCheckedChange={(checked) => handleEmphasisFeatureChange('quietness', checked as boolean)}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                    />
                    <Label htmlFor="quietness" className="text-sm cursor-pointer">Calme</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="potentialDevelopment" 
                      checked={emphasisFeatures.potentialDevelopment}
                      onCheckedChange={(checked) => handleEmphasisFeatureChange('potentialDevelopment', checked as boolean)}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                    />
                    <Label htmlFor="potentialDevelopment" className="text-sm cursor-pointer">Potentiel d'aménagement</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="lowCharges" 
                      checked={emphasisFeatures.lowCharges}
                      onCheckedChange={(checked) => handleEmphasisFeatureChange('lowCharges', checked as boolean)}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                    />
                    <Label htmlFor="lowCharges" className="text-sm cursor-pointer">Faibles charges</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Options supplémentaires */}
            <Card className="border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden dark:bg-slate-800/50">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Sliders className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  Options supplémentaires
                </div>
                
                <div className="space-y-6">
                  {/* Visite virtuelle */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-full">
                        <Image className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                      </div>
                      <div>
                        <Label htmlFor="includeVirtualTour" className="font-medium">Visite virtuelle</Label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Intégrer un lien vers une visite 3D</p>
                      </div>
                    </div>
                    <Switch
                      id="includeVirtualTour"
                      checked={includeVirtualTour}
                      onCheckedChange={setIncludeVirtualTour}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-400 h-6 w-11"
                    />
                  </div>

                  {includeVirtualTour && (
                    <div className="my-4 mx-1 border border-indigo-200 dark:border-indigo-800 rounded-lg shadow-sm bg-white dark:bg-slate-800">
                      <div className="border-b border-indigo-100 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-900/20 p-3 rounded-t-lg flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-indigo-600 dark:text-indigo-300 font-medium">Lien de visite virtuelle</div>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="virtualTourLink" className="text-xs font-medium">URL de la visite virtuelle</Label>
                          <Input 
                            id="virtualTourLink"
                            value={virtualTourLink}
                            onChange={(e) => setVirtualTourLink(e.target.value)}
                            placeholder="https://visite-virtuelle.exemple.com"
                            className="h-9 text-sm bg-white/90 dark:bg-slate-800/90"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Disponibilité */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-full">
                        <Wallet className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                      </div>
                      <div>
                        <Label htmlFor="includeAvailability" className="font-medium">Disponibilité</Label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Préciser les dates de disponibilité</p>
                      </div>
                    </div>
                    <Switch
                      id="includeAvailability"
                      checked={includeAvailability}
                      onCheckedChange={setIncludeAvailability}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-400 h-6 w-11"
                    />
                  </div>

                  {includeAvailability && (
                    <div className="my-4 mx-1 border border-indigo-200 dark:border-indigo-800 rounded-lg shadow-sm bg-white dark:bg-slate-800">
                      <div className="border-b border-indigo-100 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-900/20 p-3 rounded-t-lg flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-indigo-600 dark:text-indigo-300 font-medium">Détails de disponibilité</div>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="availableFrom" className="text-xs font-medium">Disponible à partir de</Label>
                          <Input 
                            id="availableFrom"
                            value={availabilityInfo.availableFrom}
                            onChange={(e) => setAvailabilityInfo({...availabilityInfo, availableFrom: e.target.value})}
                            placeholder="ex: 01/01/2024"
                            className="h-9 text-sm bg-white/90 dark:bg-slate-800/90"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="visitDays" className="text-xs font-medium">Jours de visite possibles</Label>
                          <Input 
                            id="visitDays"
                            value={availabilityInfo.visitDays}
                            onChange={(e) => setAvailabilityInfo({...availabilityInfo, visitDays: e.target.value})}
                            placeholder="ex: Lundis et mercredis après-midi"
                            className="h-9 text-sm bg-white/90 dark:bg-slate-800/90"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Documents techniques */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-full">
                        <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                      </div>
                      <div>
                        <Label htmlFor="includeTechnicalDocs" className="font-medium">Documents techniques</Label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Mentionner les diagnostics disponibles</p>
                      </div>
                    </div>
                    <Switch
                      id="includeTechnicalDocs"
                      checked={includeTechnicalDocs}
                      onCheckedChange={setIncludeTechnicalDocs}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                    />
                  </div>

                  {includeTechnicalDocs && (
                    <div className="my-4 mx-1 border border-indigo-200 dark:border-indigo-800 rounded-lg shadow-sm bg-white dark:bg-slate-800">
                      <div className="border-b border-indigo-100 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-900/20 p-3 rounded-t-lg flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-indigo-600 dark:text-indigo-300 font-medium">Diagnostics disponibles</div>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="hasDPE" 
                              checked={technicalDocsInfo.hasDPE}
                              onCheckedChange={(checked) => setTechnicalDocsInfo({...technicalDocsInfo, hasDPE: checked as boolean})}
                              className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                            />
                            <Label htmlFor="hasDPE" className="text-sm cursor-pointer">DPE</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="hasAsbestos" 
                              checked={technicalDocsInfo.hasAsbestos}
                              onCheckedChange={(checked) => setTechnicalDocsInfo({...technicalDocsInfo, hasAsbestos: checked as boolean})}
                              className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                            />
                            <Label htmlFor="hasAsbestos" className="text-sm cursor-pointer">Amiante</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="hasLead" 
                              checked={technicalDocsInfo.hasLead}
                              onCheckedChange={(checked) => setTechnicalDocsInfo({...technicalDocsInfo, hasLead: checked as boolean})}
                              className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                            />
                            <Label htmlFor="hasLead" className="text-sm cursor-pointer">Plomb</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="hasElectrical" 
                              checked={technicalDocsInfo.hasElectrical}
                              onCheckedChange={(checked) => setTechnicalDocsInfo({...technicalDocsInfo, hasElectrical: checked as boolean})}
                              className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500 dark:border-slate-600"
                            />
                            <Label htmlFor="hasElectrical" className="text-sm cursor-pointer">Électricité</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Exclusivité */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-full">
                        <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                      </div>
                      <div>
                        <Label htmlFor="includeExclusivity" className="font-medium">Exclusivité</Label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Mettre en avant le caractère exclusif</p>
                      </div>
                    </div>
                    <Switch
                      id="includeExclusivity"
                      checked={includeExclusivity}
                      onCheckedChange={setIncludeExclusivity}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-400 h-6 w-11"
                    />
                  </div>

                  {/* Infos entreprise */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-full">
                        <UserCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                      </div>
                      <div>
                        <Label htmlFor="includeCompanyInfo" className="font-medium">Informations de l'entreprise</Label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ajoute les coordonnées de l'entreprise</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setShowCompanyInfo(!showCompanyInfo)}
                        className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-full transition-colors"
                      >
                        <ChevronDown className={`h-4 w-4 text-indigo-600 dark:text-indigo-300 transition-transform duration-200 ${showCompanyInfo ? 'rotate-180' : ''}`} />
                      </button>
                      <Switch
                        id="includeCompanyInfo"
                        checked={includeCompanyInfo}
                        onCheckedChange={handleCompanyToggle}
                        className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-400 h-6 w-11"
                      />
                    </div>
                  </div>
                  
                  {includeCompanyInfo && showCompanyInfo && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="my-4 mx-1 border border-indigo-200 dark:border-indigo-800 rounded-lg shadow-sm bg-white dark:bg-slate-800 overflow-hidden"
                    >
                      <div className="border-b border-indigo-100 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-900/20 p-3 rounded-t-lg flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-indigo-600 dark:text-indigo-300 font-medium">Informations de l'entreprise</div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-xs px-2 py-1 bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                          onClick={saveDataToLocalStorage}
                        >
                          Sauvegarder
                        </Button>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="companyName" className="text-xs font-medium">Nom de l'entreprise</Label>
                          <Input 
                            id="companyName"
                            value={companyInfo.name}
                            onChange={(e) => setCompanyInfo({...companyInfo, name: e.target.value})}
                            placeholder="Nom de votre entreprise"
                            className="h-9 text-sm bg-white/90 dark:bg-slate-800/90"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="companyPhone" className="text-xs font-medium">Téléphone</Label>
                          <Input 
                            id="companyPhone"
                            value={companyInfo.phone}
                            onChange={(e) => setCompanyInfo({...companyInfo, phone: e.target.value})}
                            placeholder="Numéro de téléphone"
                            className="h-9 text-sm bg-white/90 dark:bg-slate-800/90"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="companyEmail" className="text-xs font-medium">Email</Label>
                          <Input 
                            id="companyEmail"
                            value={companyInfo.email}
                            onChange={(e) => setCompanyInfo({...companyInfo, email: e.target.value})}
                            placeholder="Adresse email"
                            className="h-9 text-sm bg-white/90 dark:bg-slate-800/90"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="companyWebsite" className="text-xs font-medium">Site web</Label>
                          <Input 
                            id="companyWebsite"
                            value={companyInfo.website}
                            onChange={(e) => setCompanyInfo({...companyInfo, website: e.target.value})}
                            placeholder="Site web"
                            className="h-9 text-sm bg-white/90 dark:bg-slate-800/90"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="companySiret" className="text-xs font-medium">SIRET</Label>
                          <Input 
                            id="companySiret"
                            value={companyInfo.siret}
                            onChange={(e) => setCompanyInfo({...companyInfo, siret: e.target.value})}
                            placeholder="Numéro SIRET"
                            className="h-9 text-sm bg-white/90 dark:bg-slate-800/90"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Frais */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-full">
                        <Wallet className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                      </div>
                      <div>
                        <Label htmlFor="includeFees" className="font-medium">Inclure les frais</Label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Détaille les frais additionnels</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setShowFeesInfo(!showFeesInfo)}
                        className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-full transition-colors"
                      >
                        <ChevronDown className={`h-4 w-4 text-indigo-600 dark:text-indigo-300 transition-transform duration-200 ${showFeesInfo ? 'rotate-180' : ''}`} />
                      </button>
                      <Switch
                        id="includeFees"
                        checked={includeFees}
                        onCheckedChange={handleFeesToggle}
                        className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-400 h-6 w-11"
                      />
                    </div>
                  </div>

                  {includeFees && showFeesInfo && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="my-4 mx-1 border border-indigo-200 dark:border-indigo-800 rounded-lg shadow-sm bg-white dark:bg-slate-800 overflow-hidden"
                    >
                      <div className="border-b border-indigo-100 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-900/20 p-3 rounded-t-lg flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-indigo-600 dark:text-indigo-300 font-medium">Détail des frais</div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-xs px-2 py-1 bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                          onClick={saveDataToLocalStorage}
                        >
                          Sauvegarder
                        </Button>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="agencyFees" className="text-xs font-medium">Frais d'agence</Label>
                          <Input 
                            id="agencyFees"
                            value={feesInfo.agencyFees}
                            onChange={(e) => setFeesInfo({...feesInfo, agencyFees: e.target.value})}
                            placeholder="ex: 4,5% du prix de vente"
                            className="h-9 text-sm bg-white/90 dark:bg-slate-800/90"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notaryFees" className="text-xs font-medium">Frais de notaire</Label>
                          <Input 
                            id="notaryFees"
                            value={feesInfo.notaryFees}
                            onChange={(e) => setFeesInfo({...feesInfo, notaryFees: e.target.value})}
                            placeholder="ex: 7-8% pour l'ancien"
                            className="h-9 text-sm bg-white/90 dark:bg-slate-800/90"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="otherFees" className="text-xs font-medium">Autres frais</Label>
                          <Input 
                            id="otherFees"
                            value={feesInfo.otherFees}
                            onChange={(e) => setFeesInfo({...feesInfo, otherFees: e.target.value})}
                            placeholder="Frais additionnels éventuels"
                            className="h-9 text-sm bg-white/90 dark:bg-slate-800/90"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Masquer le numéro d'adresse */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-full">
                        <Home className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                      </div>
                      <div>
                        <Label htmlFor="hideAddressNumber" className="font-medium">Masquer le numéro d'adresse</Label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pour plus de confidentialité</p>
                      </div>
                    </div>
                    <Switch
                      id="hideAddressNumber"
                      checked={hideAddressNumber}
                      onCheckedChange={setHideAddressNumber}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-400 h-6 w-11"
                    />
                  </div>

                  {/* Détails de location */}
                  {listingType === 'rental' && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-full">
                          <Wallet className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                        </div>
                        <div>
                          <Label htmlFor="includeRentalDetails" className="font-medium">Détails du loyer et charges</Label>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ajouter les informations financières détaillées</p>
                        </div>
                      </div>
                      <Switch
                        id="includeRentalDetails"
                        checked={includeRentalDetails}
                        onCheckedChange={setIncludeRentalDetails}
                        className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-400 h-6 w-11"
                      />
                    </div>
                  )}

                  {includeRentalDetails && listingType === 'rental' && (
                    <div className="my-4 mx-1 border border-indigo-200 dark:border-indigo-800 rounded-lg shadow-sm bg-white dark:bg-slate-800">
                      <div className="border-b border-indigo-100 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-900/20 p-3 rounded-t-lg flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-indigo-600 dark:text-indigo-300 font-medium">Détails financiers de la location</div>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="charges" className="text-xs font-medium">Montant des charges</Label>
                          <Input 
                            id="charges"
                            value={rentalDetails.charges}
                            onChange={(e) => setRentalDetails({...rentalDetails, charges: e.target.value})}
                            placeholder="ex: 150€/mois"
                            className="h-9 text-sm bg-white/90 dark:bg-slate-800/90"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deposit" className="text-xs font-medium">Montant du dépôt de garantie</Label>
                          <Input 
                            id="deposit"
                            value={rentalDetails.deposit}
                            onChange={(e) => setRentalDetails({...rentalDetails, deposit: e.target.value})}
                            placeholder="ex: 1500€"
                            className="h-9 text-sm bg-white/90 dark:bg-slate-800/90"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="availabilityDate" className="text-xs font-medium">Date de disponibilité</Label>
                          <Input 
                            id="availabilityDate"
                            value={rentalDetails.availabilityDate}
                            onChange={(e) => setRentalDetails({...rentalDetails, availabilityDate: e.target.value})}
                            placeholder="ex: 01/01/2024"
                            className="h-9 text-sm bg-white/90 dark:bg-slate-800/90"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="leaseDuration" className="text-xs font-medium">Durée du bail</Label>
                          <Input 
                            id="leaseDuration"
                            value={rentalDetails.leaseDuration}
                            onChange={(e) => setRentalDetails({...rentalDetails, leaseDuration: e.target.value})}
                            placeholder="ex: 3 ans"
                            className="h-9 text-sm bg-white/90 dark:bg-slate-800/90"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Description personnalisée */}
            <Card className="border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden dark:bg-slate-800/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <MessageSquare className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  Information supplémentaire
                </div>
                  <Textarea
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Ajoutez des détails personnalisés ou des précisions qui seront intégrés à l'annonce générée..."
                  className="min-h-[100px] border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white/70 dark:bg-slate-800/70"
                />
              </CardContent>
            </Card>

      {/* Bouton de génération */}
        <Button 
              onClick={() => handleGenerate()} 
          disabled={isGenerating || !selectedProperty}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-700 dark:to-blue-800 text-white rounded-xl py-6 h-auto shadow-lg hover:shadow-xl transition-all hover:from-indigo-500 hover:to-blue-500 dark:hover:from-indigo-600 dark:hover:to-blue-700"
        >
          {isGenerating ? (
            <>
                  <Sparkles className="h-5 w-5 mr-2 animate-pulse" />
              Génération en cours...
            </>
          ) : (
            <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Générer l'annonce avec options avancées
            </>
          )}
        </Button>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 