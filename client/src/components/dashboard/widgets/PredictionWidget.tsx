import { motion } from "framer-motion";
import { Brain, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface PredictionData {
  propertyId: string;
  predictedValue: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  factors: {
    name: string;
    impact: number;
  }[];
}

export function PredictionWidget() {
  const { data: predictions, isLoading } = useQuery<PredictionData[]>({
    queryKey: ['property-predictions'],
    queryFn: async () => {
      const response = await api.get('/api/properties/predictions');
      return response.data;
    }
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Prédictions IA
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Prédictions IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {predictions?.map((prediction) => (
            <motion.div
              key={prediction.propertyId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-muted/50 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Propriété #{prediction.propertyId}</span>
                  {prediction.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : prediction.trend === 'down' ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : null}
                </div>
                <div className="text-sm text-muted-foreground">
                  Confiance: {Math.round(prediction.confidence * 100)}%
                </div>
              </div>
              
              <div className="space-y-2">
                {prediction.factors.map((factor, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span>{factor.name}</span>
                    <span className={`font-medium ${factor.impact > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {factor.impact > 0 ? '+' : ''}{factor.impact}%
                    </span>
                  </div>
                ))}
              </div>
              
              <Button variant="ghost" className="w-full mt-4" size="sm">
                Voir les détails
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 