import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Wrench, Calendar, BellRing, Info, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useProperties } from "@/api/properties";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format, addMonths, isAfter, isBefore, differenceInDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

// Hook personnalisé pour gérer la logique des données
function usePropertyAlerts() {
  const { data: properties = [], isLoading: isLoadingProperties, error: propertiesError } = useProperties();
  
  const { data: contracts = [], isLoading: isLoadingContracts, error: contractsError } = useQuery({
    queryKey: ['propertyContracts'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/contracts?type=lease');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des contrats');
        }
        const data = await response.json();
        if (data && typeof data === 'object' && 'data' in data) {
          return Array.isArray(data.data) ? data.data : [];
        }
        if (!Array.isArray(data)) {
          console.error('La réponse de l\'API n\'est pas un tableau:', data);
          return [];
        }
        return data;
      } catch (error) {
        console.error("Erreur lors de la récupération des contrats:", error);
        return [];
      }
    }
  });

  const { data: tenants = [], isLoading: isLoadingTenants, error: tenantsError } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      try {
        const response = await fetch('http://localhost:5005/api/tenants');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des locataires');
        }
        const data = await response.json();
        if (data && typeof data === 'object' && 'data' in data) {
          return Array.isArray(data.data) ? data.data : [];
        }
        if (!Array.isArray(data)) {
          console.error('La réponse de l\'API des locataires n\'est pas un tableau:', data);
          return [];
        }
        return data;
      } catch (error) {
        console.error("Erreur lors de la récupération des locataires:", error);
        return [];
      }
    }
  });

  const isLoading = isLoadingProperties || isLoadingContracts || isLoadingTenants;
  const hasError = propertiesError || contractsError || tenantsError;

  const today = new Date();
  const threeMonthsLater = addMonths(today, 3);

  const maintenanceProperties = properties.filter(p => 
    p.status === "maintenance" || p.status === "under_maintenance"
  );

  const vacantProperties = properties.filter(p => 
    p.status === "vacant" || p.status === "available"
  );

  const expiringLeases = Array.isArray(contracts) ? contracts
    .filter(contract => 
      contract && 
      contract.type === 'lease' && 
      contract.propertyId && 
      contract.endDate && 
      isAfter(parseISO(contract.endDate), today) && 
      isBefore(parseISO(contract.endDate), threeMonthsLater)
    )
    .map(contract => {
      const property = properties.find(p => p.id === contract.propertyId);
      const tenant = tenants.find(t => t.id === contract.tenantId);
      if (!property) return null;
      
      const expirationDate = parseISO(contract.endDate);
      return {
        ...property,
        contractId: contract.id,
        leaseExpirationDate: expirationDate,
        daysUntilExpiration: differenceInDays(expirationDate, today),
        tenant: tenant ? {
          name: tenant.name,
          email: tenant.email,
          phone: tenant.phone
        } : null
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration) : [];

  const hasAlerts = maintenanceProperties.length > 0 || vacantProperties.length > 0 || expiringLeases.length > 0;

  return {
    isLoading,
    hasError,
    hasAlerts,
    maintenanceProperties,
    vacantProperties,
    expiringLeases
  };
}

export function PropertyAlertWidget() {
  const {
    isLoading,
    hasError,
    hasAlerts,
    maintenanceProperties,
    vacantProperties,
    expiringLeases
  } = usePropertyAlerts();

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Alertes propriétés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Alertes propriétés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-red-500">
            <AlertCircle className="h-5 w-5 mr-2" />
            Erreur de chargement des données
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          Alertes propriétés
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAlerts ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <Info className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Aucune alerte active pour le moment</p>
          </div>
        ) : (
          <Tabs defaultValue="maintenance" className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-3">
              <TabsTrigger value="maintenance" className="flex gap-1 text-xs">
                Maintenance
                <Badge variant="outline" className="ml-1">
                  {maintenanceProperties.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="vacant" className="flex gap-1 text-xs">
                Vacants
                <Badge variant="outline" className="ml-1">
                  {vacantProperties.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="expiring" className="flex gap-1 text-xs">
                Expirations
                <Badge variant="outline" className="ml-1">
                  {expiringLeases.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="maintenance" className="space-y-4">
              {maintenanceProperties.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  Aucune propriété en maintenance
                </div>
              ) : (
                maintenanceProperties.map((property, index) => (
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Wrench className="h-5 w-5 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{property.name || `Propriété #${property.id}`}</h3>
                        <p className="text-xs text-muted-foreground">{property.address}</p>
                        <div className="mt-2">
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                            En maintenance
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="vacant" className="space-y-4">
              {vacantProperties.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  Aucune propriété vacante
                </div>
              ) : (
                vacantProperties.map((property, index) => (
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <BellRing className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{property.name || `Propriété #${property.id}`}</h3>
                        <p className="text-xs text-muted-foreground">{property.address}</p>
                        <div className="mt-2">
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/30">
                            Vacant
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="expiring" className="space-y-4">
              {expiringLeases.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  Aucun contrat n'expire prochainement
                </div>
              ) : (
                expiringLeases.map((property, index) => (
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Calendar className="h-5 w-5 text-purple-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{property.name || `Propriété #${property.id}`}</h3>
                        <p className="text-xs text-muted-foreground">{property.address}</p>
                        <div className="mt-2 flex flex-col gap-1">
                          <Badge variant="outline" className="inline-flex w-fit bg-purple-500/10 text-purple-700 border-purple-500/30">
                            Contrat expirant le {format(property.leaseExpirationDate, 'd MMMM yyyy', { locale: fr })}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {property.daysUntilExpiration} jours restants
                          </p>
                          {property.tenant && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              <p>Locataire: {property.tenant.name}</p>
                              <p>Contact: {property.tenant.phone}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
} 