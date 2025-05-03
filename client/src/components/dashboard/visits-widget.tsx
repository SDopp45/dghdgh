import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, UserCheck, Clock, Map, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { isAfter, parseISO, format, isToday, isTomorrow, isYesterday, addDays, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Widget } from "@/lib/stores/useWidgetStore";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

type Visit = {
  id: string;
  propertyName: string;
  datetime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
};

type VisitsByDate = {
  date: Date;
  visits: Visit[];
  displayName: string;
};

export function VisitsWidget({ widget }: { widget: Widget }) {
  const { data: visits, isLoading, refetch } = useQuery({
    queryKey: ["/api/visits"],
    queryFn: async () => {
      const response = await fetch("/api/visits");
      if (!response.ok) throw new Error("Failed to fetch visits");
      return response.json();
    },
  });

  const [stats, setStats] = useState({
    upcoming: 0,
    pending: 0,
    completed: 0,
    total: 0
  });

  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  // Groupe les visites par date
  const visitsByDate = useMemo(() => {
    if (!visits) return [];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Filtre les visites en attente ou confirmées
    const pendingVisits = visits.filter((visit: Visit) => 
      ['pending', 'confirmed'].includes(visit.status) && 
      isAfter(parseISO(visit.datetime), now.setHours(0, 0, 0, 0))
    );
    
    // Groupe par date
    const groupedByDate: Record<string, Visit[]> = {};
    
    pendingVisits.forEach((visit: Visit) => {
      const visitDate = parseISO(visit.datetime);
      const dateKey = format(visitDate, 'yyyy-MM-dd');
      
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      
      groupedByDate[dateKey].push(visit);
    });
    
    // Convertit en tableau avec des dates formatées
    return Object.entries(groupedByDate)
      .map(([dateStr, visitsOnDate]) => {
        const date = new Date(dateStr);
        let displayName = format(date, 'd MMMM', { locale: fr });
        
        if (isToday(date)) {
          displayName = "Aujourd'hui";
        } else if (isTomorrow(date)) {
          displayName = "Demain";
        } else if (isYesterday(date)) {
          displayName = "Hier";
        }
        
        return {
          date,
          visits: visitsOnDate.sort((a, b) => 
            new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
          ),
          displayName
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [visits]);

  useEffect(() => {
    if (visits) {
  const now = new Date();
      
      // Calculer les statistiques
      const upcoming = visits.filter((visit: Visit) => isAfter(parseISO(visit.datetime), now)).length;
      const pending = visits.filter((visit: Visit) => visit.status === 'pending').length;
      const completed = visits.filter((visit: Visit) => visit.status === 'completed').length;
      
      setStats({
        upcoming,
        pending,
        completed,
        total: visits.length
      });
    }
  }, [visits]);

  const handleUpdateStatus = async (visitId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => {
    try {
      setIsUpdating(true);
      
      // Appel API pour mettre à jour le statut de la visite
      const response = await fetch(`/api/visits/${visitId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Échec de la mise à jour du statut');
      }
      
      // Rafraîchir les données
      refetch();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const navigatePrev = () => {
    setCurrentDateIndex(Math.max(0, currentDateIndex - 1));
  };

  const navigateNext = () => {
    setCurrentDateIndex(Math.min(visitsByDate.length - 1, currentDateIndex + 1));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
      case 'confirmed': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      case 'completed': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
      case 'cancelled': return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      default: return 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'confirmed': return 'Confirmée';
      case 'completed': return 'Complétée';
      case 'cancelled': return 'Annulée';
      default: return 'Programmée';
    }
  };

  return (
    <Card className="overflow-hidden backdrop-blur-sm bg-background/30 border-white/10 h-full">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="font-medium text-base flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-violet-500" />
            {widget.title || "Visites à venir"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-violet-50 dark:bg-violet-950/20 p-3 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">À venir</div>
            <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">{stats.upcoming}</div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">En attente</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Complétées</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {visitsByDate.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {visitsByDate[currentDateIndex]?.displayName || "Visites en attente"}
                    <Badge variant="outline" className="ml-2">
                      {visitsByDate[currentDateIndex]?.visits.length || 0} visites
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7" 
                      onClick={navigatePrev}
                      disabled={currentDateIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7" 
                      onClick={navigateNext}
                      disabled={currentDateIndex >= visitsByDate.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {visitsByDate[currentDateIndex]?.visits.slice(0, 5).map((visit: Visit, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-background/40 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                          <UserCheck className="h-4 w-4 text-violet-500" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{visit.propertyName || "Propriété"}</div>
                          <div className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {format(new Date(visit.datetime), "HH:mm", { locale: fr })}
                          </div>
                        </div>
                      </div>
                      
                      <TooltipProvider>
                        <div className="flex items-center gap-2">
                          <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(visit.status)}`}>
                            {getStatusLabel(visit.status)}
                          </div>
                          
                          <div className="flex items-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 hover:bg-green-100 dark:hover:bg-green-900/20" 
                                  onClick={() => handleUpdateStatus(visit.id, 'completed')}
                                  disabled={isUpdating || visit.status === 'completed'}
                                >
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Marquer comme complétée</p>
                              </TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 hover:bg-amber-100 dark:hover:bg-amber-900/20" 
                                  onClick={() => handleUpdateStatus(visit.id, visit.status === 'pending' ? 'confirmed' : 'pending')}
                                  disabled={isUpdating || ['completed', 'cancelled'].includes(visit.status)}
                                >
                                  <AlertCircle className="h-4 w-4 text-amber-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{visit.status === 'pending' ? 'Confirmer la visite' : 'Marquer en attente'}</p>
                              </TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 hover:bg-red-100 dark:hover:bg-red-900/20" 
                                  onClick={() => handleUpdateStatus(visit.id, 'cancelled')}
                                  disabled={isUpdating || visit.status === 'cancelled'}
                                >
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Annuler la visite</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </TooltipProvider>
                    </div>
                  ))}
                  
                  {visitsByDate[currentDateIndex]?.visits.length > 5 && (
                    <div className="text-center text-xs text-muted-foreground pt-1">
                      {visitsByDate[currentDateIndex].visits.length - 5} visites supplémentaires ce jour
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center p-4 text-muted-foreground text-sm">
                Aucune visite en attente
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
