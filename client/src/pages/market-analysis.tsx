import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2, Euro } from "lucide-react";
import { Slider } from "@/components/ui/slider";

const sources = [
  { id: "leboncoin", name: "Leboncoin" },
  { id: "seloger", name: "SeLoger" },
  { id: "bienici", name: "Bien'ici" },
];

const propertyTypes = [
  { id: "apartment", name: "Appartement" },
  { id: "house", name: "Maison" },
  { id: "commercial", name: "Local commercial" },
];

export default function MarketAnalysis() {
  const [location, setLocation] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [areaRange, setAreaRange] = useState<[number, number]>([0, 200]);
  const { toast } = useToast();

  const { data: listings, refetch } = useQuery({
    queryKey: ["/api/scraped-listings", selectedSource, location, selectedType, priceRange, areaRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSource) params.append("source", selectedSource);
      if (location) params.append("location", location);
      if (selectedType) params.append("propertyType", selectedType);
      if (postalCode) params.append("postalCode", postalCode);
      params.append("minPrice", priceRange[0].toString());
      params.append("maxPrice", priceRange[1].toString());
      params.append("minArea", areaRange[0].toString());
      params.append("maxArea", areaRange[1].toString());

      const response = await fetch(`/api/scraped-listings?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch listings");
      return response.json();
    },
  });

  const scrapeMutation = useMutation({
    mutationFn: async () => {
      if (!location) throw new Error("Location is required");

      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          location,
          postalCode,
          propertyType: selectedType,
          priceRange,
          areaRange,
          sources: selectedSource ? [selectedSource] : ['leboncoin', 'seloger', 'bienici']
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Succès",
        description: `${data.count} annonces récupérées depuis ${data.sources.join(', ')}`,
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Analyse du marché</h2>
        <p className="text-muted-foreground">
          Explorez les annonces immobilières et analysez les tendances du marché
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rechercher des annonces</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Ville (ex: Paris)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <Input
                placeholder="Code postal (ex: 75001)"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select 
                value={selectedSource || "all"} 
                onValueChange={(value) => setSelectedSource(value === "all" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les sources</SelectItem>
                  {sources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedType || "all"}
                onValueChange={(value) => setSelectedType(value === "all" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type de bien" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {propertyTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prix (€)</label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                  className="w-24"
                />
                <Slider
                  value={priceRange}
                  onValueChange={(value) => setPriceRange(value as [number, number])}
                  min={0}
                  max={1000000}
                  step={10000}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  className="w-24"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Surface (m²)</label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  value={areaRange[0]}
                  onChange={(e) => setAreaRange([parseInt(e.target.value), areaRange[1]])}
                  className="w-24"
                />
                <Slider
                  value={areaRange}
                  onValueChange={(value) => setAreaRange(value as [number, number])}
                  min={0}
                  max={200}
                  step={5}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={areaRange[1]}
                  onChange={(e) => setAreaRange([areaRange[0], parseInt(e.target.value)])}
                  className="w-24"
                />
              </div>
            </div>

            <Button
              onClick={() => scrapeMutation.mutate()}
              disabled={!location || scrapeMutation.isPending}
              className="w-full"
            >
              Lancer la recherche
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {listings?.map((listing: any) => (
          <Card key={listing.id}>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">{listing.title}</h3>
                  <span className="text-lg font-bold">
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    }).format(listing.price)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {listing.description}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {listing.propertyType || "Non spécifié"}
                  </div>
                  {listing.area && (
                    <div className="flex items-center gap-1">
                      <span>{listing.area}m²</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>{listing.location}</span>
                  <span className="text-muted-foreground">
                    {new Date(listing.scrapedAt).toLocaleDateString()}
                  </span>
                </div>
                <a
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Voir l'annonce
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}