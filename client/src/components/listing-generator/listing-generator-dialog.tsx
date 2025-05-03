import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Property } from '@/types/property';
import { GeneratedListing } from '@/types/listing';
import { Portal } from '@/types/portal';
import { TargetAudience } from '@/types/target-audience';
import { ListingType } from '@/types/listing-type';

interface ListingGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  onGenerate: (listing: GeneratedListing) => void;
}

export function ListingGeneratorDialog({
  isOpen,
  onClose,
  property,
  onGenerate,
}: ListingGeneratorDialogProps) {
  const [selectedPortal, setSelectedPortal] = useState<Portal | null>(null);
  const [targetAudience, setTargetAudience] = useState<TargetAudience | null>(null);
  const [listingType, setListingType] = useState<ListingType | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [generatedListing, setGeneratedListing] = useState<GeneratedListing | null>(null);

  const generateDescription = (property: Property) => {
    const description = `
      ${property.title}
      
      Situé à ${property.location.address}, ce bien immobilier de ${property.livingArea}m² 
      offre ${property.rooms} pièces dont ${property.bedrooms} chambres et ${property.bathrooms} salles de bain.
      
      Caractéristiques principales :
      - Surface habitable : ${property.livingArea}m²
      - Surface terrain : ${property.landArea}m²
      - Nombre de pièces : ${property.rooms}
      - Nombre de chambres : ${property.bedrooms}
      - Nombre de salles de bain : ${property.bathrooms}
      - Classe énergétique : ${property.energyClass}
      
      ${property.description}
    `;
    return description.trim();
  };

  const handleGenerate = () => {
    if (!selectedPortal || !targetAudience || !listingType || !selectedProperty) {
      return;
    }

    const listing: GeneratedListing = {
      id: crypto.randomUUID(),
      title: selectedProperty.title,
      shortDescription: selectedProperty.description.substring(0, 200),
      longDescription: generateDescription(selectedProperty),
      seoDescription: `${selectedProperty.title} - ${selectedProperty.location.address}`,
      property: selectedProperty,
      portal: selectedPortal,
      targetAudience,
      type: listingType,
      createdAt: new Date(),
    };

    setGeneratedListing(listing);
    onGenerate(listing);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Générer une annonce</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Contenu du dialogue */}
        </div>
      </DialogContent>
    </Dialog>
  );
} 