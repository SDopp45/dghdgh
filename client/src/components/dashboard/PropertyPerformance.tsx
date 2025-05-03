import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Building2, Percent } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface PropertyMetrics {
  name: string;
  purchasePrice: number;
  monthlyRent: number;
  monthlyLoanPayment: number;
  maintenanceCosts?: number;
}

export function PropertyPerformance() {
  const { data: properties = [], isLoading } = useQuery<PropertyMetrics[]>({
    queryKey: ["/api/properties"],
  });

  // Calculer les métriques de performance pour chaque propriété
  const propertyMetrics = properties.map(property => {
    const annualRent = property.monthlyRent * 12;
    const annualCosts = (property.monthlyLoanPayment * 12) + (property.maintenanceCosts || 0);

    // Calcul du ROI
    const roi = property.purchasePrice ? 
      ((annualRent - annualCosts) / property.purchasePrice) * 100 : 0;

    // Calcul du rendement locatif
    const rentalYield = property.purchasePrice ? 
      (annualRent / property.purchasePrice) * 100 : 0;

    return {
      ...property,
      roi,
      rentalYield
    };
  });

  // Calculer les moyennes globales
  const averageRoi = propertyMetrics.reduce((sum, p) => sum + p.roi, 0) / (propertyMetrics.length || 1);
  const averageYield = propertyMetrics.reduce((sum, p) => sum + p.rentalYield, 0) / (propertyMetrics.length || 1);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Performance du portefeuille
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* ROI Moyen skeleton */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>

            {/* Rendement Locatif Moyen skeleton */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>

            {/* Property list skeletons */}
            <div className="space-y-4 md:col-span-2">
              <Skeleton className="h-5 w-32" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg"
                  >
                    <Skeleton className="h-4 w-32" />
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Performance du portefeuille
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {/* ROI Moyen */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">ROI Moyen</span>
              <span className="flex items-center gap-1 text-sm">
                {averageRoi >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={averageRoi >= 0 ? "text-green-600" : "text-red-600"}>
                  {averageRoi.toFixed(1)}%
                </span>
              </span>
            </div>
            <Progress
              value={Math.min(Math.max(averageRoi, 0), 100)}
              className="h-2"
            />
          </motion.div>

          {/* Rendement Locatif Moyen */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Rendement Locatif Moyen</span>
              <span className="flex items-center gap-1 text-sm">
                <Percent className="h-4 w-4 text-blue-500" />
                <span className="text-blue-600">
                  {averageYield.toFixed(1)}%
                </span>
              </span>
            </div>
            <Progress
              value={Math.min(Math.max(averageYield, 0), 100)}
              className="h-2"
            />
          </motion.div>

          {/* Liste des propriétés avec leurs performances */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4 md:col-span-2"
          >
            <h4 className="text-sm font-semibold">Performance par bien</h4>
            <div className="space-y-3">
              {propertyMetrics.map((property, index) => (
                <motion.div
                  key={property.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                >
                  <span className="text-sm font-medium">{property.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-sm">
                      <TrendingUp className={`h-4 w-4 ${property.roi >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                      <span className={property.roi >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {property.roi.toFixed(1)}%
                      </span>
                    </span>
                    <span className="flex items-center gap-1 text-sm">
                      <Percent className="h-4 w-4 text-blue-500" />
                      <span className="text-blue-600">
                        {property.rentalYield.toFixed(1)}%
                      </span>
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}