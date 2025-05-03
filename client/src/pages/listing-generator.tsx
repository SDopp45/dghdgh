import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Building, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Property } from "@/lib/types";

// Import des composants
import { ListingGeneratorForm } from "../components/listing-generator/ListingGeneratorForm";
import { ListingPreview } from "../components/listing-generator/ListingPreview";

// Définition de l'interface pour l'annonce générée
export interface GeneratedListing {
  id: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  seoDescription: string;
  targetAudience: string;
  portal: string;
  type: 'sale' | 'rental';
  property: Property;
  createdAt: Date;
}

export default function ListingGeneratorPage() {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatedListing, setGeneratedListing] = useState<GeneratedListing | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState<string>("leboncoin");
  const [listingType, setListingType] = useState<'sale' | 'rental'>('sale');
  const [targetAudience, setTargetAudience] = useState<string>("general");

  const { toast } = useToast();

  // Chargement des propriétés depuis l'API
  useEffect(() => {
    const fetchProperties = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/properties");
        if (!response.ok) {
          throw new Error("Erreur lors du chargement des propriétés");
        }
        const data = await response.json();
        setProperties(data);
      } catch (error) {
        console.error("Erreur:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les propriétés",
          variant: "destructive",
        });
        // Données de test au cas où l'API échoue
        setProperties([
          { 
            id: 1, 
            name: "Appartement Paris", 
            type: "Appartement", 
            livingArea: 75,
            address: "Paris 11ème, France",
            rooms: 3,
            bedrooms: 2,
            bathrooms: 1,
            energyClass: "D",
            hasGarden: false,
            hasParking: true,
            hasBalcony: true,
            hasElevator: true,
            constructionYear: 1975,
            purchasePrice: 450000,
            monthlyRent: 1500
          },
          { 
            id: 2, 
            name: "Maison Bordeaux", 
            type: "Maison", 
            livingArea: 120,
            address: "Bordeaux Centre, France",
            rooms: 5,
            bedrooms: 3,
            bathrooms: 2,
            energyClass: "C",
            hasGarden: true,
            hasParking: true,
            hasBalcony: false,
            hasElevator: false,
            constructionYear: 2005,
            purchasePrice: 580000,
            monthlyRent: 2000
          }
        ] as Property[]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, [toast]);

  const handlePropertySelect = (propertyId: string) => {
    const property = properties.find(p => p.id === parseInt(propertyId));
    setSelectedProperty(property || null);
    
    // Réinitialiser l'annonce générée quand on change de propriété
    setGeneratedListing(null);
  };

  const generateListing = (options?: any) => {
    if (!selectedProperty) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une propriété",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    // Simulation de délai de génération
    setTimeout(() => {
      // Utiliser directement les options reçues du formulaire
      const tone = options?.tone || "professional";
      const detailLevel = options?.detailLevel || 50;
      const emphasisFeatures = options?.emphasisFeatures || {
        location: true,
        amenities: true,
        energyRating: true,
      };
      const customDescription = options?.customDescription;
      const includeKeywords = options?.includeKeywords;
      
      // Création de contenu basé sur les propriétés, les sélections et les options
      const newListing: GeneratedListing = {
        id: `listing-${Date.now()}`,
        title: generateTitle(selectedProperty, listingType, options),
        shortDescription: generateShortDescription(selectedProperty, listingType, options),
        longDescription: generateLongDescription(
          selectedProperty, 
          listingType, 
          targetAudience,
          tone,
          detailLevel,
          emphasisFeatures,
          customDescription,
          options
        ),
        seoDescription: generateSEODescription(
          selectedProperty, 
          listingType, 
          targetAudience,
          selectedPortal,
          options
        ),
        targetAudience,
        portal: selectedPortal,
        type: listingType,
        property: selectedProperty,
        createdAt: new Date()
      };
      
      setGeneratedListing(newListing);
      setIsGenerating(false);
      
      toast({
        title: "Succès",
        description: "L'annonce a été générée avec un ton " + 
          tone + " et un niveau de détail " + 
          (detailLevel < 30 ? "concis" : detailLevel < 60 ? "standard" : "détaillé"),
      });
    }, 1500);
  };

  // Fonction pour masquer le numéro d'adresse
  const maskAddressNumber = (address: string): string => {
    // Recherche d'un modèle de numéro au début de l'adresse
    // Exemples : "123 Rue de la Paix", "12bis Avenue des Champs-Élysées"
    const regex = /^(\d+\s*[a-zA-Z]*\s+)/;
    return address.replace(regex, '');
  };

  // Fonctions de génération de textes modifiées pour prendre en compte le ton et le style
  const generateTitle = (property: Property, type: 'sale' | 'rental', options?: any): string => {
    const typeLabel = type === 'sale' ? 'à vendre' : 'à louer';
    const roomsText = property.rooms ? `${property.rooms} pièces` : '';
    const bedroomsText = property.bedrooms !== undefined ? `${property.bedrooms} chambre${property.bedrooms > 1 ? 's' : ''}` : '';
    const areaText = property.livingArea ? `${property.livingArea}m²` : '';
    
    const addressDisplay = options?.hideAddressNumber 
      ? maskAddressNumber(property.address.split(',')[0]) 
      : property.address.split(',')[0];
    
    return `${property.type} ${roomsText} ${bedroomsText} ${areaText} ${typeLabel} - ${addressDisplay}`;
  };

  const generateShortDescription = (property: Property, type: 'sale' | 'rental', options?: any): string => {
    const action = type === 'sale' ? 'à vendre' : 'à louer';
    const addressDisplay = options?.hideAddressNumber 
      ? maskAddressNumber(property.address.split(',')[0]) 
      : property.address.split(',')[0];
    
    return `${property.type} de ${property.livingArea}m² avec ${property.rooms} pièces ${action} dans ${addressDisplay}. ${property.hasGarden ? 'Jardin. ' : ''}${property.hasParking ? 'Parking. ' : ''}${property.hasBalcony ? 'Balcon. ' : ''}DPE: ${property.energyClass}.`;
  };

  const generateLongDescription = (
    property: Property, 
    type: 'sale' | 'rental', 
    audience: string,
    tone: string = 'professional',
    detailLevel: number = 50,
    emphasisFeatures: any = {},
    customDescription?: string,
    options?: any
  ): string => {
    let intro = '';
    let features = '';
    let conclusion = '';
    
    // Adaptation selon le niveau de détail
    const detailFactor = {
      veryLow: detailLevel <= 20,
      low: detailLevel <= 40,
      medium: detailLevel > 40 && detailLevel <= 70,
      high: detailLevel > 70
    };
    
    // Fonction pour adapter le ton
    const applyTone = (text: string): string => {
      let result = text;
      
      switch(tone) {
        case 'friendly':
          // Ton amical, chaleureux et conversationnel
          result = result
            .replace(/Découvrez/g, 'Vous allez adorer')
            .replace(/situé dans/g, 'niché au cœur de')
            .replace(/magnifique/g, 'super')
            .replace(/bien/g, 'petit coin de paradis')
            .replace(/comprend/g, 'vous offre')
            .replace(/dispose/g, 'est équipé')
            .replace(/Une place de parking/g, 'Un parking super pratique')
            .replace(/jardin privé/g, 'jardin où vous pourrez vous détendre et recevoir vos amis')
            .replace(/À louer:/g, 'Votre futur chez-vous:')
            .replace(/balcon/g, 'balcon où vous pourrez prendre votre café du matin')
            .replace(/Excellent investissement/g, 'Une super affaire pour votre portefeuille')
            .replace(/Idéal pour/g, 'Parfait pour')
            .replace(/opportunité/g, 'chance à saisir')
            .replace(/\. /g, '! ');
          
          // Ajouter des expressions amicales et personnalisées selon le type de bien
          result = result
            .replace(/pièces/g, 'espaces où vous vous sentirez tout de suite chez vous')
            .replace(/salle\(s\) de bain/g, property.bathrooms && property.bathrooms > 1 ? 'salles de bain modernes et confortables' : 'salle de bain où vous pourrez vous détendre après une longue journée')
            .replace(/chambre\(s\)/g, property.bedrooms && property.bedrooms > 1 ? 'chambres cosy où vous passerez de bonnes nuits' : 'chambre douillette idéale pour se reposer')
            .replace(/cuisine/g, property.livingArea && property.livingArea > 100 ? 'cuisine spacieuse où vous préparerez de bons petits plats' : 'cuisine fonctionnelle et conviviale')
            .replace(/séjour/g, 'séjour chaleureux où vous passerez de super moments en famille');
            
          // Adapter le texte selon le type de bien avec un ton amical
          if (property.type !== 'Appartement' && property.type !== 'Maison' && property.type !== 'Studio') {
            result = adaptTextByPropertyType(property, result);
            
            // Ajouter des touches amicales spécifiques selon le type
            switch(property.type) {
              case 'Garage':
                result += " Plus besoin de chercher une place pendant des heures, votre voiture aura son propre petit nid douillet !";
                break;
              case 'Bureau':
                result += " Vous allez adorer travailler dans un cadre aussi agréable !";
                break;
              case 'Parking':
                result += " Fini le stress du stationnement !";
                break;
              case 'Immeuble':
                result += " Un investissement qui vous fera plaisir à chaque fin de mois !";
                break;
              case 'Terrain':
                result += " Imaginez déjà votre future maison sur ce petit coin de paradis !";
                break;
              case 'Local commercial':
                result += " Votre commerce va cartonner dans un emplacement aussi sympa !";
                break;
            }
          }
          break;
          
        case 'luxury':
          // Ton luxueux, sophistiqué et élégant
          result = result
            .replace(/Découvrez/g, 'Nous avons l\'honneur de vous présenter')
            .replace(/situé dans/g, 'majestueusement implanté dans')
            .replace(/magnifique/g, 'prestigieux')
            .replace(/bien/g, 'bien d\'exception')
            .replace(/comprend/g, 's\'articule autour de')
            .replace(/pièces/g, 'espaces de réception')
            .replace(/chambre\(s\)/g, property.bedrooms && property.bedrooms > 2 ? 'suites majestueuses' : 'suite princière')
            .replace(/salle\(s\) de bain/g, property.bathrooms && property.bathrooms > 1 ? 'salles d\'eau habillées de marbre italien' : 'salle d\'eau ornée de marbre fin')
            .replace(/Une place de parking/g, 'Un emplacement de stationnement privé et sécurisé')
            .replace(/jardin privé/g, 'parc arboré privatif aux essences sélectionnées')
            .replace(/À louer:/g, 'Location de prestige:')
            .replace(/balcon/g, 'terrasse privative offrant un panorama exceptionnel')
            .replace(/ascenseur/g, 'ascenseur desservant tous les niveaux avec accès sécurisé')
            .replace(/DPE/g, 'Diagnostic de Performance Énergétique')
            .replace(/Excellent investissement/g, 'Placement immobilier d\'exception pour une clientèle exigeante')
            .replace(/Idéal pour/g, 'Conçu pour satisfaire les attentes d\'une clientèle')
            .replace(/opportunité/g, 'opportunité rare sur le marché du luxe')
            .replace(/Prix:/g, 'Valorisation:')
            .replace(/Loyer:/g, 'Honoraires locatifs:');
          
          // Adapter le texte selon le type de bien avec un ton luxueux
          if (property.type !== 'Appartement' && property.type !== 'Maison' && property.type !== 'Studio') {
            result = adaptTextByPropertyType(property, result);
            
            // Ajouter des touches luxueuses spécifiques selon le type
            switch(property.type) {
              case 'Garage':
                result += " Un écrin sécurisé pour votre collection automobile d'exception.";
                break;
              case 'Bureau':
                result += " Un cadre professionnel prestigieux reflétant l'excellence de votre activité.";
                break;
              case 'Parking':
                result += " Sécurité et discrétion assurées pour votre véhicule de prestige.";
                break;
              case 'Immeuble':
                result += " Un patrimoine d'exception pour diversifier votre portefeuille d'investissements haut de gamme.";
                break;
              case 'Terrain':
                result += " Une parcelle d'exception qui n'attend que votre projet architectural d'envergure.";
                break;
              case 'Local commercial':
                result += " Une adresse prestigieuse pour valoriser l'image de marque de votre entreprise.";
                break;
            }
          }
          break;
          
        case 'enthusiastic':
          // Ton enthousiaste, énergique et positif
          result = result
            .replace(/Découvrez/g, 'COUP DE CŒUR pour')
            .replace(/situé dans/g, 'idéalement placé dans')
            .replace(/magnifique/g, 'SUPERBE')
            .replace(/bien/g, 'bien EXCEPTIONNEL')
            .replace(/comprend/g, 'vous éblouira avec')
            .replace(/Une place de parking/g, 'Un parking INCLUS')
            .replace(/jardin privé/g, 'jardin privatif à aménager selon vos envies')
            .replace(/À louer:/g, 'À SAISIR:')
            .replace(/balcon/g, 'balcon plein sud')
            .replace(/ascenseur/g, 'ascenseur récent')
            .replace(/Excellent investissement/g, 'INVESTISSEMENT en OR')
            .replace(/Idéal pour/g, 'PARFAIT pour')
            .replace(/opportunité/g, 'RARE opportunité');
          
          // Adapter le texte selon le type de bien avec un ton enthousiaste
          if (property.type !== 'Appartement' && property.type !== 'Maison' && property.type !== 'Studio') {
            result = adaptTextByPropertyType(property, result);
            
            // Ajouter des touches enthousiastes spécifiques selon le type
            switch(property.type) {
              case 'Garage':
                result += " ENFIN une solution idéale pour protéger votre véhicule !";
                break;
              case 'Bureau':
                result += " Un espace de travail EXCEPTIONNEL qui stimulera votre créativité !";
                break;
              case 'Parking':
                result += " PLUS JAMAIS de problème de stationnement !";
                break;
              case 'Immeuble':
                result += " Une OPPORTUNITÉ D'INVESTISSEMENT à ne surtout pas manquer !";
                break;
              case 'Terrain':
                result += " Un EMPLACEMENT PARFAIT pour réaliser la maison de vos rêves !";
                break;
              case 'Local commercial':
                result += " Un EMPLACEMENT EN OR pour développer votre activité !";
                break;
            }
          }
          break;
          
        case 'minimal':
          // Ton minimaliste, concis et factuel
          result = result
            .replace(/Découvrez ce magnifique/g, '')
            .replace(/À louer:/g, '')
            .replace(/idéalement /g, '')
            .replace(/magnifique /g, '')
            .replace(/Ce bien comprend/g, 'Comprend')
            .replace(/Une place de parking est incluse./g, 'Parking.')
            .replace(/Un jardin privé vient agrémenter ce bien./g, 'Jardin.')
            .replace(/Vous profiterez d'un balcon agréable./g, 'Balcon.')
            .replace(/L'immeuble dispose d'un ascenseur./g, 'Ascenseur.')
            .replace(/Construction de (\d+)./g, 'Constr. $1.')
            .replace(/avec un rendement locatif potentiel attractif./g, 'rendement potentiel.')
            .replace(/Une propriété d'exception aux prestations haut de gamme, pour les amateurs d'élégance et de raffinement./g, 'Haut de gamme.')
            .replace(/à proximité des écoles, commerces et espaces verts./g, 'proche commodités.')
            .replace(/ce bien offre un excellent rapport qualité-prix dans un secteur recherché./g, 'bon rapport qualité-prix.')
            .replace(/Excellent/g, '')
            .replace(/Idéal pour/g, 'Pour')
            .replace(/proche des transports et établissements d'enseignement./g, 'proche transports/écoles.')
            .replace(/avec tous les commerces et services à proximité. Environnement calme et sécurisé./g, 'quartier calme, services proximité.')
            .replace(/cherchant un pied-à-terre en France, dans un quartier dynamique et accessible./g, 'quartier accessible.')
            .replace(/Nous vous proposons à la location/g, 'Location:');
          
          // Adapter le texte selon le type de bien avec un ton minimaliste
          if (property.type !== 'Appartement' && property.type !== 'Maison' && property.type !== 'Studio') {
            result = adaptTextByPropertyType(property, result);
            
            // Simplifier encore pour le style minimaliste selon le type
            switch(property.type) {
              case 'Garage':
                result = result.replace(/Ce garage[^\.]+\./i, `Garage. ${property.livingArea ? property.livingArea + 'm². ' : ''}Sécurisé.`);
                break;
              case 'Bureau':
                result = result.replace(/Cet espace professionnel[^\.]+\./i, `Bureau. ${property.livingArea ? property.livingArea + 'm². ' : ''}Fonctionnel.`);
                break;
              case 'Parking':
                result = result.replace(/Cet emplacement[^\.]+\./i, `Parking. ${property.livingArea ? property.livingArea + 'm². ' : ''}Sécurisé.`);
                break;
              case 'Immeuble':
                result = result.replace(/Cet immeuble[^\.]+\./i, `Immeuble rapport. ${property.livingArea ? property.livingArea + 'm². ' : ''}Rentable.`);
                break;
              case 'Terrain':
                result = result.replace(/Ce terrain[^\.]+\./i, `Terrain. ${property.livingArea ? property.livingArea + 'm². ' : ''}Constructible.`);
                break;
              case 'Local commercial':
                result = result.replace(/Ce local commercial[^\.]+\./i, `Local com. ${property.livingArea ? property.livingArea + 'm². ' : ''}Vitrine.`);
                break;
            }
          }
          break;
          
        case 'authentic':
          // Ton authentique, chaleureux et traditionnel
          result = result
            .replace(/Découvrez/g, 'Laissez-vous charmer par')
            .replace(/situé dans/g, 'au cœur de')
            .replace(/magnifique/g, 'authentique')
            .replace(/bien/g, 'lieu de vie')
            .replace(/comprend/g, 'se compose de')
            .replace(/Une place de parking/g, 'Un stationnement')
            .replace(/jardin privé/g, 'jardin préservé aux plantations établies')
            .replace(/À louer:/g, 'À louer, véritable coup de cœur:')
            .replace(/balcon/g, 'balcon offrant une échappée visuelle sur les alentours')
            .replace(/ascenseur/g, 'accès par ascenseur')
            .replace(/Excellent investissement/g, 'Valeur patrimoniale assurée')
            .replace(/Idéal pour/g, 'Conviendra parfaitement à');
          
          // Adapter le texte selon le type de bien avec un ton authentique
          if (property.type !== 'Appartement' && property.type !== 'Maison' && property.type !== 'Studio') {
            result = adaptTextByPropertyType(property, result);
            
            // Ajouter des touches authentiques spécifiques selon le type
            switch(property.type) {
              case 'Garage':
                result += " Une construction traditionnelle offrant solidité et pérennité à travers le temps.";
                break;
              case 'Bureau':
                result += " Un cadre de travail empreint d'histoire où le charme d'antan côtoie les fonctionnalités modernes.";
                break;
              case 'Parking':
                result += " Un emplacement pratique dans un cadre au caractère préservé.";
                break;
              case 'Immeuble':
                result += " Un patrimoine bâti témoignant du savoir-faire architectural d'une époque.";
                break;
              case 'Terrain':
                result += " Une parcelle préservée où la nature a patiemment façonné chaque recoin.";
                break;
              case 'Local commercial':
                result += " Un espace commercial au charme authentique, idéal pour valoriser l'artisanat et le savoir-faire.";
                break;
            }
          }
          break;
          
        case 'persuasive':
          // Ton persuasif, convaincant et orienté action
          result = result
            .replace(/Découvrez/g, 'Saisissez l\'opportunité de posséder')
            .replace(/situé dans/g, 'stratégiquement situé à')
            .replace(/magnifique/g, 'exceptionnel')
            .replace(/bien/g, 'investissement')
            .replace(/comprend/g, 'vous offre')
            .replace(/Une place de parking/g, 'Un précieux emplacement de parking')
            .replace(/jardin privé/g, 'jardin privatif valorisant le bien')
            .replace(/À louer:/g, 'Offre exclusive de location:')
            .replace(/balcon/g, 'balcon, atout incontestable')
            .replace(/Excellent investissement/g, 'Placement à fort potentiel')
            .replace(/Idéal pour/g, 'Parfaitement adapté pour')
            .replace(/opportunité/g, 'chance unique');
          
          // Adapter le texte selon le type de bien avec un ton persuasif
          if (property.type !== 'Appartement' && property.type !== 'Maison' && property.type !== 'Studio') {
            result = adaptTextByPropertyType(property, result);
            
            // Ajouter des éléments persuasifs spécifiques selon le type
            switch(property.type) {
              case 'Garage':
                result += " La rareté des garages dans ce secteur en fait un investissement particulièrement stratégique dont la valeur ne cessera d'augmenter.";
                break;
              case 'Bureau':
                result += " Dans un marché de l'immobilier professionnel en pleine mutation, cet espace de travail représente une opportunité à saisir absolument.";
                break;
              case 'Parking':
                result += " Face à la régulation croissante du stationnement urbain, cet emplacement privé constitue un avantage concurrentiel majeur.";
                break;
              case 'Immeuble':
                result += " Avec des rendements locatifs supérieurs à la moyenne du marché, cet immeuble de rapport satisfera les investisseurs les plus exigeants.";
                break;
              case 'Terrain':
                result += " La raréfaction des terrains constructibles dans ce secteur en fait une opportunité d'investissement exceptionnelle à saisir dès maintenant.";
                break;
              case 'Local commercial':
                result += " L'emplacement stratégique de ce local commercial, générant un flux piétonnier exceptionnel, garantit une visibilité optimale pour votre activité.";
                break;
            }
          }
          break;
          
        case 'storytelling':
          // Ton narratif, évocateur et immersif
          result = result
            .replace(/Découvrez/g, 'Imaginez-vous dans')
            .replace(/situé dans/g, 'qui vous attend dans')
            .replace(/magnifique/g, 'charmant')
            .replace(/bien/g, 'lieu de vie')
            .replace(/comprend/g, 'vous raconte son histoire avec')
            .replace(/pièces/g, 'espaces de vie')
            .replace(/chambre\(s\)/g, 'espace(s) nuit')
            .replace(/salle\(s\) de bain/g, 'espace(s) bien-être')
            .replace(/Une place de parking/g, 'Un emplacement pour votre véhicule')
            .replace(/jardin privé/g, 'écrin de verdure qui vous attend')
            .replace(/À louer:/g, 'Votre nouvelle histoire commence dans')
            .replace(/balcon/g, 'balcon où vous contemplerez le paysage')
            .replace(/ascenseur/g, 'ascenseur qui vous mènera chez vous')
            .replace(/Excellent investissement/g, 'Le début d\'une belle aventure financière')
            .replace(/Idéal pour/g, 'Écrit pour');
          
          // Adapter le texte selon le type de bien avec un ton narratif
          if (property.type !== 'Appartement' && property.type !== 'Maison' && property.type !== 'Studio') {
            result = adaptTextByPropertyType(property, result);
            
            // Ajouter des éléments narratifs spécifiques selon le type
            switch(property.type) {
              case 'Garage':
                result += " Votre précieuse automobile trouvera enfin l'abri qu'elle mérite, à l'abri des intempéries et des regards indiscrets.";
                break;
              case 'Bureau':
                result += " Entre ces murs naîtront vos plus belles idées, se dessineront vos projets les plus ambitieux, s'écriront les plus beaux chapitres de votre réussite professionnelle.";
                break;
              case 'Parking':
                result += " Chaque soir, vous savourerez le luxe simple mais précieux de savoir exactement où votre véhicule vous attend, fidèle et protégé.";
                break;
              case 'Immeuble':
                result += " Cet immeuble raconte l'histoire de ses habitants passés et futurs, un patrimoine vivant qui traverse les époques en se réinventant sans cesse.";
                break;
              case 'Terrain':
                result += " Cette parcelle vierge attend patiemment que vous veniez y poser la première pierre de votre histoire familiale, le premier chapitre d'une nouvelle vie.";
                break;
              case 'Local commercial':
                result += " Dans ce local, les clients ne feront pas que passer, ils vivront une expérience, participeront à l'histoire que vous écrirez jour après jour.";
                break;
            }
          }
          break;
          
        case 'technical':
          // Ton technique, précis et objectif
          result = result
            .replace(/Découvrez/g, 'Présentation technique de')
            .replace(/situé dans/g, 'localisé dans le secteur géographique de')
            .replace(/magnifique/g, 'optimisé')
            .replace(/bien/g, 'bien immobilier')
            .replace(/comprend/g, 'est configuré avec')
            .replace(/Une place de parking/g, 'Un emplacement de stationnement (norme PMR)')
            .replace(/jardin privé/g, 'espace extérieur végétalisé privatif')
            .replace(/À louer:/g, 'Mise en location:')
            .replace(/balcon/g, 'extension extérieure type balcon')
            .replace(/ascenseur/g, 'système d\'élévation vertical')
            .replace(/Excellent investissement/g, 'Investissement à coefficient de rentabilité positif')
            .replace(/avec un rendement locatif potentiel attractif/g, 'rentabilité brute estimée entre 4% et 6% selon calcul standardisé')
            .replace(/DPE/g, 'Diagnostic de Performance Énergétique référence')
            .replace(/Idéal pour/g, 'Spécifications adaptées pour')
            .replace(/Prix:/g, 'Valorisation financière:')
            .replace(/Loyer:/g, 'Coût locatif mensuel:');
          
          // Adapter le texte selon le type de bien avec un ton technique
          if (property.type !== 'Appartement' && property.type !== 'Maison' && property.type !== 'Studio') {
            result = adaptTextByPropertyType(property, result);
            
            // Ajouter des spécifications techniques spécifiques selon le type
            switch(property.type) {
              case 'Garage':
                result += " Structure en béton armé avec porte sectionnelle motorisée et système de verrouillage à double sécurité.";
                break;
              case 'Bureau':
                result += " Infrastructure réseau pré-installée, luminaires LED à intensité variable et système de climatisation réversible conforme RT2020.";
                break;
              case 'Parking':
                result += " Revêtement sol type résine époxy anti-dérapante et signalétique normalisée.";
                break;
              case 'Immeuble':
                result += " Gestion technique centralisée des parties communes et coefficient d'occupation des sols optimisé.";
                break;
              case 'Terrain':
                result += " Étude géotechnique G1 réalisée, coefficient d'emprise au sol de 0.4, viabilisations en limite de propriété.";
                break;
              case 'Local commercial':
                result += " Vitrine en double vitrage feuilleté, rideau métallique électrique et système de traitement d'air conforme ERP.";
                break;
            }
          }
          break;
          
        default: // 'professional' (par défaut)
          // Ton professionnel, équilibré et neutre
          result = result
            .replace(/Découvrez/g, 'Nous vous présentons')
            .replace(/situé dans/g, 'situé dans le secteur recherché de')
            .replace(/magnifique/g, 'très bel')
            .replace(/bien/g, 'bien immobilier')
            .replace(/comprend/g, 'se compose de')
            .replace(/Une place de parking/g, 'Un emplacement de stationnement')
            .replace(/jardin privé/g, 'espace extérieur privatif')
            .replace(/À louer:/g, 'Nous vous proposons à la location')
            .replace(/balcon/g, 'balcon aménageable')
            .replace(/ascenseur/g, 'ascenseur desservant tous les étages')
            .replace(/Excellent investissement/g, 'Investissement à fort potentiel')
            .replace(/opportunité/g, 'opportunité immobilière');
            
          // Adapter le texte selon le type de bien avec un ton professionnel
          if (property.type !== 'Appartement' && property.type !== 'Maison' && property.type !== 'Studio') {
            result = adaptTextByPropertyType(property, result);
            
            // Ajouter des éléments professionnels spécifiques selon le type
            switch(property.type) {
              case 'Garage':
                result += " Cet emplacement représente une solution pratique de stationnement ou de stockage dans un secteur recherché.";
                break;
              case 'Bureau':
                result += " Cet espace de travail répond aux normes professionnelles actuelles et offre un cadre favorable à l'activité tertiaire.";
                break;
              case 'Parking':
                result += " Un investissement pragmatique dans un contexte urbain où le stationnement constitue un enjeu croissant.";
                break;
              case 'Immeuble':
                result += " Ce bien constitue une opportunité d'investissement avec un potentiel de rendement locatif intéressant.";
                break;
              case 'Terrain':
                result += " Cette parcelle constructible présente un potentiel de valorisation à moyen et long terme.";
                break;
              case 'Local commercial':
                result += " L'emplacement, la configuration et la visibilité de ce local sont des atouts pour le développement d'une activité commerciale.";
                break;
            }
          }
          break;
      }
      
      return result;
    };
    
    // Introduction selon le type de bien et d'annonce - adapté au niveau de détail
    if (type === 'sale') {
      const addressDisplay = options?.hideAddressNumber 
        ? maskAddressNumber(property.address.split(',')[0]) 
        : property.address.split(',')[0];
      
      intro = detailFactor.veryLow 
        ? `${property.type} de ${property.livingArea}m² à ${addressDisplay}.` 
        : `Découvrez ce ${detailFactor.high ? 'magnifique' : ''} ${property.type.toLowerCase()} de ${property.livingArea}m² situé dans ${addressDisplay}.`;
    } else {
      const addressDisplay = options?.hideAddressNumber 
        ? maskAddressNumber(property.address.split(',')[0]) 
        : property.address.split(',')[0];
      
      intro = detailFactor.veryLow 
        ? `${property.type} de ${property.livingArea}m² à louer à ${addressDisplay}.` 
        : `À louer: ${property.type.toLowerCase()} de ${property.livingArea}m² ${detailFactor.medium || detailFactor.high ? 'idéalement situé dans' : 'à'} ${addressDisplay}.`;
    }
    
    // Optimisation SEO subtile de l'introduction
    if (true) {
      // Ajout de termes pertinents selon le type de bien
      if (property.type === 'Appartement' && !intro.includes('appartement')) {
        intro = intro.replace(property.type, `${property.type.toLowerCase()} ${property.rooms} pièces`);
      } else if (property.type === 'Maison' && !intro.includes('maison')) {
        intro = intro.replace(property.type, `${property.type.toLowerCase()} ${property.rooms} pièces`);
      }
      
      // Ajout de qualificatifs pertinents selon l'audience
      if (audience === 'luxury' && !intro.includes('standing')) {
        intro += detailFactor.veryLow ? ' Haut standing.' : ' Ce bien de haut standing vous séduira par ses prestations exceptionnelles.';
      } else if (audience === 'family' && !intro.includes('familial')) {
        intro += detailFactor.veryLow ? ' Idéal famille.' : ' Cet espace familial offre tout le confort nécessaire pour votre foyer.';
      }
    }
    
    // Application du ton pour l'introduction
    intro = applyTone(intro);
    
    // Mention d'exclusivité (toujours visible quel que soit le niveau de détail)
    if (options?.includeExclusivity) {
      intro = `EXCLUSIVITÉ - ${intro}`;
    }
    
    // Caractéristiques de base - adaptées au niveau de détail
    if (detailFactor.veryLow) {
      features = `${property.rooms}p, ${property.bedrooms || 0}ch, ${property.bathrooms || 0}sdb. ${property.livingArea}m².`;
    } else {
      features = `Ce bien comprend ${property.rooms} pièce${property.rooms > 1 ? 's' : ''} dont ${property.bedrooms || 0} chambre${(property.bedrooms || 0) > 1 ? 's' : ''} et ${property.bathrooms || 0} salle${(property.bathrooms || 0) > 1 ? 's' : ''} de bain.`;
    }
    
    // Caractéristiques standards - adapter selon le niveau de détail
    let standardFeatures = '';
    
    if (!detailFactor.veryLow) {
    if (emphasisFeatures.amenities) {
        if (detailFactor.low) {
          // Version concise
          let amenities = [];
          if (property.hasGarden) amenities.push('Jardin');
          if (property.hasParking) amenities.push('Parking');
          if (property.hasBalcony) amenities.push('Balcon');
          if (property.hasElevator) amenities.push('Ascenseur');
          if (amenities.length > 0) {
            standardFeatures += `${amenities.join(', ')}.`;
          }
        } else {
          // Version détaillée
          if (property.hasGarden) standardFeatures += 'Un jardin privé vient agrémenter ce bien. ';
          if (property.hasParking) standardFeatures += 'Une place de parking est incluse. ';
          if (property.hasBalcony) standardFeatures += 'Vous profiterez d\'un balcon agréable. ';
          if (property.hasElevator) standardFeatures += 'L\'immeuble dispose d\'un ascenseur. ';
        }
      }
      
      if (emphasisFeatures.energyRating && property.energyClass) {
        standardFeatures += detailFactor.low
          ? `DPE: ${property.energyClass}.`
          : `${property.constructionYear ? `Construction de ${property.constructionYear}. ` : ''}DPE: ${property.energyClass}.`;
      }
    }
    
    if (standardFeatures) {
      features += detailFactor.veryLow ? ` ${standardFeatures}` : `\n${standardFeatures}`;
    }

    // Caractéristiques avancées - uniquement pour niveau de détail moyen à élevé
    if (detailFactor.medium || detailFactor.high) {
      let advancedFeatures = '';
      let featuresCount = 0;
      const maxFeatures = detailFactor.high ? 8 : (detailLevel >= 60 ? 5 : 3);
      
      // Construction et intérieur
      if ((emphasisFeatures.buildingQuality || emphasisFeatures.renovations || emphasisFeatures.quietness) && featuresCount < maxFeatures) {
        let buildingDesc = '';
        if (emphasisFeatures.buildingQuality) {
          buildingDesc += detailFactor.high 
            ? 'Construction de qualité utilisant des matériaux nobles et durables. ' 
            : 'Construction de qualité. ';
        }
        if (emphasisFeatures.renovations) {
          buildingDesc += detailFactor.high 
            ? 'Rénovation récente apportant confort et modernité. ' 
            : 'Rénovation récente. ';
        }
        if (emphasisFeatures.quietness) {
          buildingDesc += detailFactor.high 
            ? 'Environnement calme avec excellente isolation phonique. ' 
            : 'Environnement calme. ';
        }
        
        if (buildingDesc) {
          advancedFeatures += `\n\n${tone === 'luxury' ? 'QUALITÉ DE CONSTRUCTION : ' : ''}${buildingDesc}`;
          featuresCount++;
        }
      }
      
      // Extérieurs
      if ((emphasisFeatures.exteriors || emphasisFeatures.view || emphasisFeatures.parking) && featuresCount < maxFeatures) {
        let exteriorDesc = '';
        if (emphasisFeatures.exteriors) {
          exteriorDesc += detailFactor.high 
            ? 'Espaces extérieurs soignés offrant un cadre de vie agréable. ' 
            : 'Espaces extérieurs soignés. ';
        }
        if (emphasisFeatures.view) {
          exteriorDesc += detailFactor.high 
            ? 'Belle exposition et vue dégagée offrant une excellente luminosité. ' 
            : 'Belle exposition et vue dégagée. ';
        }
        if (emphasisFeatures.parking && !property.hasParking) {
          exteriorDesc += 'Stationnement à proximité. ';
        }
        
        if (exteriorDesc) {
          advancedFeatures += `\n\n${tone === 'luxury' ? 'EXTÉRIEURS : ' : ''}${exteriorDesc}`;
          featuresCount++;
        }
      }
      
      // Équipements
      if ((emphasisFeatures.connectivity || emphasisFeatures.security) && featuresCount < maxFeatures) {
        let equipDesc = '';
        if (emphasisFeatures.connectivity) {
          equipDesc += detailFactor.high 
            ? 'Connexion internet haut débit et fibre optique disponible. ' 
            : 'Connexion internet haut débit. ';
        }
        if (emphasisFeatures.security) {
          equipDesc += detailFactor.high 
            ? 'Équipements de sécurité modernes incluant alarme et interphone. ' 
            : 'Sécurité renforcée. ';
        }
        
        if (equipDesc) {
          advancedFeatures += `\n\n${tone === 'luxury' ? 'ÉQUIPEMENTS : ' : ''}${equipDesc}`;
          featuresCount++;
        }
      }
      
      // Potentiel
      if ((emphasisFeatures.potentialDevelopment || emphasisFeatures.lowCharges) && featuresCount < maxFeatures) {
        let potentialDesc = '';
        if (emphasisFeatures.potentialDevelopment) {
          potentialDesc += detailFactor.high 
            ? 'Potentiel d\'aménagement avec possibilité d\'extension. ' 
            : 'Potentiel d\'aménagement. ';
        }
        if (emphasisFeatures.lowCharges) {
          potentialDesc += detailFactor.high 
            ? 'Charges particulièrement maîtrisées, excellent ratio qualité-prix. ' 
            : 'Charges maîtrisées. ';
        }
        
        if (potentialDesc) {
          advancedFeatures += `\n\n${tone === 'luxury' ? 'POTENTIEL : ' : ''}${potentialDesc}`;
          featuresCount++;
        }
      }
      
      // Ajout des caractéristiques avancées
      if (advancedFeatures) {
        features += advancedFeatures;
      }
    }
    
    // Options supplémentaires - uniquement si niveau de détail suffisant
    if (!detailFactor.veryLow && !detailFactor.low) {
      // Visite virtuelle - prioritaire
      if (options?.includeVirtualTour && options?.virtualTourLink) {
        features += `\n\n${tone === 'enthusiastic' ? 'VISITE VIRTUELLE : ' : 'Visite virtuelle : '}${options.virtualTourLink}`;
      }
      
      // Disponibilité - si niveau de détail élevé
      if (detailFactor.high && options?.includeAvailability && options?.availabilityInfo) {
        const availInfo = options.availabilityInfo;
        let availText = "\n\n";
        
        if (availInfo.availableFrom) {
          availText += `Disponible à partir du ${availInfo.availableFrom}. `;
        } else if (options?.includeRentalDetails && options?.rentalDetails?.availabilityDate) {
          // Utiliser la date de disponibilité des détails de location si disponible
          availText += `Disponible à partir du ${options.rentalDetails.availabilityDate}. `;
        }
        
        if (availInfo.visitDays) {
          availText += `Visites possibles ${availInfo.visitDays}.`;
        }
        
        if (availText.length > 4) {
          features += availText;
        }
      }
      
      // Documents techniques - uniquement si niveau très détaillé
      if (detailFactor.high && options?.includeTechnicalDocs && options?.technicalDocsInfo) {
        const docsInfo = options.technicalDocsInfo;
        let docsAvailable = [];
        
        if (docsInfo.hasDPE) docsAvailable.push("DPE");
        if (docsInfo.hasAsbestos) docsAvailable.push("diagnostic amiante");
        if (docsInfo.hasLead) docsAvailable.push("diagnostic plomb");
        if (docsInfo.hasElectrical) docsAvailable.push("diagnostic électrique");
        
        if (docsAvailable.length > 0) {
          features += `\n\nDiagnostics disponibles : ${docsAvailable.join(", ")}.`;
        }
      }
    }
    
    // Application du ton pour les caractéristiques
    features = applyTone(features);
    
    // Préparation de la conclusion - adapté au niveau de détail
    // Prix/loyer - toujours présent mais format adapté
    let priceInfo = '';
    if (type === 'sale') {
      priceInfo = detailFactor.veryLow 
        ? `${property.purchasePrice?.toLocaleString()}€` 
        : `Prix: ${property.purchasePrice?.toLocaleString()}€.`;
    } else {
      // Pour les locations, ajouter les détails si disponibles
      let rentalCharges = '';
      if (options?.includeRentalDetails && options?.rentalDetails) {
        const details = options.rentalDetails;
        
        if (details.charges) {
          rentalCharges += ` Charges: ${details.charges}.`;
        }
        
        if (details.deposit) {
          rentalCharges += ` Dépôt de garantie: ${details.deposit}.`;
        }
        
        if (details.leaseDuration) {
          rentalCharges += ` Durée du bail: ${details.leaseDuration}.`;
        }
      }
      
      priceInfo = detailFactor.veryLow 
        ? `${property.monthlyRent?.toLocaleString()}€/mois${rentalCharges ? ` (${rentalCharges})` : ''}` 
        : `Loyer: ${property.monthlyRent?.toLocaleString()}€/mois.${rentalCharges}`;
    }
    
    // Conclusion spécifique à l'audience - adaptée au niveau de détail
    if (detailFactor.veryLow) {
      // Version ultra-concise pour niveau très faible
      let audienceLabel = '';
      switch(audience) {
        case 'investor': audienceLabel = 'Investissement'; break;
        case 'family': audienceLabel = 'Familial'; break; 
        case 'student': audienceLabel = 'Étudiant'; break;
        case 'luxury': audienceLabel = 'Prestige'; break;
        case 'senior': audienceLabel = 'Seniors'; break;
        case 'firsttime': audienceLabel = 'Premier achat'; break;
        case 'expat': audienceLabel = 'Expatriés'; break;
        case 'professional': audienceLabel = 'Pro'; break;
        case 'airbnb': audienceLabel = 'Location courte'; break;
        case 'coliving': audienceLabel = 'Colocation'; break;
        default: audienceLabel = '';
      }
      
      conclusion = audienceLabel ? `Idéal ${audienceLabel}. ${priceInfo}` : priceInfo;
    } else {
      // Version plus détaillée selon le niveau
    if (audience === 'investor') {
        conclusion = `Excellent investissement${detailFactor.medium || detailFactor.high ? ' avec rendement locatif attractif' : ''}. ${priceInfo}`;
    } else if (audience === 'family') {
        conclusion = `Idéal pour une famille${detailFactor.medium || detailFactor.high ? ', proche écoles et commerces' : ''}. ${priceInfo}`;
    } else if (audience === 'student') {
        conclusion = `Parfait pour étudiants${detailFactor.medium || detailFactor.high ? ', proche transports et universités' : ''}. ${priceInfo}`;
    } else if (audience === 'luxury') {
        conclusion = `Propriété d'exception${detailFactor.medium || detailFactor.high ? ' aux prestations haut de gamme' : ''}. ${priceInfo}`;
    } else if (audience === 'senior') {
        conclusion = `Idéal pour seniors${detailFactor.medium || detailFactor.high ? ', quartier calme, services proximité' : ''}. ${priceInfo}`;
    } else if (audience === 'firsttime') {
        conclusion = `Parfait premier achat${detailFactor.medium || detailFactor.high ? ', excellent rapport qualité-prix' : ''}. ${priceInfo}`;
    } else if (audience === 'expat') {
        conclusion = `Idéal pour expatriés${detailFactor.medium || detailFactor.high ? ', quartier dynamique et accessible' : ''}. ${priceInfo}`;
      } else if (audience === 'professional') {
        conclusion = `Adapté aux professionnels${detailFactor.medium || detailFactor.high ? ', emplacement stratégique' : ''}. ${priceInfo}`;
      } else if (audience === 'airbnb') {
        conclusion = `Potentiel location courte durée${detailFactor.medium || detailFactor.high ? ', secteur prisé par voyageurs' : ''}. ${priceInfo}`;
      } else if (audience === 'coliving') {
        conclusion = `Parfait pour colocation${detailFactor.medium || detailFactor.high ? ', espaces bien agencés' : ''}. ${priceInfo}`;
      } else if (audience === 'retirement') {
        conclusion = `Adapté pour retraite paisible${detailFactor.medium || detailFactor.high ? ', cadre de vie agréable' : ''}. ${priceInfo}`;
      } else if (audience === 'entrepreneur') {
        conclusion = `Idéal pour entrepreneurs${detailFactor.medium || detailFactor.high ? ', espaces modulables' : ''}. ${priceInfo}`;
      } else if (audience === 'international') {
        conclusion = `Adapté clientèle internationale${detailFactor.medium || detailFactor.high ? ', environnement cosmopolite' : ''}. ${priceInfo}`;
      } else if (audience === 'ecofriendly') {
        conclusion = `Pour amateurs d'écologie${detailFactor.medium || detailFactor.high ? ', empreinte écologique maîtrisée' : ''}. ${priceInfo}`;
    } else {
        conclusion = `Ne manquez pas cette opportunité. ${priceInfo}`;
      }
    }
    
    // Mention d'exclusivité
    if (options?.includeExclusivity && !detailFactor.veryLow) {
      conclusion += " Cette offre est proposée en exclusivité.";
    }
    
    // Optimisation SEO subtile pour la conclusion
    if ((detailFactor.medium || detailFactor.high)) {
      // Ajout de termes pertinents selon le type de bien et l'audience
      if (audience === 'investor' && !conclusion.includes('placement')) {
        conclusion = conclusion.replace('Excellent investissement', 'Excellent placement immobilier');
      } else if (audience === 'luxury' && !conclusion.includes('prestige')) {
        conclusion = conclusion.replace('Propriété d\'exception', 'Bien immobilier de prestige');
      }
    }
    
    // Application du ton pour la conclusion
    conclusion = applyTone(conclusion);
    
    // Informations de l'entreprise et frais - adaptés au niveau de détail
    let contactInfo = '';
    
    // Informations de l'entreprise
    if (options?.includeCompanyInfo && options?.companyInfo) {
      const company = options.companyInfo;
      
      if (detailFactor.veryLow) {
        // Version ultra-concise
        if (company.phone) {
          contactInfo += ` Contact: ${company.phone}`;
        }
      } else if (detailFactor.low) {
        // Version concise
        contactInfo += "\n\n";
        if (company.name) contactInfo += `${company.name}. `;
        if (company.phone) contactInfo += `Tél: ${company.phone}`;
        if (company.siret) contactInfo += ` SIRET: ${company.siret}`;
      } else {
        // Version détaillée
        contactInfo += "\n\n";
        if (company.name) {
          contactInfo += `Proposé par ${company.name}. `;
        }
        
        let contacts = [];
        if (company.phone) contacts.push(`Téléphone: ${company.phone}`);
        if (company.email) contacts.push(`Email: ${company.email}`);
        if (company.website) contacts.push(`Site web: ${company.website}`);
        if (company.siret) contacts.push(`SIRET: ${company.siret}`);
        
        if (contacts.length > 0) {
          contactInfo += `Pour plus d'informations: ${contacts.join(" - ")}`;
        }
      }
    }
    
    // Détails des frais - adaptés au niveau de détail
    if (options?.includeFees && options?.feesInfo) {
      const fees = options.feesInfo;
      
      if (detailFactor.veryLow) {
        // Pas d'ajout pour niveau très faible
      } else if (detailFactor.low) {
        // Version concise
        if (contactInfo) contactInfo += " ";
        if (type === 'sale') {
          if (fees.notaryFees) contactInfo += `Notaire: ${fees.notaryFees}. `;
          if (fees.agencyFees) contactInfo += `Honoraires: ${fees.agencyFees}.`;
        } else {
          if (fees.agencyFees) contactInfo += `Honoraires: ${fees.agencyFees}.`;
        }
      } else {
        // Version détaillée
        contactInfo += "\n\n";
        
        if (type === 'sale') {
          if (fees.notaryFees) contactInfo += `Frais de notaire: ${fees.notaryFees}. `;
          if (fees.agencyFees) contactInfo += `Honoraires d'agence: ${fees.agencyFees}. `;
        } else {
          if (fees.agencyFees) contactInfo += `Honoraires d'agence: ${fees.agencyFees}. `;
        }
        
        if (fees.otherFees && detailFactor.high) contactInfo += `Autres frais: ${fees.otherFees}.`;
      }
    }
    
    // Ajout des informations de contact à la conclusion
    conclusion += contactInfo;
    
    // Finalisation de la description selon le niveau de détail et le ton
    let finalDescription = '';
    
    if (detailFactor.veryLow) {
      // Format minimaliste pour niveau très faible
      finalDescription = `${intro}\n\n${features}\n\n${conclusion}`;
    } else if (detailFactor.low) {
      // Format concis pour niveau faible
      finalDescription = `${intro}\n\n${features}\n\n${conclusion}`;
    } else {
      // Format standard avec espacement pour niveau moyen et élevé
      finalDescription = `${intro}\n\n${features}\n\n${conclusion}`;
      
      // Ajout de la description personnalisée si fournie et niveau suffisant
    if (customDescription) {
      finalDescription += `\n\n${customDescription}`;
      }
    }
    
    // Ajouter phrase de conclusion spécifique au ton, uniquement à la fin
    if (!finalDescription.includes("n'hésitez pas") && !finalDescription.includes("Ne tardez pas") && 
        !finalDescription.includes("Une page se tourne") && !finalDescription.includes("raffinement") && 
        !finalDescription.includes("charme") && !finalDescription.includes("Ne manquez")) {
      
      // Ajouter une phrase finale appropriée selon le ton et le niveau de détail
      switch(tone) {
        case 'friendly':
          finalDescription += " N'hésitez pas à nous contacter pour plus d'infos ou une visite !";
          break;
        case 'persuasive':
          finalDescription += " Ne tardez pas, les biens de cette qualité sont rares sur le marché actuel et connaissent une forte demande ! Contactez-nous dès aujourd'hui pour organiser une visite.";
          break;
        case 'enthusiastic':
          finalDescription += " Ne manquez surtout pas cette occasion UNIQUE !!! CONTACTEZ-NOUS VITE !!!";
          break;
        case 'storytelling':
          finalDescription += " Une page se tourne, à vous d'écrire la suite de l'histoire entre ces murs qui ont tant à raconter.";
          break;
        case 'luxury':
          finalDescription += " L'alliance parfaite entre raffinement et fonctionnalité pour une expérience de vie incomparable.";
          break;
        case 'authentic':
          finalDescription += " Un bien qui a conservé tout son charme et son authenticité au fil des années.";
          break;
        case 'technical':
          if (detailFactor.medium || detailFactor.high) {
            finalDescription += " Bien en conformité avec les normes actuelles de construction et d'habitabilité RT2012/RE2020. Isolation thermique et phonique aux standards actuels.";
          }
          break;
      }
    }
    
    // Ajouter avant le return final
    finalDescription = adaptTextByPropertyType(property, finalDescription);
    
    return finalDescription;
  };

  const generateSEODescription = (
    property: Property, 
    type: 'sale' | 'rental', 
    audience: string = 'general',
    portal: string = 'leboncoin',
    options?: any
  ): string => {
    // Mots-clés primaires et secondaires
    const primaryKeywords = [];
    const secondaryKeywords = [];
    
    // Action principale (achat/location)
    const action = type === 'sale' ? 'Achat' : 'Location';
    const price = type === 'sale' ? property.purchasePrice : property.monthlyRent;
    
    // Ajout des caractéristiques principales
    primaryKeywords.push(
      property.type.toLowerCase(),
      `${property.rooms} pièces`,
      `${property.livingArea}m²`,
      property.address.split(',')[0].toLowerCase()
    );
    
    // Ajout de mots-clés basés sur l'audience
    switch(audience) {
      case 'investor':
        primaryKeywords.push('investissement immobilier');
        secondaryKeywords.push('rendement locatif', 'placement immobilier', 'rentabilité');
        break;
      case 'luxury':
        primaryKeywords.push('prestige', 'haut de gamme');
        secondaryKeywords.push('luxe', 'standing', 'exceptionnel');
        break;
      case 'family':
        primaryKeywords.push('familial');
        secondaryKeywords.push('écoles', 'parc', 'sécurisé', 'jardins');
        break;
      case 'firsttime':
        primaryKeywords.push('premier achat');
        secondaryKeywords.push('abordable', 'débutant', 'primo-accédant');
        break;
      case 'student':
        primaryKeywords.push('étudiant');
        secondaryKeywords.push('université', 'campus', 'transport', 'meublé');
        break;
      case 'senior':
        primaryKeywords.push('senior');
        secondaryKeywords.push('calme', 'accessibilité', 'plain-pied', 'sécurisé');
        break;
      case 'expat':
        primaryKeywords.push('expatrié');
        secondaryKeywords.push('international', 'étranger', 'services');
        break;
      case 'ecofriendly':
        primaryKeywords.push('écologique');
        secondaryKeywords.push('économie d\'énergie', 'durable', 'faible consommation');
        break;
      default:
        // Audience générale - ajout de mots-clés génériques
        secondaryKeywords.push('bien immobilier', 'qualité', 'confort');
    }
    
    // Ajout de mots-clés basés sur les caractéristiques
    if (property.hasGarden) primaryKeywords.push('jardin');
    if (property.hasParking) primaryKeywords.push('parking');
    if (property.hasBalcony) primaryKeywords.push('balcon');
    if (property.hasElevator) secondaryKeywords.push('ascenseur');
    if (property.energyClass && property.energyClass <= 'C') {
      primaryKeywords.push(`DPE ${property.energyClass}`);
      secondaryKeywords.push('économe en énergie');
    } else if (property.energyClass) {
      secondaryKeywords.push(`DPE ${property.energyClass}`);
    }
    
    // Adapter le SEO au portail
    let portalSpecificKeywords = '';
    switch(portal) {
      case 'seloger':
        portalSpecificKeywords = 'exclusivité à ne pas manquer';
        break;
      case 'leboncoin':
        portalSpecificKeywords = 'annonce particulier direct';
        break;
      case 'bienici':
        portalSpecificKeywords = 'coup de cœur estimation';
        break;
      case 'pap':
        portalSpecificKeywords = 'sans frais agence particulier';
        break;
      case 'facebook':
      case 'instagram':
        portalSpecificKeywords = 'disponible immédiatement photos supplémentaires';
        break;
      default:
        portalSpecificKeywords = 'annonce immobilière';
    }
    
    // Ajout des mots-clés personnalisés si disponibles et optimizeSEO activé
    let customKeywords = '';
    if (options?.includeKeywords) {
      if (Array.isArray(options.includeKeywords)) {
        customKeywords = ` ${options.includeKeywords.join(' ')}`;
      } else if (typeof options.includeKeywords === 'string') {
        customKeywords = ` ${options.includeKeywords}`;
      }
    }
    
    // Construction de la méta-description SEO
    const locationName = property.address.split(',')[0];
    
    // Construire une description SEO optimisée selon les normes 2025-2026
    const longTailKeyword = `${action} ${property.type.toLowerCase()} ${property.rooms} pièces ${locationName}`;
    
    const priceFormatted = price ? `${price.toLocaleString()}€${type === 'sale' ? '' : '/mois'}` : '';
    
    // Partie 1: Titre SEO structuré avec mots-clés primaires
    const seoTitle = `${longTailKeyword} ${primaryKeywords.slice(0, 3).join(' ')}`;
    
    // Partie 2: Description avec mots-clés secondaires et spécifiques au portail
    const seoDescription = `${seoTitle}. ${property.livingArea}m² ${secondaryKeywords.slice(0, 3).join(', ')}. ${portalSpecificKeywords}${customKeywords}. ${priceFormatted}`;
    
    // Format optimisé pour les moteurs de recherche 2025-2026 (150-160 caractères max)
    return seoDescription.length > 160 ? seoDescription.substring(0, 157) + '...' : seoDescription;
  };

  // Ajouter une fonction pour adapter le texte selon le type de bien
  const adaptTextByPropertyType = (property: Property, text: string): string => {
    let result = text;
    
    // Adapter le texte selon le type de bien
    switch(property.type) {
      case 'Appartement':
      case 'Maison':
      case 'Studio':
        // Déjà gérés par le code existant
        break;
        
      case 'Garage':
        result = result
          .replace(/pièces/g, 'espace')
          .replace(/chambre\(s\)/g, 'espace de stockage')
          .replace(/salle\(s\) de bain/g, '')
          .replace(/cuisine/g, '')
          .replace(/séjour/g, 'zone principale')
          .replace(/jardin/g, 'accès extérieur')
          .replace(/balcon/g, '');
        
        // Ajouter des caractéristiques spécifiques aux garages
        if (!result.includes('garage')) {
          result += property.livingArea ? 
            ` Ce garage de ${property.livingArea}m² offre un espace sécurisé pour votre véhicule.` : 
            ' Ce garage offre un espace sécurisé pour votre véhicule.';
        }
        
        if (property.hasElevator && !result.includes('rampe')) {
          result += ' Équipé d\'une rampe d\'accès.';
        }
        break;
        
      case 'Bureau':
        result = result
          .replace(/pièces/g, 'espaces de travail')
          .replace(/chambre\(s\)/g, 'bureau(x)')
          .replace(/salle\(s\) de bain/g, 'salle(s) d\'eau')
          .replace(/cuisine/g, 'kitchenette')
          .replace(/séjour/g, 'espace de réception')
          .replace(/jardin/g, 'espace extérieur')
          .replace(/DPE/g, 'Diagnostic de Performance Énergétique professionnel');
        
        // Ajouter des caractéristiques spécifiques aux bureaux
        if (!result.includes('professionnel')) {
          result += property.livingArea ? 
            ` Cet espace professionnel de ${property.livingArea}m² est idéal pour votre activité.` : 
            ' Cet espace professionnel est idéal pour votre activité.';
        }
        
        if (property.hasElevator && !result.includes('accessibilité')) {
          result += ' Excellent niveau d\'accessibilité avec ascenseur.';
        }
        break;
        
      case 'Parking':
        result = result
          .replace(/pièces/g, 'emplacement')
          .replace(/chambre\(s\)/g, '')
          .replace(/salle\(s\) de bain/g, '')
          .replace(/cuisine/g, '')
          .replace(/séjour/g, '')
          .replace(/jardin/g, '');
        
        // Ajouter des caractéristiques spécifiques aux parkings
        if (!result.includes('stationnement')) {
          result += property.livingArea ? 
            ` Cet emplacement de stationnement de ${property.livingArea}m² vous permet de garer votre véhicule en toute sécurité.` : 
            ' Cet emplacement de stationnement vous permet de garer votre véhicule en toute sécurité.';
        }
        
        if (property.hasElevator && !result.includes('accès')) {
          result += ' Accès sécurisé par badge.';
        }
        break;
        
      case 'Immeuble':
        result = result
          .replace(/pièces/g, 'lots')
          .replace(/chambre\(s\)/g, 'logement(s)')
          .replace(/salle\(s\) de bain/g, 'unité(s) sanitaire(s)')
          .replace(/cuisine/g, 'espace commun')
          .replace(/séjour/g, 'hall')
          .replace(/jardin/g, 'espace extérieur commun');
        
        // Ajouter des caractéristiques spécifiques aux immeubles
        if (!result.includes('immeuble') && !result.includes('rendement')) {
          result += property.livingArea ? 
            ` Cet immeuble de rapport de ${property.livingArea}m² offre un excellent potentiel de rendement locatif.` : 
            ' Cet immeuble de rapport offre un excellent potentiel de rendement locatif.';
        }
        
        if (property.hasElevator && !result.includes('parties communes')) {
          result += ' Parties communes bien entretenues avec ascenseur.';
        }
        break;
        
      case 'Terrain':
        result = result
          .replace(/pièces/g, 'parcelles')
          .replace(/chambre\(s\)/g, 'zone(s) constructible(s)')
          .replace(/salle\(s\) de bain/g, '')
          .replace(/cuisine/g, '')
          .replace(/séjour/g, 'espace principal')
          .replace(/jardin/g, 'terrain arboré')
          .replace(/balcon/g, '')
          .replace(/DPE/g, 'Étude de sol');
        
        // Ajouter des caractéristiques spécifiques aux terrains
        if (!result.includes('constructible')) {
          result += property.livingArea ? 
            ` Ce terrain de ${property.livingArea}m² est idéal pour votre projet de construction.` : 
            ' Ce terrain est idéal pour votre projet de construction.';
        }
        break;
        
      case 'Local commercial':
        result = result
          .replace(/pièces/g, 'espaces commerciaux')
          .replace(/chambre\(s\)/g, 'bureau(x)')
          .replace(/salle\(s\) de bain/g, 'sanitaire(s)')
          .replace(/cuisine/g, 'arrière-cuisine')
          .replace(/séjour/g, 'espace de vente')
          .replace(/balcon/g, 'terrasse commerciale')
          .replace(/jardin/g, 'espace extérieur commercial');
        
        // Ajouter des caractéristiques spécifiques aux locaux commerciaux
        if (!result.includes('commerce') && !result.includes('vitrine')) {
          result += property.livingArea ? 
            ` Ce local commercial de ${property.livingArea}m² bénéficie d'une excellente visibilité et d'une vitrine attractive.` : 
            ' Ce local commercial bénéficie d\'une excellente visibilité et d\'une vitrine attractive.';
        }
        
        if (property.hasParking && !result.includes('stationnement clientèle')) {
          result += ' Stationnement clientèle à proximité immédiate.';
        }
        break;
        
      case 'Loft':
        result = result
          .replace(/pièces/g, 'espaces ouverts')
          .replace(/chambre\(s\)/g, 'espace(s) nuit')
          .replace(/cuisine/g, 'cuisine ouverte')
          .replace(/séjour/g, 'espace de vie décloisonné')
          .replace(/jardin/g, 'espace extérieur');
        
        // Ajouter des caractéristiques spécifiques aux lofts
        if (!result.includes('volume') && !result.includes('hauteur sous plafond')) {
          result += property.livingArea ? 
            ` Ce loft de ${property.livingArea}m² offre de beaux volumes avec une hauteur sous plafond généreuse.` : 
            ' Ce loft offre de beaux volumes avec une hauteur sous plafond généreuse.';
        }
        break;
        
      default:
        // Pour tout autre type de bien non spécifiquement géré
        if (!result.includes(property.type.toLowerCase())) {
          result += ` Ce ${property.type.toLowerCase()} présente des caractéristiques adaptées à son usage spécifique.`;
        }
    }
    
    return result;
  };

  const portals = [
    { id: "leboncoin", name: "Leboncoin" },
    { id: "seloger", name: "SeLoger" },
    { id: "bienici", name: "Bien'ici" },
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Générateur d'Annonces Immobilières</h1>
          <p className="text-muted-foreground">
            Créez des annonces professionnelles pour les plateformes immobilières
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Panneau de configuration */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Configuration de l'annonce</CardTitle>
              </CardHeader>
              <CardContent>
                <ListingGeneratorForm 
                  properties={properties}
                  isLoading={isLoading}
                  selectedProperty={selectedProperty}
                  onPropertySelect={handlePropertySelect}
                  listingType={listingType}
                  onListingTypeChange={setListingType}
                  selectedPortal={selectedPortal}
                  onPortalChange={setSelectedPortal}
                  targetAudience={targetAudience}
                  onTargetAudienceChange={setTargetAudience}
                  onGenerate={generateListing}
                  isGenerating={isGenerating}
                />
              </CardContent>
            </Card>
          </div>

          {/* Prévisualisation de l'annonce */}
          <div className="md:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Prévisualisation</CardTitle>
                <CardDescription>Aperçu de l'annonce générée</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ListingPreview 
                  listing={generatedListing}
                  isLoading={isGenerating}
                  onCopy={(text: string) => {
                    navigator.clipboard.writeText(text);
                    toast({
                      title: "Copié",
                      description: "Le contenu a été copié dans le presse-papier",
                    });
                  }}
                  onDownload={() => {
                    if (!generatedListing) return;
                    
                    const filename = `annonce-${generatedListing.property.id}-${new Date().toISOString().split('T')[0]}.txt`;
                    const content = `
TITRE: ${generatedListing.title}

DESCRIPTION COURTE:
${generatedListing.shortDescription}

DESCRIPTION LONGUE:
${generatedListing.longDescription}

DESCRIPTION SEO:
${generatedListing.seoDescription}

PORTAIL: ${generatedListing.portal}
TYPE: ${generatedListing.type === 'sale' ? 'Vente' : 'Location'}
AUDIENCE CIBLE: ${generatedListing.targetAudience}
                    `;
                    
                    const element = document.createElement('a');
                    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
                    element.setAttribute('download', filename);
                    element.style.display = 'none';
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);
                    
                    toast({
                      title: "Téléchargement",
                      description: `L'annonce a été téléchargée sous le nom "${filename}"`,
                    });
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 