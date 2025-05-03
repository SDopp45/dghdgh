import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Widget } from '@/lib/stores/useWidgetStore';
import { usePredictiveData } from '../hooks/usePredictiveData';
import { 
  BrainCircuit, Building, TrendingUp, PieChart, ArrowUpRight, 
  ArrowDownRight, Clock, Info, AlertTriangle 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';

// Types
type PredictionTimeframe = '3m' | '6m' | '1y' | '3y' | '5y';
type PredictionType = 'values' | 'roi' | 'demand' | 'risk';

// Composant pour gradient de couleur
const getColorGradient = (value: number, thresholds: number[], colors: string[]) => {
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) {
      return colors[i];
    }
  }
  return colors[colors.length - 1];
};

export function PredictiveAnalyticsWidget({ widget }: { widget: Widget }) {
  const [predictionType, setPredictionType] = useState<PredictionType>('values');
  const [timeframe, setTimeframe] = useState<PredictionTimeframe>('1y');
  
  const { 
    chartData, 
    isLoading, 
    predictedGrowth,
    confidenceLevel,
    formatValue,
    isPositiveTrend,
    selectedPropertyId,
    setSelectedPropertyId,
    data
  } = usePredictiveData({
    timeframe,
    predictionType,
  });
  
  // État local pour l'affichage de la croissance et confiance dans l'UI
  const [displayedGrowth, setDisplayedGrowth] = useState<number>(0);
  const [displayedConfidence, setDisplayedConfidence] = useState<number>(0);
  
  // Mettre à jour les valeurs d'affichage quand les valeurs originales changent
  useEffect(() => {
    if (predictedGrowth) {
      const currentValue = predictedGrowth.get();
      setDisplayedGrowth(parseFloat(currentValue.toFixed(1)));
    }
    
    if (confidenceLevel) {
      const currentValue = confidenceLevel.get();
      setDisplayedConfidence(Math.round(currentValue));
    }
  }, [predictedGrowth, confidenceLevel]);
  
  // Déterminer la couleur de croissance
  const growthColor = useMemo(() => {
    return getColorGradient(
      displayedGrowth,
      [-10, 0, 10, 30],
      ["#ef4444", "#f97316", "#22c55e", "#10b981"]
    );
  }, [displayedGrowth]);

  return (
    <Card className="overflow-hidden h-full backdrop-blur-sm bg-background/30 border-white/10">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">
            <div className="flex items-center space-x-2">
              <BrainCircuit className="h-5 w-5 text-violet-500" />
              <span>Prédictions IA</span>
            </div>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs bg-background/20 backdrop-blur-md">
              <span className="text-primary/70">IA</span>
            </Badge>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-between mt-4 gap-2">
          {/* Type de prédiction */}
          <Tabs value={predictionType} onValueChange={(value) => setPredictionType(value as PredictionType)}>
            <TabsList className="bg-background/20 backdrop-blur-md">
              <TabsTrigger
                value="values"
                className="data-[state=active]:bg-violet-700 text-xs px-2 py-1"
              >
                <div className="flex items-center space-x-1">
                  <Building className="h-3 w-3" />
                  <span>Valeurs</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="roi"
                className="data-[state=active]:bg-green-700 text-xs px-2 py-1"
              >
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>ROI</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="demand"
                className="data-[state=active]:bg-blue-700 text-xs px-2 py-1"
              >
                <div className="flex items-center space-x-1">
                  <PieChart className="h-3 w-3" />
                  <span>Demande</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="risk"
                className="data-[state=active]:bg-red-700 text-xs px-2 py-1"
              >
                <div className="flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Risque</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Horizon de temps */}
          <Select value={timeframe} onValueChange={(value) => setTimeframe(value as PredictionTimeframe)}>
            <SelectTrigger className="h-8 text-xs bg-background/20 backdrop-blur-md w-[80px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m" className="text-xs">3 mois</SelectItem>
              <SelectItem value="6m" className="text-xs">6 mois</SelectItem>
              <SelectItem value="1y" className="text-xs">1 an</SelectItem>
              <SelectItem value="3y" className="text-xs">3 ans</SelectItem>
              <SelectItem value="5y" className="text-xs">5 ans</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-2">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <motion.div
              className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Panneau d'information */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-background/20 backdrop-blur-sm rounded-lg p-3 flex flex-col justify-between">
                <div className="text-xs text-muted-foreground">Prédiction de croissance</div>
                <div className="flex items-end justify-between mt-1">
                  <div 
                    className="text-2xl font-semibold flex items-center"
                    style={{ color: growthColor }}
                  >
                    {isPositiveTrend() ? (
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 mr-1" />
                    )}
                    <span>{displayedGrowth}</span>%
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {timeframe === '3m' ? '3 mois' :
                     timeframe === '6m' ? '6 mois' :
                     timeframe === '1y' ? '1 an' :
                     timeframe === '3y' ? '3 ans' : '5 ans'}
                  </div>
                </div>
              </div>
              
              <div className="bg-background/20 backdrop-blur-sm rounded-lg p-3 flex flex-col justify-between">
                <div className="text-xs text-muted-foreground">Indice de confiance</div>
                <div className="mt-1">
                  <div className="flex justify-between mb-1">
                    <div className="text-sm font-medium">
                      {displayedConfidence}%
                    </div>
                  </div>
                  <div
                    style={{ width: `${displayedConfidence}%` }}
                    className="h-1.5 rounded-full bg-gradient-to-r from-yellow-500 to-emerald-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Sélection de propriété */}
            <Select 
              value={selectedPropertyId || ''} 
              onValueChange={(value) => setSelectedPropertyId(value || null)}
            >
              <SelectTrigger className="h-8 text-xs bg-background/20 backdrop-blur-md w-full">
                <SelectValue placeholder="Sélectionner une propriété" />
              </SelectTrigger>
              <SelectContent>
                {data?.map(property => (
                  <SelectItem key={property.id} value={property.id} className="text-xs">
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Graphique de prédiction */}
            <div className="aspect-video bg-background/20 backdrop-blur-sm rounded-lg p-3 overflow-hidden">
              <div className="text-xs text-muted-foreground mb-2">
                Projection {predictionType === 'values' ? 'de valeur' : 
                           predictionType === 'roi' ? 'de rentabilité' :
                           predictionType === 'demand' ? 'de demande' : 'de risque'}
              </div>
              <ResponsiveContainer width="100%" height="85%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="x" 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      if (predictionType === 'values' && value > 1000) {
                        return `${(value / 1000).toFixed(0)}k`;
                      }
                      return value;
                    }}
                  />
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    vertical={false} 
                    stroke="rgba(255,255,255,0.1)" 
                  />
                  <Tooltip 
                    content={(props) => {
                      const { active, payload, label } = props;
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background/90 backdrop-blur-md p-2 border border-white/10 rounded-md text-xs">
                            <p className="font-medium">{label}</p>
                            <p className="text-primary">{formatValue(data.y)}</p>
                            {data.confidence && (
                              <p className="text-muted-foreground">
                                Confiance: {data.confidence.toFixed(0)}%
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    x="Aujourd'hui"
                    stroke="rgba(255,255,255,0.3)"
                    strokeDasharray="3 3"
                    label={{
                      value: 'Aujourd\'hui',
                      position: 'insideTopRight',
                      fill: 'rgba(255,255,255,0.5)',
                      fontSize: 10
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="y"
                    stroke={
                      predictionType === 'values' ? '#8884d8' :
                      predictionType === 'roi' ? '#10b981' :
                      predictionType === 'demand' ? '#3b82f6' :
                      '#ef4444'
                    }
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Facteurs d'influence */}
            {selectedPropertyId && chartData.length > 1 && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Facteurs d'influence</div>
                <div className="space-y-2">
                  {chartData[chartData.length - 1] && 
                   chartData[chartData.length - 1].factors && 
                   Object.entries(
                    chartData[chartData.length - 1].factors as {
                      marketTrend: number;
                      localDemand: number;
                      seasonality: number;
                      economicIndicators: number;
                    }
                  ).map(([key, value]) => {
                    const factorName = key === 'marketTrend' ? 'Tendance du marché' :
                                      key === 'localDemand' ? 'Demande locale' :
                                      key === 'seasonality' ? 'Saisonnalité' : 'Indicateurs économiques';
                    const percentage = Math.round(Number(value) * 100);
                    return (
                      <div key={key} className="flex items-center">
                        <div className="text-xs w-40">{factorName}</div>
                        <div className="flex-1">
                          <Progress value={percentage} className="h-1.5" />
                        </div>
                        <div className="text-xs ml-2 w-8 text-right">{percentage}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 