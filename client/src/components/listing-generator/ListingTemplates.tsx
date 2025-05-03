import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Home, ArrowRight, FileText, Briefcase, Users, GraduationCap, Check } from "lucide-react";
import { useState } from "react";

interface ListingTemplate {
  id: string;
  name: string;
  description: string;
  icon: JSX.Element;
  portal: string;
  type: 'sale' | 'rental';
  audience: string;
}

interface ListingTemplatesProps {
  onSelectTemplate: (template: ListingTemplate) => void;
}

export function ListingTemplates({ onSelectTemplate }: ListingTemplatesProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const templates: ListingTemplate[] = [
    {
      id: "investment-property",
      name: "Immobilier d'investissement",
      description: "Mettez en valeur le potentiel de rendement et la rentabilité pour les investisseurs.",
      icon: <Briefcase className="h-6 w-6" />,
      portal: "seloger",
      type: "sale",
      audience: "investor"
    },
    {
      id: "family-home",
      name: "Résidence familiale",
      description: "Idéal pour mettre en avant les atouts d'un bien destiné aux familles.",
      icon: <Users className="h-6 w-6" />,
      portal: "bienici",
      type: "sale",
      audience: "family"
    },
    {
      id: "student-rental",
      name: "Location étudiante",
      description: "Format optimisé pour les logements à louer aux étudiants.",
      icon: <GraduationCap className="h-6 w-6" />,
      portal: "leboncoin",
      type: "rental",
      audience: "student"
    },
    {
      id: "luxury-property",
      name: "Bien d'exception",
      description: "Mettez en valeur les caractéristiques prestigieuses de propriétés haut de gamme.",
      icon: <Home className="h-6 w-6" />,
      portal: "seloger",
      type: "sale",
      audience: "general"
    },
    {
      id: "urban-apartment",
      name: "Appartement urbain",
      description: "Modèle adapté pour les appartements en centre-ville destinés aux jeunes actifs.",
      icon: <Building className="h-6 w-6" />,
      portal: "leboncoin",
      type: "rental",
      audience: "general"
    },
    {
      id: "quick-sale",
      name: "Vente rapide",
      description: "Format concis pour générer de l'intérêt rapidement avec l'essentiel.",
      icon: <FileText className="h-6 w-6" />,
      portal: "pap",
      type: "sale",
      audience: "general"
    }
  ];

  const handleSelectTemplate = (template: ListingTemplate) => {
    setSelectedTemplateId(template.id);
    onSelectTemplate(template);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-2">Modèles d'annonces</h3>
        <p className="text-sm text-muted-foreground">
          Sélectionnez un modèle prédéfini pour commencer rapidement votre annonce
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card 
            key={template.id}
            className={`relative cursor-pointer transition-all ${
              selectedTemplateId === template.id 
                ? 'border-primary ring-1 ring-primary' 
                : 'hover:border-primary/50'
            }`}
            onClick={() => handleSelectTemplate(template)}
          >
            {selectedTemplateId === template.id && (
              <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1">
                <Check className="h-4 w-4" />
              </div>
            )}
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-muted rounded-md">
                  {template.icon}
                </div>
                <div className="flex flex-col items-end">
                  <Badge type={template.type} />
                  <PortalBadge portal={template.portal} />
                </div>
              </div>
              <CardTitle className="text-base mt-2">{template.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <CardDescription className="text-xs">
                {template.description}
              </CardDescription>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2 w-full justify-between text-xs"
              >
                <span>Utiliser ce modèle</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Badge({ type }: { type: 'sale' | 'rental' }) {
  return (
    <div className={`
      text-xs px-2 py-0.5 rounded-full
      ${type === 'sale' 
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
        : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'}
    `}>
      {type === 'sale' ? 'Vente' : 'Location'}
    </div>
  );
}

function PortalBadge({ portal }: { portal: string }) {
  const portalLabels: Record<string, string> = {
    "leboncoin": "Leboncoin",
    "seloger": "SeLoger",
    "bienici": "Bien'ici",
    "immo24": "Immo24",
    "pap": "PAP",
    "logic-immo": "Logic-Immo",
  };

  const label = portalLabels[portal] || portal;

  return (
    <div className="text-xs text-muted-foreground mt-1">
      {label}
    </div>
  );
} 