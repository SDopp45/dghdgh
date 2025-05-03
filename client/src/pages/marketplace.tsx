import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, ExternalLink, Copy, Star, Filter, Search, Info, Percent, Tag, Map, Phone, Mail, Globe, CheckCircle, Award, Heart, ArrowUpRight, Users, Home, Shield, Brush, ScrollText, Hammer, ChevronLeft, ChevronRight, ThumbsUp, ListChecks, Building, HandshakeIcon, Handshake, X, Menu, ShoppingBag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";

// Types pour les prestataires
interface Prestataire {
  id: string;
  nom: string;
  categorie: string;
  description: string;
  logo: string;
  adresse: string;
  telephone: string;
  email: string;
  siteWeb: string;
  codePromo: string;
  avantages: string[];
  photos: string[];
  evaluation: number;
  verified: boolean;
  featured: boolean;
}

export default function Prestataires() {
  const [activeTab, setActiveTab] = useState("tous");
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [suggestDialogOpen, setSuggestDialogOpen] = useState(false);
  const [selectedPrestataire, setSelectedPrestataire] = useState<Prestataire | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  // Empêcher le défilement du corps lorsque la modale est ouverte
  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [modalOpen]);
  
  // Données simulées des prestataires
  const prestataires: Prestataire[] = [
    {
      id: "1",
      nom: "Maison Deco Premium",
      categorie: "Décoration",
      description: "Spécialiste en décoration d'intérieur haut de gamme pour propriétés de luxe. Services personnalisés et matériaux de grande qualité.",
      logo: "/logos/maison-deco.png",
      adresse: "15 Avenue Montaigne, 75008 Paris",
      telephone: "+33 1 23 45 67 89",
      email: "contact@maisondeco.com",
      siteWeb: "https://maisondeco-premium.fr",
      codePromo: "IMUMO25",
      avantages: ["Consultation gratuite", "Remise de 15% pour clients ImùMo", "Livraison offerte"],
      photos: [
        "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=800&h=600&auto=format",
        "https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?q=80&w=800&h=600&auto=format",
        "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=800&h=600&auto=format"
      ],
      evaluation: 4.8,
      verified: true,
      featured: true
    },
    {
      id: "2",
      nom: "AssurHabitat Pro",
      categorie: "Assurance",
      description: "Solutions d'assurance complètes pour propriétaires et locataires avec des garanties étendues et un service client réactif.",
      logo: "/logos/assurhabitat.png",
      adresse: "8 Rue de la Paix, 75002 Paris",
      telephone: "+33 1 98 76 54 32",
      email: "info@assurhabitat.fr",
      siteWeb: "https://assurhabitat-pro.fr",
      codePromo: "IMUMO15",
      avantages: ["Premier mois offert", "Assistance 24/7", "Garantie loyers impayés"],
      photos: [
        "https://images.unsplash.com/photo-1551836022-4c4c79ecde51?q=80&w=800&h=600&auto=format",
        "https://images.unsplash.com/photo-1556155092-8707de31f9c4?q=80&w=800&h=600&auto=format"
      ],
      evaluation: 4.5,
      verified: true,
      featured: false
    },
    {
      id: "3",
      nom: "CleanMaster Services",
      categorie: "Entretien",
      description: "Services de nettoyage professionnel pour propriétés résidentielles et commerciales, utilisant des produits écologiques.",
      logo: "/logos/cleanmaster.png",
      adresse: "45 Rue du Commerce, 75015 Paris",
      telephone: "+33 6 12 34 56 78",
      email: "contact@cleanmaster.com",
      siteWeb: "https://cleanmaster-services.fr",
      codePromo: "IMUMO10",
      avantages: ["Devis gratuit", "Remise fidélité", "Produits écologiques"],
      photos: [
        "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800&h=600&auto=format",
        "https://images.unsplash.com/photo-1584820927498-cfe5034a0f9c?q=80&w=800&h=600&auto=format",
        "https://images.unsplash.com/photo-1563453392212-326f5e854473?q=80&w=800&h=600&auto=format"
      ],
      evaluation: 4.2,
      verified: true,
      featured: false
    },
    {
      id: "4",
      nom: "CabinetLegal Immo",
      categorie: "Juridique",
      description: "Cabinet d'avocats spécialisé en droit immobilier offrant des consultations personnalisées et une expertise reconnue.",
      logo: "/logos/cabinetlegal.png",
      adresse: "28 Place Vendôme, 75001 Paris",
      telephone: "+33 1 45 67 89 10",
      email: "contact@cabinetlegal.fr",
      siteWeb: "https://cabinetlegal-immo.fr",
      codePromo: "IMUMO20",
      avantages: ["Première consultation -50%", "Rédaction contrats", "Assistance juridique"],
      photos: [
        "https://images.unsplash.com/photo-1568992687947-868a62a9f521?q=80&w=800&h=600&auto=format",
        "https://images.unsplash.com/photo-1575505586569-646b2ca898fc?q=80&w=800&h=600&auto=format"
      ],
      evaluation: 4.7,
      verified: true,
      featured: true
    },
    {
      id: "5",
      nom: "RenovExpert",
      categorie: "Rénovation",
      description: "Entreprise de rénovation complète proposant des solutions clé en main avec des artisans hautement qualifiés.",
      logo: "/logos/renovexpert.png",
      adresse: "17 Rue des Entrepreneurs, 75015 Paris",
      telephone: "+33 6 98 76 54 32",
      email: "contact@renovexpert.fr",
      siteWeb: "https://renovexpert.fr",
      codePromo: "IMUMOREN",
      avantages: ["Garantie décennale", "Devis détaillé gratuit", "Suivi de chantier en ligne"],
      photos: [
        "https://images.unsplash.com/photo-1581360742512-021d5b2157d8?q=80&w=800&h=600&auto=format",
        "https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=800&h=600&auto=format",
        "https://images.unsplash.com/photo-1517581177682-a085bb7ffb38?q=80&w=800&h=600&auto=format",
        "https://images.unsplash.com/photo-1510563800743-aed236490d08?q=80&w=800&h=600&auto=format"
      ],
      evaluation: 4.6,
      verified: false,
      featured: false
    }
  ];

  // Catégories des prestataires
  const categories = [
    { id: "tous", label: "Tous", icon: <Users className="h-4 w-4" /> },
    { id: "decoration", label: "Décoration", icon: <Home className="h-4 w-4" /> },
    { id: "assurance", label: "Assurance", icon: <Shield className="h-4 w-4" /> },
    { id: "entretien", label: "Entretien", icon: <Brush className="h-4 w-4" /> },
    { id: "juridique", label: "Juridique", icon: <ScrollText className="h-4 w-4" /> },
    { id: "renovation", label: "Rénovation", icon: <Hammer className="h-4 w-4" /> }
  ];

  // Filtrer les prestataires selon la recherche et la catégorie
  const filteredPrestataires = prestataires.filter(prestataire => {
    const matchesSearch = prestataire.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          prestataire.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeTab === "tous" || 
                           prestataire.categorie.toLowerCase() === activeTab.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  // Copier le code promo dans le presse-papier
  const copyPromoCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert(`Code promo ${code} copié !`);
  };

  // Afficher les détails d'un prestataire
  const showPrestaireDetails = (prestataire: Prestataire) => {
    setSelectedPrestataire(prestataire);
    setCurrentPhotoIndex(0);
    setDialogOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 py-8"
    >
      {/* En-tête avec titre et recherche */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
        <div className="w-full md:w-auto">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-amber-500" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-500 to-yellow-300 dark:from-amber-600/80 dark:to-yellow-500/80 bg-clip-text text-transparent">
              Prestataires Partenaires
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Des experts sélectionnés pour vous offrir des services de qualité avec des avantages exclusifs
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
          <Button 
            variant="outline" 
            className="w-full sm:w-auto border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-700/50 dark:text-amber-400 dark:hover:bg-amber-900/20 dark:hover:text-amber-300 flex items-center justify-center gap-2"
            onClick={() => setSuggestDialogOpen(true)}
          >
            <Info className="h-4 w-4" />
            En savoir plus
          </Button>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              placeholder="Rechercher un prestataire..." 
              className="w-full pl-10 border-amber-200 focus:border-amber-400 dark:border-amber-700/30 dark:focus:border-amber-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Dialogue pour les suggestions */}
      <Dialog open={suggestDialogOpen} onOpenChange={setSuggestDialogOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-[90vw] md:w-[80vw] lg:w-[60vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-amber-500" />
              <DialogTitle className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400">
                Notre sélection de prestataires
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Nous sélectionnons les meilleurs prestataires partenaires pour vous aider dans votre activité immobilière.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/30 p-6 border border-amber-200/50 dark:border-amber-700/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-200/20 dark:bg-amber-700/20 group-hover:scale-110 transition-transform duration-300" />
                <div className="relative flex items-start gap-5">
                  <div className="bg-gradient-to-br from-amber-500 to-yellow-400 dark:from-amber-600 dark:to-amber-500 h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <ThumbsUp className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-3 text-amber-900 dark:text-amber-200">Sélection rigoureuse</h4>
                    <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                      Notre équipe analyse méticuleusement chaque prestataire selon des critères stricts : qualité des services, expérience, avis clients, et engagement envers l'excellence. Seuls les meilleurs rejoignent notre réseau.
                    </p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/30 p-6 border border-amber-200/50 dark:border-amber-700/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-200/20 dark:bg-amber-700/20 group-hover:scale-110 transition-transform duration-300" />
                <div className="relative flex items-start gap-5">
                  <div className="bg-gradient-to-br from-amber-500 to-yellow-400 dark:from-amber-600 dark:to-amber-500 h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <CheckCircle className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-3 text-amber-900 dark:text-amber-200">Qualité garantie</h4>
                    <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                      Chaque prestataire est régulièrement évalué sur la qualité de ses services, sa réactivité, et la satisfaction de ses clients. Nous maintenons des standards élevés pour vous garantir une expérience exceptionnelle.
                    </p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/30 p-6 border border-amber-200/50 dark:border-amber-700/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-200/20 dark:bg-amber-700/20 group-hover:scale-110 transition-transform duration-300" />
                <div className="relative flex items-start gap-5">
                  <div className="bg-gradient-to-br from-amber-500 to-yellow-400 dark:from-amber-600 dark:to-amber-500 h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Percent className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-3 text-amber-900 dark:text-amber-200">Tarifs négociés</h4>
                    <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                      Grâce à notre volume d'affaires, nous négocions des conditions privilégiées avec nos partenaires. Bénéficiez de remises exclusives allant jusqu'à 30% sur les services standards.
                    </p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/30 p-6 border border-amber-200/50 dark:border-amber-700/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-200/20 dark:bg-amber-700/20 group-hover:scale-110 transition-transform duration-300" />
                <div className="relative flex items-start gap-5">
                  <div className="bg-gradient-to-br from-amber-500 to-yellow-400 dark:from-amber-600 dark:to-amber-500 h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Handshake className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-3 text-amber-900 dark:text-amber-200">Simplicité d'accès</h4>
                    <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                      Un système de codes promo unique vous permet d'accéder instantanément à tous les avantages négociés. Plus besoin de négocier, les meilleures conditions sont déjà appliquées.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-amber-50 dark:bg-amber-900/10 p-4 sm:p-6 rounded-lg border border-amber-100 dark:border-amber-800/30"
            >
              <h3 className="text-lg sm:text-xl font-semibold mb-3 text-amber-800 dark:text-amber-300">Vous ne trouvez pas ce que vous cherchez ?</h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
                Dites-nous ce que vous recherchez et nous ferons notre possible pour trouver le prestataire idéal pour vous.
              </p>
              
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm sm:text-base font-medium">Type de prestataire recherché</Label>
                  <Input 
                    id="category"
                    placeholder="Ex: Décoration, Rénovation, Assurance..."
                    className="text-sm sm:text-base border-amber-200 focus:border-amber-400 dark:border-amber-700/30 dark:focus:border-amber-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm sm:text-base font-medium">Description de vos besoins</Label>
                  <Textarea 
                    id="description"
                    placeholder="Décrivez en détail ce que vous recherchez..."
                    className="min-h-[100px] sm:min-h-[120px] text-sm sm:text-base border-amber-200 focus:border-amber-400 dark:border-amber-700/30 dark:focus:border-amber-700"
                  />
                </div>
                
                <Button 
                  type="submit"
                  className="w-full text-sm sm:text-base bg-gradient-to-r from-amber-500 to-yellow-400 dark:from-amber-700 dark:to-amber-600 text-white hover:from-amber-600 hover:to-yellow-500 dark:hover:from-amber-600 dark:hover:to-amber-500 transition-all duration-300"
                >
                  Envoyer ma suggestion
                </Button>
              </form>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="text-sm text-gray-500 dark:text-gray-400 bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-100 dark:border-amber-800/30"
            >
              <p>Votre suggestion nous aide à identifier les besoins les plus fréquents et à rechercher les meilleures offres correspondantes. Nous analysons régulièrement ces demandes pour enrichir notre catalogue de prestataires.</p>
            </motion.div>
          </div>
          
          <DialogFooter className="sticky bottom-0 bg-white dark:bg-gray-900 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button 
              variant="outline" 
              onClick={() => setSuggestDialogOpen(false)}
              className="w-full sm:w-auto text-sm sm:text-base border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-700/30 dark:text-amber-400 dark:hover:bg-amber-900/20"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Onglets de catégories */}
      <Tabs defaultValue="tous" value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4">
          <TabsList className="w-full sm:w-auto bg-amber-50/50 dark:bg-amber-900/10 p-1 border border-amber-200/50 dark:border-amber-700/30">
            <div className="flex flex-wrap gap-1">
              {categories.map(category => (
                <TabsTrigger 
                  key={category.id} 
                  value={category.id}
                  className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900 dark:data-[state=active]:bg-amber-800/30 dark:data-[state=active]:text-amber-300 data-[state=active]:shadow-sm flex items-center gap-2"
                >
                  {category.icon}
                  {category.label}
                </TabsTrigger>
              ))}
            </div>
          </TabsList>
          <Button 
            variant="outline" 
            className="w-full sm:w-auto border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-700/50 dark:text-amber-400 dark:hover:bg-amber-900/20 dark:hover:text-amber-300 flex items-center justify-center gap-2"
          >
            <Filter size={16} />
            Filtres
          </Button>
        </div>

        {/* Contenu pour tous les onglets */}
        <TabsContent value={activeTab} className="mt-0">
          {/* Liste des prestataires */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredPrestataires.length > 0 ? (
              [...filteredPrestataires]
                .sort((a, b) => {
                  // Mettre les prestataires featured en premier
                  if (a.featured && !b.featured) return -1;
                  if (!a.featured && b.featured) return 1;
                  // Si les deux sont featured ou non, garder l'ordre d'origine
                  return 0;
                })
                .map((prestataire, index) => (
                <motion.div
                  key={prestataire.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 + 0.2 }}
                >
                  <Card className={`h-full overflow-hidden hover:shadow-md transition-shadow ${prestataire.featured ? 'border-amber-300 dark:border-amber-700/50 bg-gradient-to-b from-amber-50/50 dark:from-amber-900/10 to-transparent' : ''}`}>
                    {prestataire.featured && (
                      <div className="bg-gradient-to-r from-amber-500 to-yellow-400 dark:from-amber-700 dark:to-amber-600 text-white text-xs font-medium py-1 px-3 text-center">
                        Partenaire Premium
                      </div>
                    )}
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border border-amber-200/50 dark:border-amber-700/30">
                            <AvatarImage src={prestataire.logo} alt={prestataire.nom} />
                            <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{prestataire.nom.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg flex items-center">
                              {prestataire.nom}
                              {prestataire.verified && (
                                <Badge variant="outline" className="h-5 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/30 ml-1">
                                  <CheckCircle className="h-3 w-3 mr-1" /> Vérifié
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-0.5">
                              {prestataire.categorie} · <Star className="h-3 w-3 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" /> {prestataire.evaluation}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {prestataire.description}
                      </p>
                      
                      <div className="space-y-2">
                        {prestataire.photos.length > 0 && (
                          <div className="relative h-24 rounded-lg overflow-hidden mb-2">
                            <img
                              src={prestataire.photos[0]}
                              alt={`Photo de ${prestataire.nom}`}
                              className="w-full h-full object-cover"
                            />
                            {prestataire.photos.length > 1 && (
                              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                                +{prestataire.photos.length - 1}
                              </div>
                            )}
                          </div>
                        )}
                      
                        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-md px-3 py-2 border border-amber-100 dark:border-amber-800/30 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                            <span className="font-medium text-amber-700 dark:text-amber-400">{prestataire.codePromo}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:text-amber-500 dark:hover:text-amber-400 dark:hover:bg-amber-800/20 p-0 w-8"
                            onClick={() => copyPromoCode(prestataire.codePromo)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-700/40 dark:text-amber-400 dark:hover:bg-amber-900/20"
                        onClick={() => showPrestaireDetails(prestataire)}
                      >
                        Détails
                      </Button>
                      <Button 
                        className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-400 dark:from-amber-700 dark:to-amber-600 text-white hover:from-amber-600 hover:to-yellow-500 dark:hover:from-amber-600 dark:hover:to-amber-500"
                        onClick={() => window.open(prestataire.siteWeb, '_blank')}
                      >
                        <Globe className="h-4 w-4 mr-2" />
                        Site web
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full flex items-center justify-center p-12 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                <div className="text-center">
                  <Info className="h-12 w-12 text-amber-300 dark:text-amber-700/70 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucun prestataire trouvé</h3>
                  <p className="text-muted-foreground">Essayez de modifier vos critères de recherche</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de détails prestataire */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {selectedPrestataire && (
            <div className="flex flex-col max-h-[90vh]">
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle className="flex items-center gap-3 text-xl">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedPrestataire.logo} alt={selectedPrestataire.nom} />
                    <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{selectedPrestataire.nom.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  {selectedPrestataire.nom}
                  {selectedPrestataire.verified && (
                    <Badge variant="outline" className="h-5 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/30 ml-1">
                      <CheckCircle className="h-3 w-3 mr-1" /> Vérifié
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {selectedPrestataire.categorie} · <span className="inline-flex items-center"><Star className="h-3 w-3 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400 mr-1" /> {selectedPrestataire.evaluation}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="overflow-y-auto px-6 pb-2">
                {/* Photos avec navigation */}
                {selectedPrestataire.photos.length > 0 && (
                  <div className="mb-6">
                    <div className="relative rounded-lg overflow-hidden mb-3 bg-gray-100 dark:bg-gray-800">
                      <img
                        src={selectedPrestataire.photos[currentPhotoIndex]}
                        alt={`Photo de ${selectedPrestataire.nom}`}
                        className="w-full aspect-video object-cover"
                      />
                      {selectedPrestataire.photos.length > 1 && (
                        <>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full h-8 w-8"
                            onClick={() => setCurrentPhotoIndex((prev) => (prev === 0 ? selectedPrestataire.photos.length - 1 : prev - 1))}
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full h-8 w-8"
                            onClick={() => setCurrentPhotoIndex((prev) => (prev === selectedPrestataire.photos.length - 1 ? 0 : prev + 1))}
                          >
                            <ChevronRight className="h-5 w-5" />
                          </Button>
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                            {currentPhotoIndex + 1} / {selectedPrestataire.photos.length}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-amber-200 dark:scrollbar-thumb-amber-700/30">
                      {selectedPrestataire.photos.map((photo, index) => (
                        <div 
                          key={index} 
                          className={`rounded-md overflow-hidden border-2 ${currentPhotoIndex === index ? 'border-amber-500 dark:border-amber-600' : 'border-transparent'} cursor-pointer transition-all flex-shrink-0`}
                          onClick={() => setCurrentPhotoIndex(index)}
                        >
                          <img
                            src={photo}
                            alt={`Miniature ${index + 1}`}
                            className="w-16 h-12 object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">À propos</h3>
                  <p className="text-muted-foreground">{selectedPrestataire.description}</p>
                </div>

                {/* Grille d'informations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Colonne gauche - Avantages */}
                  <div>
                    <h3 className="text-lg font-medium mb-2">Avantages client</h3>
                    <ul className="space-y-2">
                      {selectedPrestataire.avantages.map((avantage, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                          <span>{avantage}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Colonne droite - Code promo */}
                  <div className="bg-amber-50 dark:bg-amber-900/10 rounded-md p-4 border border-amber-200 dark:border-amber-800/30 h-fit">
                    <h3 className="text-lg font-medium mb-2 text-amber-700 dark:text-amber-400 flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      Code promotionnel
                    </h3>
                    <div className="flex items-center justify-between bg-white dark:bg-background/70 rounded border border-amber-100 dark:border-amber-800/30 px-4 py-3">
                      <span className="font-mono text-lg font-medium">{selectedPrestataire.codePromo}</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-700/40 dark:text-amber-400 dark:hover:bg-amber-900/20"
                        onClick={() => copyPromoCode(selectedPrestataire.codePromo)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copier
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Utilisez ce code sur le site du prestataire pour bénéficier des avantages
                    </p>
                  </div>
                </div>

                {/* Coordonnées */}
                <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-md p-4 border border-amber-100 dark:border-amber-800/30 mb-6">
                  <h3 className="text-md font-medium mb-3 text-amber-800 dark:text-amber-400">Coordonnées</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Map className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Adresse</p>
                        <p className="text-sm text-muted-foreground">{selectedPrestataire.adresse}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Téléphone</p>
                        <p className="text-sm text-muted-foreground">{selectedPrestataire.telephone}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">{selectedPrestataire.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Globe className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Site web</p>
                        <a 
                          href={selectedPrestataire.siteWeb} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-amber-600 hover:text-amber-700 hover:underline dark:text-amber-500 dark:hover:text-amber-400 flex items-center gap-1"
                        >
                          {selectedPrestataire.siteWeb.replace(/^https?:\/\//, '')}
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/20 mt-auto">
                <div className="flex w-full gap-2 flex-col sm:flex-row sm:justify-between">
                  <Button variant="outline" className="sm:order-1" onClick={() => setDialogOpen(false)}>
                    Fermer
                  </Button>
                  <Button 
                    className="bg-gradient-to-r from-amber-500 to-yellow-400 dark:from-amber-700 dark:to-amber-600 text-white hover:from-amber-600 hover:to-yellow-500 dark:hover:from-amber-600 dark:hover:to-amber-500 sm:order-2"
                    onClick={() => window.open(selectedPrestataire.siteWeb, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visiter le site
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Nouveau modal React simple pour le Programme Partenaires */}
      {modalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 overflow-hidden"
          onClick={() => setModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-gray-900 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-6 w-6 text-amber-500" />
                  <h2 className="text-2xl font-semibold text-amber-700 dark:text-amber-400">
                    Nos Offres Partenaires Sélectionnées
                  </h2>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="h-9 w-9 p-0 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Nous recherchons et négocions les meilleures offres pour vous aider dans votre activité immobilière
              </p>
            </div>
            
            {/* Corps */}
            <div className="space-y-6 p-6">
              <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-6 border border-amber-100 dark:border-amber-800/30">
                <h3 className="text-xl font-medium mb-3 text-amber-800 dark:text-amber-300">Notre processus de sélection</h3>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                  Chez ImùMo, nous mettons un point d'honneur à rechercher et sélectionner les meilleures offres du marché
                  pour répondre à tous vos besoins immobiliers. Notre équipe d'experts analyse rigoureusement chaque
                  prestataire et négocie des conditions préférentielles exclusives pour nos clients.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                  <div className="flex gap-3">
                    <div className="bg-amber-100 dark:bg-amber-800/40 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0">
                      <ThumbsUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Sélection minutieuse</h4>
                      <p className="text-sm text-muted-foreground">Nous analysons des centaines de prestataires pour ne retenir que les plus performants du marché.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="bg-amber-100 dark:bg-amber-800/40 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Qualité garantie</h4>
                      <p className="text-sm text-muted-foreground">Tous nos partenaires sont évalués en continu pour assurer un niveau de service optimal.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="bg-amber-100 dark:bg-amber-800/40 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Percent className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Tarifs négociés</h4>
                      <p className="text-sm text-muted-foreground">Nous négocions directement avec chaque prestataire pour vous offrir des remises exceptionnelles.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="bg-amber-100 dark:bg-amber-800/40 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Handshake className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Simplicité d'accès</h4>
                      <p className="text-sm text-muted-foreground">Utilisez simplement les codes promo pour bénéficier instantanément de tous les avantages négociés.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Une offre complète pour votre activité</h3>
                <p className="text-gray-700 dark:text-gray-300">
                  Nous avons soigneusement sélectionné des partenaires dans tous les domaines essentiels à votre activité :
                  assurance, décoration, rénovation, services juridiques, entretien, financement et bien plus encore.
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  Notre objectif est de vous faire gagner du temps et de l'argent en vous donnant accès aux
                  meilleurs prestataires du marché avec des conditions privilégiées qu'aucun client individuel ne pourrait obtenir.
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-amber-600 to-yellow-500 dark:from-amber-800 dark:to-amber-700 p-6 rounded-xl text-white">
                <h3 className="text-lg font-medium mb-2">Les avantages de nos partenariats exclusifs</h3>
                <ul className="mb-4 opacity-90 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Des remises allant jusqu'à 30% sur les services standard</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Des prestations supplémentaires offertes (diagnostics, consultations, etc.)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Un traitement prioritaire de vos demandes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Une garantie de satisfaction sur toutes les prestations</span>
                  </li>
                </ul>
                <button 
                  className="bg-white text-amber-700 hover:bg-white/90 hover:text-amber-800 px-4 py-2 rounded-md font-medium text-sm"
                >
                  Explorer les offres
                </button>
              </div>
            </div>
            
            {/* Pied de page */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
              <button 
                onClick={() => setModalOpen(false)}
                className="border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
