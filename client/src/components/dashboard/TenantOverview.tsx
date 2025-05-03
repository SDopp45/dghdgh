import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Users, Home, CalendarClock, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import type { TenantWithDetails, Property } from "@shared/schema";

// Labels pour les types de bail
const leaseTypeLabels = {
  bail_meuble: "Bail meublé",
  bail_vide: "Bail vide",
  bail_commercial: "Bail commercial",
  bail_professionnel: "Bail professionnel",
  bail_mobilite: "Bail mobilité",
  bail_etudiant: "Bail étudiant",
  bail_saisonnier: "Bail saisonnier",
  bail_terrain: "Bail terrain",
  bail_garage: "Bail garage",
  bail_social: "Bail social",
  bail_mixte: "Bail mixte",
  bail_derogatoire: "Bail dérogatoire",
  bail_rehabilitation: "Bail réhabilitation"
} as const;

export function TenantOverview() {
  const { data: tenants = [] } = useQuery<TenantWithDetails[]>({
    queryKey: ["/api/tenants"],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  // Calcul des statistiques
  const totalProperties = properties.length || 0;
  const activeLeases = tenants.filter((t) => t.active)?.length || 0;
  const occupancyRate = totalProperties > 0 ? (activeLeases / totalProperties) * 100 : 0;

  // Baux se terminant bientôt (dans les 30 jours)
  const upcomingEndLeases = tenants.filter((tenant) => {
    if (!tenant.active) return false;
    const endDate = new Date(tenant.leaseEnd);
    const monthFromNow = addDays(new Date(), 30);
    return endDate <= monthFromNow;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Vue d'ensemble des Locataires
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Taux d'occupation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Taux d'occupation</span>
              </div>
              <span className="text-sm font-medium">
                {Math.round(occupancyRate)}%
              </span>
            </div>
            <Progress value={occupancyRate} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {activeLeases} biens occupés sur {totalProperties}
            </p>
          </motion.div>

          {/* Baux à renouveler */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">
                  Baux à renouveler (30j)
                </span>
              </div>
              <span className="text-sm font-medium">
                {upcomingEndLeases?.length || 0}
              </span>
            </div>

            <div className="space-y-2">
              {upcomingEndLeases?.slice(0, 3).map((tenant, index) => (
                <motion.div
                  key={tenant.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {tenant.user?.fullName || "Locataire"}
                    </p>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-muted-foreground">
                        {tenant.property?.name || "Propriété"}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 inline-flex items-center w-fit">
                        {leaseTypeLabels[tenant.leaseType as keyof typeof leaseTypeLabels]}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Fin le {format(new Date(tenant.leaseEnd), "PP", { locale: fr })}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Tendances */}
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Tendances</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-green-500">
                  {Math.round(occupancyRate)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Taux de rétention
                </p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-blue-500">
                  {activeLeases}
                </p>
                <p className="text-xs text-muted-foreground">
                  Baux actifs
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}