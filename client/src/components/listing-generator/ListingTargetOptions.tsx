import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { MessageSquare, Users, Briefcase, GraduationCap, Target, Settings2 } from "lucide-react";
import { useState } from "react";

interface ListingTargetOptionsProps {
  targetAudience: string;
  onTargetAudienceChange: (audience: string) => void;
  selectedPortal: string;
  onPortalChange: (portal: string) => void;
}

export function ListingTargetOptions({
  targetAudience,
  onTargetAudienceChange,
  selectedPortal,
  onPortalChange
}: ListingTargetOptionsProps) {
  const [tone, setTone] = useState<string>("professional");
  const [detailLevel, setDetailLevel] = useState<number>(50);
  const [includeFeatures, setIncludeFeatures] = useState({
    virtualTour: false,
    energyPerformance: true,
    neighborhood: true,
    transportation: true,
    schools: false,
    shops: false
  });

  const audienceDescriptions = {
    general: "Style équilibré et neutre pour attirer un large public.",
    investor: "Accent sur la rentabilité, le rendement et le potentiel d'investissement.",
    family: "Mise en avant de l'espace, la sécurité, les écoles et les commodités familiales.",
    student: "Focus sur la proximité avec les établissements, transports et vie étudiante."
  };

  const toneDescriptions = {
    professional: "Ton formel et professionnel, adapté aux annonces premium.",
    friendly: "Style conversationnel et accueillant pour une communication chaleureuse.",
    enthusiastic: "Ton dynamique et enthousiaste pour susciter l'excitation.",
    factual: "Présentation objective et concise axée sur les faits essentiels."
  };

  const portals = [
    { id: "leboncoin", name: "Leboncoin", logo: "/images/portals/leboncoin.png" },
    { id: "seloger", name: "SeLoger", logo: "/images/portals/seloger.png" },
    { id: "bienici", name: "Bien'ici", logo: "/images/portals/bienici.png" },
    { id: "immo24", name: "Immo24", logo: "/images/portals/immo24.png" },
    { id: "pap", name: "PAP", logo: "/images/portals/pap.png" },
    { id: "logic-immo", name: "Logic-Immo", logo: "/images/portals/logic-immo.png" },
  ];

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Audience cible</CardTitle>
          <CardDescription>
            Personnalisez le ton et le contenu pour votre public cible
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={targetAudience} 
            onValueChange={onTargetAudienceChange}
            className="grid gap-4 grid-cols-1 md:grid-cols-2"
          >
            <Label
              htmlFor="general"
              className={`
                flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer
                ${targetAudience === 'general' ? 'border-primary' : 'border-muted'}
              `}
            >
              <RadioGroupItem 
                value="general" 
                id="general" 
                className="sr-only" 
              />
              <div className="flex flex-col items-center space-y-1">
                <Users className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Général</span>
              </div>
              <span className="text-xs text-muted-foreground text-center mt-2">
                {audienceDescriptions.general}
              </span>
            </Label>

            <Label
              htmlFor="investor"
              className={`
                flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer
                ${targetAudience === 'investor' ? 'border-primary' : 'border-muted'}
              `}
            >
              <RadioGroupItem 
                value="investor" 
                id="investor" 
                className="sr-only" 
              />
              <div className="flex flex-col items-center space-y-1">
                <Briefcase className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Investisseur</span>
              </div>
              <span className="text-xs text-muted-foreground text-center mt-2">
                {audienceDescriptions.investor}
              </span>
            </Label>

            <Label
              htmlFor="family"
              className={`
                flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer
                ${targetAudience === 'family' ? 'border-primary' : 'border-muted'}
              `}
            >
              <RadioGroupItem 
                value="family" 
                id="family" 
                className="sr-only" 
              />
              <div className="flex flex-col items-center space-y-1">
                <Users className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Famille</span>
              </div>
              <span className="text-xs text-muted-foreground text-center mt-2">
                {audienceDescriptions.family}
              </span>
            </Label>

            <Label
              htmlFor="student"
              className={`
                flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer
                ${targetAudience === 'student' ? 'border-primary' : 'border-muted'}
              `}
            >
              <RadioGroupItem 
                value="student" 
                id="student" 
                className="sr-only" 
              />
              <div className="flex flex-col items-center space-y-1">
                <GraduationCap className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Étudiant</span>
              </div>
              <span className="text-xs text-muted-foreground text-center mt-2">
                {audienceDescriptions.student}
              </span>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ton et style</CardTitle>
          <CardDescription>
            Ajustez le ton et le niveau de détail de votre annonce
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="tone">Ton de communication</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger id="tone" className="w-[180px]">
                  <SelectValue placeholder="Sélectionner un ton" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professionnel</SelectItem>
                  <SelectItem value="friendly">Amical</SelectItem>
                  <SelectItem value="enthusiastic">Enthousiaste</SelectItem>
                  <SelectItem value="factual">Factuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {toneDescriptions[tone as keyof typeof toneDescriptions]}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <Label>Niveau de détail</Label>
                <span className="text-xs text-muted-foreground">{detailLevel}%</span>
              </div>
              <Slider
                value={[detailLevel]}
                min={0}
                max={100}
                step={10}
                onValueChange={(values) => setDetailLevel(values[0])}
                className="mt-2"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {detailLevel < 30 
                ? "Description concise avec l'essentiel uniquement" 
                : detailLevel < 70
                ? "Équilibre entre concision et détails importants" 
                : "Description détaillée et exhaustive"}
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Éléments à inclure</Label>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="virtual-tour" className="text-sm cursor-pointer">Visite virtuelle</Label>
                <Switch 
                  id="virtual-tour" 
                  checked={includeFeatures.virtualTour}
                  onCheckedChange={(checked) => setIncludeFeatures(prev => ({ ...prev, virtualTour: checked }))}
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="energy" className="text-sm cursor-pointer">Performance énergétique</Label>
                <Switch 
                  id="energy" 
                  checked={includeFeatures.energyPerformance}
                  onCheckedChange={(checked) => setIncludeFeatures(prev => ({ ...prev, energyPerformance: checked }))}
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="neighborhood" className="text-sm cursor-pointer">Quartier</Label>
                <Switch 
                  id="neighborhood" 
                  checked={includeFeatures.neighborhood}
                  onCheckedChange={(checked) => setIncludeFeatures(prev => ({ ...prev, neighborhood: checked }))}
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="transportation" className="text-sm cursor-pointer">Transports</Label>
                <Switch 
                  id="transportation" 
                  checked={includeFeatures.transportation}
                  onCheckedChange={(checked) => setIncludeFeatures(prev => ({ ...prev, transportation: checked }))}
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="schools" className="text-sm cursor-pointer">Écoles</Label>
                <Switch 
                  id="schools" 
                  checked={includeFeatures.schools}
                  onCheckedChange={(checked) => setIncludeFeatures(prev => ({ ...prev, schools: checked }))}
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="shops" className="text-sm cursor-pointer">Commerces</Label>
                <Switch 
                  id="shops" 
                  checked={includeFeatures.shops}
                  onCheckedChange={(checked) => setIncludeFeatures(prev => ({ ...prev, shops: checked }))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Portail cible</CardTitle>
          <CardDescription>
            Sélectionnez le portail pour lequel l'annonce sera optimisée
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={selectedPortal} 
            onValueChange={onPortalChange}
            className="grid gap-4 grid-cols-2 sm:grid-cols-3"
          >
            {portals.map(portal => (
              <Label
                key={portal.id}
                htmlFor={portal.id}
                className={`
                  flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer
                  ${selectedPortal === portal.id ? 'border-primary' : 'border-muted'}
                `}
              >
                <RadioGroupItem 
                  value={portal.id} 
                  id={portal.id} 
                  className="sr-only" 
                />
                <div className="flex flex-col items-center space-y-1">
                  <div className="w-8 h-8 flex items-center justify-center mb-2">
                    <img 
                      src={portal.logo} 
                      alt={portal.name} 
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        // Image non trouvée, afficher l'icône de fallback
                        const icon = document.getElementById(`icon-fallback-${portal.id}`);
                        if (icon) icon.style.display = 'block';
                      }}
                    />
                    <Settings2 
                      id={`icon-fallback-${portal.id}`} 
                      className="h-6 w-6 hidden" 
                    />
                  </div>
                  <span className="text-sm font-medium text-center">{portal.name}</span>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
} 