import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock, Home, AlertCircle, Calendar, Users } from "lucide-react";
import { format, parseISO, isToday, isAfter, isBefore, addDays, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

interface Tenant {
  id: number;
  user?: {
    id: number;
    fullName?: string;
    email?: string;
  };
  propertyId: number;
  leaseStart?: string;
  leaseEnd?: string;
  active?: boolean;
  property?: {
    name: string;
    address?: string;
  };
}

export function LeaseEndWidget() {
  const [currentTenantIndex, setCurrentTenantIndex] = useState(0);
  const [leaseFilterMode, setLeaseFilterMode] = useState<'month' | 'threemonths' | 'all'>('month');

  // Récupérer tous les locataires actifs
  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ['/api/tenants'],
    queryFn: async () => {
      const response = await api.get('/api/tenants');
      return response.data || [];
    }
  });

  // Filtrer les locataires avec baux qui se terminent bientôt
  const getEndingSoonLeases = () => {
    const now = new Date();
    const oneMonthFromNow = addDays(now, 30);
    const threeMonthsFromNow = addDays(now, 90);

    return tenants.filter(tenant => {
      if (!tenant.active || !tenant.leaseEnd) return false;
      
      const leaseEndDate = parseISO(tenant.leaseEnd);
      
      // Ne pas inclure les baux déjà expirés
      if (isBefore(leaseEndDate, now)) return false;
      
      switch (leaseFilterMode) {
        case 'month':
          return isBefore(leaseEndDate, oneMonthFromNow);
        case 'threemonths':
          return isBefore(leaseEndDate, threeMonthsFromNow);
        case 'all':
          return true;
        default:
          return false;
      }
    }).sort((a, b) => {
      // Trier par date de fin de bail (plus proche en premier)
      const dateA = a.leaseEnd ? new Date(a.leaseEnd).getTime() : 0;
      const dateB = b.leaseEnd ? new Date(b.leaseEnd).getTime() : 0;
      return dateA - dateB;
    });
  };

  const endingSoonLeases = getEndingSoonLeases();

  // Navigation entre les locataires
  const scrollTenants = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      setCurrentTenantIndex(prev => (prev > 0 ? prev - 1 : endingSoonLeases.length - 1));
    } else {
      setCurrentTenantIndex(prev => (prev < endingSoonLeases.length - 1 ? prev + 1 : 0));
    }
  };

  // Compter les baux qui se terminent très bientôt (moins de 15 jours)
  const getUrgentLeasesCount = () => {
    const now = new Date();
    
    return tenants.filter(tenant => {
      if (!tenant.active || !tenant.leaseEnd) return false;
      
      const leaseEndDate = parseISO(tenant.leaseEnd);
      const daysRemaining = differenceInDays(leaseEndDate, now);
      
      return daysRemaining >= 0 && daysRemaining <= 15;
    }).length;
  };

  // Navigation vers la page des locataires
  const handleNavigateToTenants = () => {
    window.location.href = "/tenants";
  };

  return (
    <Card className="w-1/2 h-[140px] bg-gradient-to-br from-background/90 to-background/50 backdrop-blur-sm border-t-2 border-t-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg overflow-hidden relative">
      <div className="absolute inset-0 w-[5px] h-full bg-gradient-to-b from-orange-500/70 to-orange-500/30" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2 pl-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-full bg-background/80 shadow-md backdrop-blur-sm border border-border/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 text-orange-500">
            <Calendar className="h-4 w-4" />
          </div>
          <CardTitle className="text-sm font-medium flex items-center gap-1">
            <span>Fin de baux{leaseFilterMode === 'month' ? " (30j)" : leaseFilterMode === 'threemonths' ? " (90j)" : ""}</span>
            {endingSoonLeases.length > 0 && (
              <div className="flex items-center gap-1 ml-2">
                <div className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  {endingSoonLeases.length} à venir
                </div>
                {getUrgentLeasesCount() > 0 && (
                  <div className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                    {getUrgentLeasesCount()} urgent{getUrgentLeasesCount() > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}
          </CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon"
            className="h-7 w-7 hover:bg-accent/50 rounded-full transition-all duration-300 hover:scale-110"
            onClick={() => scrollTenants('left')}
            disabled={endingSoonLeases.length <= 1}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-7 w-7 hover:bg-accent/50 rounded-full transition-all duration-300 hover:scale-110"
            onClick={() => scrollTenants('right')}
            disabled={endingSoonLeases.length <= 1}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-7 text-xs ${leaseFilterMode === 'month' ? 'text-red-500' : 'text-muted-foreground'}`}
            onClick={() => {
              setLeaseFilterMode(leaseFilterMode === 'month' ? 'threemonths' : 'month');
              setCurrentTenantIndex(0);
            }}
            title={leaseFilterMode === 'month' ? "Afficher les baux se terminant dans les 90 prochains jours" : "Afficher uniquement les baux se terminant dans les 30 prochains jours"}
          >
            30j
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-7 text-xs ${leaseFilterMode === 'threemonths' ? 'text-blue-500' : 'text-muted-foreground'}`}
            onClick={() => {
              setLeaseFilterMode(leaseFilterMode === 'threemonths' ? 'all' : 'threemonths');
              setCurrentTenantIndex(0);
            }}
            title={leaseFilterMode === 'threemonths' ? "Afficher tous les baux" : "Afficher les baux se terminant dans les 90 prochains jours"}
          >
            90j
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-7 text-xs ${leaseFilterMode === 'all' ? 'text-green-500' : 'text-muted-foreground'}`}
            onClick={() => {
              setLeaseFilterMode(leaseFilterMode === 'all' ? 'month' : 'all');
              setCurrentTenantIndex(0);
            }}
            title={leaseFilterMode === 'all' ? "Afficher les baux se terminant dans les 30 prochains jours" : "Afficher tous les baux"}
          >
            Tous
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleNavigateToTenants}
          >
            Voir tout
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-0 pl-4 relative z-10">
        <div className="space-y-2">
          {endingSoonLeases.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTenantIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-start gap-2 max-w-[60%]">
                    <div className="p-1 rounded-full bg-background/80 shadow-sm border border-border/20 mt-0.5">
                      <Home className="h-3 w-3 text-orange-500" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium truncate">
                        {endingSoonLeases[currentTenantIndex].property?.name || "Propriété non spécifiée"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {endingSoonLeases[currentTenantIndex].user?.fullName || "Locataire non spécifié"}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          {`Fin le ${format(parseISO(endingSoonLeases[currentTenantIndex].leaseEnd!), "d MMMM yyyy", { locale: fr })}`}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 max-w-[40%]">
                    <div className="flex items-center gap-2">
                      {endingSoonLeases[currentTenantIndex].leaseEnd && (
                        <div className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          differenceInDays(parseISO(endingSoonLeases[currentTenantIndex].leaseEnd!), new Date()) <= 15
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : differenceInDays(parseISO(endingSoonLeases[currentTenantIndex].leaseEnd!), new Date()) <= 30
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        } truncate`}>
                          {`J-${differenceInDays(parseISO(endingSoonLeases[currentTenantIndex].leaseEnd!), new Date())}`}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-full" 
                        title="Voir le locataire"
                        onClick={() => window.location.href = `/tenants/${endingSoonLeases[currentTenantIndex].id}`}
                      >
                        <Users className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 hover:bg-orange-100 dark:hover:bg-orange-900/20 rounded-full" 
                        title="Voir la propriété"
                        onClick={() => window.location.href = `/properties/${endingSoonLeases[currentTenantIndex].propertyId}`}
                      >
                        <Home className="h-4 w-4 text-orange-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex items-center justify-center h-12">
              <p className="text-xs text-muted-foreground">Aucun bail se terminant prochainement</p>
            </div>
          )}
        </div>
      </CardContent>
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </Card>
  );
} 