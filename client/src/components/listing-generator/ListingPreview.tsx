import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Copy, Download, Share2, Facebook, Twitter, Linkedin, Mail, 
  CheckCircle2, ClipboardCopy, ImageIcon, FileText, Home, PenSquare,
  Users, Building, Briefcase, GraduationCap, Building2, User, MessageCircle,
  Globe, Calendar, UsersRound, HeartPulse, Lightbulb, Leaf, ExternalLink,
  Sparkles, CheckCheck, ArrowUpRight, Code
} from "lucide-react";
import { GeneratedListing } from "@/pages/listing-generator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Property } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";

interface ListingPreviewProps {
  listing: GeneratedListing | null;
  isLoading: boolean;
  onCopy: (text: string) => void;
  onDownload: () => void;
}

export function ListingPreview({
  listing,
  isLoading,
  onCopy,
  onDownload,
}: ListingPreviewProps) {
  const [activeTab, setActiveTab] = useState("preview");
  const [copied, setCopied] = useState<string | null>(null);

  // Animation temporaire quand le contenu est copié
  const handleCopy = (text: string, type: string) => {
    onCopy(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!listing) {
    return (
      <Card className="h-full flex flex-col justify-center items-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-0 dark:border dark:border-slate-700 shadow-md">
        <CardContent className="p-8 text-center flex flex-col items-center justify-center h-full">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 shadow-inner">
            <Building className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
            Prévisualisation de l'annonce
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sélectionnez une propriété et générez une annonce pour voir l'aperçu ici
          </p>
        </CardContent>
      </Card>
    );
  }

  const getAudienceIcon = () => {
    switch (listing.targetAudience) {
      case "general":
        return <Users size={14} />;
      case "luxury":
        return <Building size={14} />;
      case "investor":
        return <Briefcase size={14} />;
      case "firsttime":
        return <Home size={14} />;
      case "family":
        return <Users size={14} />;
      case "student":
        return <GraduationCap size={14} />;
      case "senior":
        return <User size={14} />;
      case "expat":
        return <Globe size={14} />;
      case "professional":
        return <Briefcase size={14} />;
      case "airbnb":
        return <Calendar size={14} />;
      case "coliving":
        return <UsersRound size={14} />;
      case "retirement":
        return <HeartPulse size={14} />;
      case "entrepreneur":
        return <Lightbulb size={14} />;
      case "international":
        return <Globe size={14} />;
      case "ecofriendly":
        return <Leaf size={14} />;
      default:
        return <Users size={14} />;
    }
  };

  const getAudienceName = () => {
    switch (listing.targetAudience) {
      case "general":
        return "Grand public";
      case "luxury":
        return "Haut de gamme";
      case "investor":
        return "Investisseurs";
      case "firsttime":
        return "Premiers acheteurs";
      case "family":
        return "Familles";
      case "student":
        return "Étudiants";
      case "senior":
        return "Seniors";
      case "expat":
        return "Expatriés";
      case "professional":
        return "Professionnels";
      case "airbnb":
        return "Locataires courts séjours";
      case "coliving":
        return "Colocation";
      case "retirement":
        return "Retraités";
      case "entrepreneur":
        return "Entrepreneurs";
      case "international":
        return "Clientèle internationale";
      case "ecofriendly":
        return "Écologistes";
      default:
        return "Grand public";
    }
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden border-0 dark:border dark:border-slate-700 shadow-lg">
      <CardContent className="p-0 flex-grow flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-700 dark:to-blue-800 p-4 text-white">
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-1">
              <Sparkles className="h-4 w-4 text-indigo-200" />
              <h3 className="text-base font-medium">
                Annonce générée
              </h3>
            </div>
            <Badge variant="outline" className="flex items-center gap-1 text-xs bg-white/10 border-white/20 text-white hover:bg-white/20">
              {getAudienceIcon()}
              <span>{getAudienceName()}</span>
            </Badge>
          </div>
          <h2 className="text-lg font-semibold line-clamp-1">{listing.title}</h2>
        </div>

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col">
          <TabsList className="px-4 pt-2 bg-white dark:bg-slate-800 border-b dark:border-slate-700 h-auto justify-start gap-1">
            <TabsTrigger value="preview" className="text-xs rounded-md data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 dark:data-[state=active]:bg-indigo-900/40 dark:data-[state=active]:text-indigo-300">
              <FileText className="h-3.5 w-3.5 mr-1" />
              Aperçu
            </TabsTrigger>
            <TabsTrigger value="raw" className="text-xs rounded-md data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 dark:data-[state=active]:bg-indigo-900/40 dark:data-[state=active]:text-indigo-300">
              <Code className="h-3.5 w-3.5 mr-1" />
              Code
            </TabsTrigger>
            <TabsTrigger value="seo" className="text-xs rounded-md data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 dark:data-[state=active]:bg-indigo-900/40 dark:data-[state=active]:text-indigo-300">
              <Globe className="h-3.5 w-3.5 mr-1" />
              SEO
            </TabsTrigger>
          </TabsList>

          <div className="flex-grow overflow-auto dark:bg-slate-900">
            {isLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4 dark:bg-slate-700" />
                <Skeleton className="h-4 w-full dark:bg-slate-700" />
                <Skeleton className="h-4 w-full dark:bg-slate-700" />
                <Skeleton className="h-4 w-2/3 dark:bg-slate-700" />
                <div className="py-2" />
                <Skeleton className="h-4 w-full dark:bg-slate-700" />
                <Skeleton className="h-4 w-full dark:bg-slate-700" />
                <Skeleton className="h-4 w-4/5 dark:bg-slate-700" />
                <div className="py-2" />
                <Skeleton className="h-4 w-full dark:bg-slate-700" />
                <Skeleton className="h-4 w-3/4 dark:bg-slate-700" />
              </div>
            ) : (
              <>
                <TabsContent value="preview" className="p-4 h-full">
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-inner text-sm space-y-4 leading-relaxed">
                    <div className="space-y-2 mb-4">
                      <Badge variant="secondary" className="text-xs">
                        {listing.type === 'sale' ? 'Vente' : 'Location'}
                      </Badge>
                      <p className="text-muted-foreground text-xs italic dark:text-slate-400">
                        {listing.shortDescription}
                      </p>
                      <Separator className="dark:bg-slate-700" />
                    </div>
                    
                    <div className="whitespace-pre-wrap text-sm space-y-4 leading-relaxed">
                      {listing.longDescription.split('\n\n').map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="raw" className="h-full">
                  <div className="h-full p-4">
                    <pre className="whitespace-pre-wrap font-mono text-xs bg-slate-50 dark:bg-slate-800 p-4 rounded-lg overflow-auto h-full border border-slate-100 dark:border-slate-700">
                      {listing.longDescription}
                    </pre>
                  </div>
                </TabsContent>
                
                <TabsContent value="seo" className="h-full">
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground dark:text-slate-400">Titre SEO (optimisé 2025-2026)</Label>
                        <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                          Optimisé pour {listing.portal}
                        </Badge>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg">
                        <p className="text-sm font-medium">{listing.title}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground dark:text-slate-400">Description SEO</Label>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg">
                        <p className="text-xs">{listing.seoDescription}</p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <div className={`h-2 flex-1 rounded-full ${listing.seoDescription.length <= 130 ? 'bg-amber-300 dark:bg-amber-600' : listing.seoDescription.length <= 155 ? 'bg-green-300 dark:bg-green-600' : 'bg-red-300 dark:bg-red-600'}`}></div>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {listing.seoDescription.length}/160
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground dark:text-slate-400">Mots-clés primaires</Label>
                        <div className="flex flex-wrap gap-1">
                          {[
                            listing.property.type.toLowerCase(), 
                            `${listing.type === 'sale' ? 'achat' : 'location'}`,
                            `${listing.property.rooms} pièces`, 
                            `${listing.property.address.split(',')[0].toLowerCase()}`, 
                            ...(listing.property.hasGarden ? ['jardin'] : []),
                            ...(listing.property.hasParking ? ['parking'] : [])
                          ].map((keyword, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground dark:text-slate-400">Mots-clés secondaires</Label>
                        <div className="flex flex-wrap gap-1">
                          {[
                            `${listing.property.livingArea}m²`,
                            `dpe ${listing.property.energyClass}`,
                            ...(listing.targetAudience === 'investor' ? ['investissement', 'rendement'] : []),
                            ...(listing.targetAudience === 'luxury' ? ['prestige', 'haut de gamme'] : []),
                            ...(listing.targetAudience === 'family' ? ['familial', 'sécurisé'] : []),
                            ...(listing.targetAudience === 'student' ? ['étudiant', 'pratique'] : [])
                          ].map((keyword, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-2 space-y-2">
                      <Label className="text-xs text-muted-foreground dark:text-slate-400">Impact SEO prévisionnel</Label>
                      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <div className="p-3 flex justify-between items-center bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-xs font-medium">Classement potentiel</span>
                          <Badge className="bg-indigo-500 dark:bg-indigo-600 hover:bg-indigo-500">Top 10-20</Badge>
                        </div>
                        <div className="p-3 flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs">Optimisation mobile</span>
                            <div className="flex items-center gap-1">
                              <div className="h-2 w-32 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 dark:bg-green-600" style={{ width: '90%' }}></div>
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground">90%</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs">Pertinence des mots-clés</span>
                            <div className="flex items-center gap-1">
                              <div className="h-2 w-32 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 dark:bg-green-600" style={{ width: '85%' }}></div>
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground">85%</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs">Engagement prévu</span>
                            <div className="flex items-center gap-1">
                              <div className="h-2 w-32 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 dark:bg-indigo-600" style={{ width: '75%' }}></div>
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground">75%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </CardContent>
      
      <CardFooter className="p-3 flex justify-between items-center border-t dark:border-slate-700 gap-2 bg-slate-50 dark:bg-slate-800">
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs flex items-center gap-1 dark:border-slate-700">
            <Building className="h-3 w-3" />
            {listing.property.name}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-300"
                  onClick={() => handleCopy(listing.longDescription, 'raw')}
                  disabled={isLoading}
                >
                  {copied === 'raw' ? (
                    <CheckCheck className="h-4 w-4 text-green-500 dark:text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="dark:bg-slate-800 dark:border-slate-700">
                <p className="text-xs">Copier le texte</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-300"
                  onClick={onDownload}
                  disabled={isLoading}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="dark:bg-slate-800 dark:border-slate-700">
                <p className="text-xs">Télécharger</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button
            variant="outline"
            size="sm"
            className="rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-700 dark:to-blue-800 text-white border-0 h-8 px-3 hover:opacity-90"
          >
            <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Publier</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 