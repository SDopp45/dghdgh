import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, FileText, User, Clock, FormInput, Mail } from "lucide-react";
import { format, parseISO, formatDistanceToNow, isToday, isAfter, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FormSubmission = {
  id: number;
  linkId: number;
  formData: Record<string, any>;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
};

type Link = {
  id: string | number;
  title: string;
  type: 'link' | 'form';
  formDefinition?: Array<{
    id: string;
    label: string;
    type: string;
  }>;
};

type SubmissionsByLink = {
  link: Link;
  submissions: FormSubmission[];
};

type FilterMode = 'today' | 'week' | 'all';

export function FormResponsesWidget() {
  const [currentLinkIndex, setCurrentLinkIndex] = useState(0);
  const [currentResponseIndex, setCurrentResponseIndex] = useState(0);
  const [submissionsByLink, setSubmissionsByLink] = useState<SubmissionsByLink[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>('week');
  const [stats, setStats] = useState({
    total: 0,
    formLinks: 0,
    latestSubmission: null as Date | null
  });
  
  // Récupérer la liste des liens (formulaires)
  const { data: links, isLoading: isLoadingLinks } = useQuery({
    queryKey: ["/api/links/profile"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/links/profile");
        if (response && response.success && response.data) {
          return response.data.links || [];
        }
        return [];
      } catch (error) {
        console.error("Erreur lors de la récupération des liens:", error);
        return [];
      }
    }
  });

  // Filtrer uniquement les liens de type 'form'
  const formLinks = useMemo(() => {
    if (!links) return [];
    return links.filter((link: Link) => link.type === 'form');
  }, [links]);

  // Récupération des soumissions pour chaque lien de type formulaire
  useEffect(() => {
    const fetchAllSubmissions = async () => {
      if (!formLinks.length) return;
      
      try {
        const submissionsData: SubmissionsByLink[] = [];
        let totalSubmissions = 0;
        let latestSubmissionDate: Date | null = null;
        
        for (const link of formLinks) {
          try {
            console.log(`Tentative de récupération des réponses pour le formulaire ${link.id}...`);
            const response = await apiRequest(`/api/forms/${link.id}/responses`);
            
            console.log(`Réponse du serveur pour le formulaire ${link.id}:`, response);
            
            if (response && response.success && Array.isArray(response.data)) {
              // Convertir les données au format attendu par le composant
              const submissions = response.data.map((item: any) => {
                // Vérifier le format des données et journaliser pour déboguer
                console.log(`Traitement de la réponse ${item.id}:`, item);
                
                // Identifier si les données sont dans response_data ou form_data
                let formDataObj = item.response_data || item.form_data;
                
                // Si aucun des deux n'existe, chercher directement dans un des champs "data"
                if (!formDataObj && item.data) {
                  formDataObj = item.data;
                }
                
                // Essayer de parser si c'est une chaîne
                if (typeof formDataObj === 'string') {
                  try {
                    formDataObj = JSON.parse(formDataObj);
                    console.log('Données JSON parsées avec succès:', formDataObj);
                  } catch(e) {
                    console.error('Erreur lors du parsing des données:', e);
                    formDataObj = {};
                  }
                }
                
                // Si toujours aucune donnée structurée trouvée, utiliser l'objet item entier comme données
                if (!formDataObj || Object.keys(formDataObj).length === 0) {
                  // Filtrer les champs techniques
                  const excludeFields = ['id', 'link_id', 'form_id', 'created_at', 'updated_at', 'ip_address', 'user_agent'];
                  formDataObj = Object.entries(item)
                    .filter(([key]) => !excludeFields.includes(key))
                    .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
                }
                
                return {
                  id: item.id,
                  linkId: item.link_id || item.form_id || parseInt(link.id),
                  formData: formDataObj || {},
                  createdAt: item.created_at || new Date().toISOString(),
                  ipAddress: item.ip_address,
                  userAgent: item.user_agent
                };
              }).sort((a: FormSubmission, b: FormSubmission) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
              
              console.log(`Nombre de réponses traitées pour ${link.title}: ${submissions.length}`);
              totalSubmissions += submissions.length;
              
              // Vérifier s'il y a une soumission plus récente
              for (const submission of submissions) {
                const submissionDate = parseISO(submission.createdAt);
                if (!latestSubmissionDate || submissionDate > latestSubmissionDate) {
                  latestSubmissionDate = submissionDate;
                }
              }
              
              // Ajouter les données à notre tableau
              submissionsData.push({
                link,
                submissions
              });
            }
          } catch (error) {
            console.error(`Erreur lors de la récupération des soumissions pour le formulaire ${link.id}:`, error);
          }
        }
        
        setSubmissionsByLink(submissionsData);
        setStats({
          total: totalSubmissions,
          formLinks: formLinks.length,
          latestSubmission: latestSubmissionDate
        });
      } catch (error) {
        console.error('Erreur lors de la récupération des soumissions:', error);
      }
    };
    
    if (formLinks.length > 0) {
      fetchAllSubmissions();
      
      // Mettre en place un intervalle pour vérifier régulièrement les nouvelles réponses
      const intervalId = setInterval(fetchAllSubmissions, 60000); // Vérifier toutes les minutes
      
      return () => clearInterval(intervalId);
    }
  }, [formLinks]);

  // Navigation entre les formulaires
  const navigatePrev = () => {
    if (currentLinkIndex > 0) {
      setCurrentLinkIndex(prev => prev - 1);
      setCurrentResponseIndex(0);
    }
  };

  const navigateNext = () => {
    if (currentLinkIndex < submissionsByLink.length - 1) {
      setCurrentLinkIndex(prev => prev + 1);
      setCurrentResponseIndex(0);
    }
  };

  // Filtrer les soumissions en fonction du mode de filtre sélectionné
  const getFilteredSubmissions = (submissions: FormSubmission[]) => {
    if (!submissions || submissions.length === 0) return [];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneWeekAgo = addDays(today, -7);
    
    return submissions.filter(submission => {
      const submissionDate = parseISO(submission.createdAt);
      
      switch (filterMode) {
        case 'today':
          return isToday(submissionDate);
        case 'week':
          return isAfter(submissionDate, oneWeekAgo) || isToday(submissionDate);
        case 'all':
        default:
          return true;
      }
    });
  };

  // Obtenir les soumissions filtrées pour le formulaire actuel
  const getCurrentFilteredSubmissions = () => {
    if (!submissionsByLink.length || !submissionsByLink[currentLinkIndex]) {
      return [];
    }
    
    return getFilteredSubmissions(submissionsByLink[currentLinkIndex].submissions);
  };

  // Navigation entre les réponses d'un formulaire
  const scrollResponses = (direction: 'left' | 'right') => {
    const filteredSubmissions = getCurrentFilteredSubmissions();
    if (!filteredSubmissions.length) return;
    
    if (direction === 'left') {
      setCurrentResponseIndex(prev => (prev > 0 ? prev - 1 : filteredSubmissions.length - 1));
    } else {
      setCurrentResponseIndex(prev => (prev < filteredSubmissions.length - 1 ? prev + 1 : 0));
    }
  };

  // Changer le mode de filtre
  const changeFilterMode = (mode: FilterMode) => {
    setFilterMode(mode);
    setCurrentResponseIndex(0); // Réinitialiser l'index des réponses
  };

  // Formatage pour l'affichage des valeurs de formulaire
  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  };

  // Calculer la réponse actuelle à afficher
  const getCurrentSubmission = () => {
    const filteredSubmissions = getCurrentFilteredSubmissions();
    
    if (!filteredSubmissions.length || currentResponseIndex >= filteredSubmissions.length) {
      return null;
    }
    
    return filteredSubmissions[currentResponseIndex];
  };

  // Pour la sélection des formulaires
  const handleFormChange = (formId: string) => {
    const index = submissionsByLink.findIndex(item => item.link.id.toString() === formId);
    if (index >= 0) {
      setCurrentLinkIndex(index);
      setCurrentResponseIndex(0);
    }
  };

  const currentSubmission = getCurrentSubmission();
  const currentLink = submissionsByLink[currentLinkIndex]?.link;
  const filteredSubmissions = getCurrentFilteredSubmissions();

  return (
    <Card className="w-full h-[140px] bg-gradient-to-br from-background/90 to-background/50 backdrop-blur-sm border-t-2 border-t-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg overflow-hidden relative">
      <div className="absolute inset-0 w-[5px] h-full bg-gradient-to-b from-purple-500/70 to-purple-500/30" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2 pl-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-full bg-background/80 shadow-md backdrop-blur-sm border border-border/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 text-purple-500">
            <FormInput className="h-4 w-4" />
          </div>
          <CardTitle className="text-sm font-medium flex items-center gap-1">
            <span>Réponses aux formulaires{filterMode === 'today' ? " (aujourd'hui)" : filterMode === 'week' ? " (7j)" : ""}</span>
            {filteredSubmissions.length > 0 && (
              <Badge variant="outline" className="ml-1 text-[10px]">
                {filteredSubmissions.length} réponse{filteredSubmissions.length > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </div>
        <div className="flex items-center gap-1">
          {submissionsByLink.length > 0 && (
            <Select 
              value={currentLink?.id.toString()} 
              onValueChange={handleFormChange}
            >
              <SelectTrigger className="h-7 text-xs w-40">
                <SelectValue placeholder="Choisir un formulaire" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {submissionsByLink.map((item) => (
                    <SelectItem key={item.link.id} value={item.link.id.toString()}>
                      {item.link.title}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
          <Button 
            variant="ghost" 
            size="icon"
            className="h-7 w-7 hover:bg-accent/50 rounded-full transition-all duration-300 hover:scale-110"
            onClick={() => scrollResponses('left')}
            disabled={!currentSubmission}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-7 w-7 hover:bg-accent/50 rounded-full transition-all duration-300 hover:scale-110"
            onClick={() => scrollResponses('right')}
            disabled={!currentSubmission}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-7 text-xs ${filterMode === 'today' ? 'text-red-500' : 'text-muted-foreground'}`}
            onClick={() => changeFilterMode(filterMode === 'today' ? 'week' : 'today')}
            title={filterMode === 'today' ? "Afficher les réponses des 7 derniers jours" : "Afficher uniquement les réponses d'aujourd'hui"}
          >
            Auj.
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-7 text-xs ${filterMode === 'week' ? 'text-blue-500' : 'text-muted-foreground'}`}
            onClick={() => changeFilterMode(filterMode === 'week' ? 'all' : 'week')}
            title={filterMode === 'week' ? "Afficher toutes les réponses" : "Afficher les réponses des 7 derniers jours"}
          >
            7j
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-7 text-xs ${filterMode === 'all' ? 'text-green-500' : 'text-muted-foreground'}`}
            onClick={() => changeFilterMode(filterMode === 'all' ? 'week' : 'all')}
            title={filterMode === 'all' ? "Afficher les réponses des 7 derniers jours" : "Afficher toutes les réponses"}
          >
            Tous
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => window.location.href = "/links?tab=forms"}
          >
            Voir tout
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-0 pl-4 relative z-10">
        <div className="space-y-2">
          {isLoadingLinks ? (
            <div className="flex items-center justify-center h-12">
              <p className="text-xs text-muted-foreground">Chargement des formulaires...</p>
            </div>
          ) : submissionsByLink.length === 0 ? (
            <div className="flex items-center justify-center h-12">
              <p className="text-xs text-muted-foreground">Aucun formulaire trouvé</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="flex items-center justify-center h-12">
              <p className="text-xs text-muted-foreground">
                {submissionsByLink[currentLinkIndex]?.submissions.length === 0
                  ? `Aucune réponse pour: ${submissionsByLink[currentLinkIndex]?.link.title}`
                  : `Aucune réponse ${filterMode === 'today' ? "aujourd'hui" : filterMode === 'week' ? "cette semaine" : ""}`}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentLinkIndex}-${currentResponseIndex}-${filterMode}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-start gap-2 max-w-[60%]">
                    <div className="p-1 rounded-full bg-background/80 shadow-sm border border-border/20 mt-0.5">
                      <FileText className="h-3 w-3 text-purple-500" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium truncate">
                        {currentLink?.title || "Formulaire"}
                      </p>
                      
                      {currentSubmission && currentSubmission.formData && Object.entries(currentSubmission.formData).slice(0, 3).map(([key, value], idx) => {
                        const fieldDef = currentLink?.formDefinition?.find(field => field.id === key);
                        return (
                          <p key={idx} className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                            <span className="font-medium">{fieldDef?.label || key}:</span> {formatFieldValue(value)}
                          </p>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 max-w-[40%]">
                    <div>
                      {currentSubmission && (
                        <div className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 truncate">
                          {formatDistanceToNow(parseISO(currentSubmission.createdAt), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <span>{`${currentResponseIndex + 1}/${filteredSubmissions.length}`}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-full" 
                        title="Voir le détail"
                        onClick={() => { 
                          if (currentSubmission) {
                            window.location.href = `/links/form/${currentLink?.id}/submissions/${currentSubmission.id}`;
                          }
                        }}
                      >
                        <FileText className="h-4 w-4 text-blue-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </CardContent>
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </Card>
  );
} 