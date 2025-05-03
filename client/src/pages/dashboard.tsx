import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardWidgetScroller } from "@/components/dashboard/widgets/DashboardWidgetScroller";
import { PredictionWidget } from "@/components/dashboard/widgets/PredictionWidget";
import { FinancialFlowWidget } from "@/components/dashboard/widgets/FinancialFlowWidget";
import { 
  FinancialReportWidget,
  MonthlyIncomeWidget,
  MonthlyExpensesWidget,
  MonthlyBalanceWidget,
  IncomeExpenseRatioWidget,
  MonthlyEvolutionWidget,
  CategoryDistributionWidget,
  AnnualTrendWidget,
  CreditsWidget,
  MonthlyTransactionsWidget
} from "@/components/dashboard/widgets/FinancialWidgets";
import { IncomeExpenseRatioWidgetBlue } from "@/components/dashboard/widgets/IncomeExpenseRatioWidgetBlue";
import { PendingCreditsWidgetBlue } from "@/components/dashboard/widgets/PendingCreditsWidgetBlue";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, LayoutGrid, Home, Users, Wallet, 
  Wrench, Bell, Plus, Minus, ExternalLink, LineChart, 
  CreditCard, Search, Filter, ChevronDown, ArrowUp, ArrowDown,
  Sun, Moon, Monitor, Cpu, Sparkles, RefreshCw
} from "lucide-react";
import { WidgetMenu } from "@/components/dashboard/WidgetMenu";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import * as React from "react";
import { useWidgetStore } from "@/lib/stores/useWidgetStore";
import { ErrorBoundary } from 'react-error-boundary';
import { CashflowSankeyWidget } from "@/components/dashboard/widgets/CashflowSankeyWidget";
import { PropertySummaryWidget } from "@/components/dashboard/widgets/PropertySummaryWidget";
import { PropertyPerformanceWidget } from "@/components/dashboard/widgets/PropertyPerformanceWidget";
import { PropertyFinanceWidget } from "@/components/dashboard/widgets/PropertyFinanceWidget";
import { PropertyTrendsWidget } from "@/components/dashboard/widgets/PropertyTrendsWidget";

export default function Dashboard() {
  const [scrollY, setScrollY] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [showError, setShowError] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  
  // Effet de parallaxe au scroll
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  // Simuler un chargement et tenter de rendre le dashboard
  useEffect(() => {
    // Simuler un délai de chargement
    const loadingTimer = setTimeout(() => {
      setLoading(false);
      
      // Tenter de rendre le dashboard avec un timeout de sécurité
      try {
        const readyTimer = setTimeout(() => {
          setIsReady(true);
        }, 200);
        
        // Timeout de sécurité en cas d'erreur
        const errorTimer = setTimeout(() => {
          if (!isReady) {
            setShowError(true);
          }
        }, 5000);
        
        return () => {
          clearTimeout(readyTimer);
          clearTimeout(errorTimer);
        };
      } catch (error) {
        console.error("Erreur lors du rendu du dashboard", error);
        setShowError(true);
      }
    }, 1000);
    
    return () => clearTimeout(loadingTimer);
  }, [isReady]);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Grille de fond animée */}
      <div 
        className="fixed inset-0 bg-gradient-to-br from-black via-background/95 to-background/80"
        style={{ 
          backgroundImage: `radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.15) 2%, transparent 0%)`,
          backgroundSize: `50px 50px` 
        }}
      />
      
      {/* Formes abstraites animées - activées progressivement */}
      {isReady && (
        <>
          <motion.div 
            className="fixed top-0 right-0 w-1/3 h-1/3 opacity-10 blur-3xl"
            animate={{ 
              rotate: [0, 180], 
              scale: [1, 1.2, 1],
              opacity: [0.05, 0.1, 0.05] 
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{ 
              background: 'radial-gradient(circle, rgba(114,63,255,1) 0%, rgba(180,27,171,1) 50%, rgba(79,9,121,1) 100%)',
              borderRadius: '43% 57% 73% 27% / 46% 42% 58% 54%' 
            }}
          />
          
          <motion.div 
            className="fixed bottom-0 left-0 w-1/3 h-1/3 opacity-10 blur-3xl"
            animate={{ 
              rotate: [180, 0], 
              scale: [1, 1.3, 1],
              opacity: [0.05, 0.1, 0.05] 
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            style={{ 
              background: 'radial-gradient(circle, rgba(63,94,251,1) 0%, rgba(252,70,107,1) 100%)',
              borderRadius: '63% 37% 33% 67% / 36% 62% 38% 64%' 
            }}
          />
          
          {/* Particules d'ambiance */}
          <div className="fixed inset-0 pointer-events-none">
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                initial={{ 
                  x: Math.random() * window.innerWidth, 
                  y: Math.random() * window.innerHeight,
                  opacity: Math.random() * 0.3 + 0.1,
                  scale: Math.random() * 0.5 + 0.5
                }}
                animate={{ 
                  y: [null, '-100vh'],
                  opacity: [null, 0]
                }}
                transition={{ 
                  duration: Math.random() * 30 + 20,
                  repeat: Infinity,
                  ease: "linear",
                  delay: Math.random() * 10
                }}
              />
            ))}
          </div>
        </>
      )}

      <div className="container relative mx-auto py-6 z-10">
        {/* En-tête avec effet glassmorphism */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex justify-between items-center mb-8 p-6 rounded-xl bg-white border border-gray-200"
          style={{ transform: `translateY(${scrollY * 0.05}px)` }}
        >
          <div>
            <motion.h1 
              className="text-4xl font-bold mb-2 flex items-center"
              initial={{ backgroundPosition: '0% 50%' }}
              animate={{ backgroundPosition: '100% 50%' }}
              transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse' }}
              style={{ 
                backgroundImage: 'linear-gradient(90deg, #ff1cf7, #b249f8, #7a6cff, #2996ff, #00d4ff)', 
                backgroundSize: '300% 100%',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent'
              }}
            >
              <motion.div
                animate={{ rotate: [0, 5, 0, -5, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
                className="mr-3"
              >
                <Cpu className="h-10 w-10 text-primary" />
              </motion.div>
              Interface de Contrôle
            </motion.h1>
            <p className="text-muted-foreground/80 text-lg flex items-center">
              <Sparkles className="h-4 w-4 mr-2 text-primary" />
              Vision 360° de votre patrimoine immobilier
            </p>
          </div>
          <div className="flex gap-3">
            <WidgetMenu>
              <Button className="gap-2 relative overflow-hidden group">
                <span className="absolute inset-0 w-full h-full bg-gradient-to-br from-purple-600 to-blue-500 opacity-70 group-hover:opacity-100 transition-opacity duration-300"></span>
                <span className="absolute inset-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJncmlkIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0gMTAgMCBMIDAgMCAwIDEwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIiAvPjwvc3ZnPg==')] opacity-20 group-hover:opacity-30 transition-opacity duration-300"></span>
                <span className="relative flex items-center gap-2">
                <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                Ajouter un widget
                </span>
              </Button>
            </WidgetMenu>
          </div>
        </motion.div>
        
        {loading ? (
          /* Message de chargement */
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-background/50 backdrop-blur-md rounded-lg p-8 text-center"
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mb-4 mx-auto w-12 h-12 flex items-center justify-center"
            >
              <RefreshCw className="h-8 w-8 text-primary/70" />
            </motion.div>
            <motion.h2 
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-2xl font-semibold mb-4"
            >
              Chargement en cours...
            </motion.h2>
          </motion.div>
        ) : (
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="general" className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Général
                </TabsTrigger>
                <TabsTrigger value="properties" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Propriétés
                </TabsTrigger>
                <TabsTrigger value="tenants" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Locataires
                </TabsTrigger>
                <TabsTrigger value="maintenance" className="flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Maintenance
                </TabsTrigger>
                <TabsTrigger value="finance" className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Finance
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="general">
                <DashboardWidgetScroller />
              </TabsContent>
              
              <TabsContent value="properties">
                <div className="grid gap-6">
                  <PropertySummaryWidget />
                  <PropertyTrendsWidget />
                  <div className="grid grid-cols-2 gap-6 w-full">
                  <PropertyFinanceWidget />
                    <PropertyPerformanceWidget />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="tenants">
                <div className="grid gap-6">
                  {/* Widgets pour les locataires */}
                </div>
              </TabsContent>
              
              <TabsContent value="maintenance">
                <div className="grid gap-6">
                  {/* Widgets pour la maintenance */}
                </div>
              </TabsContent>
              
              <TabsContent value="finance">
                <div className="grid gap-6">
                  <FinancialReportWidget />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="overflow-auto max-h-[500px] pr-1 rounded-xl">
                      <PendingCreditsWidgetBlue />
                    </div>
                    <div className="overflow-auto max-h-[500px] pr-1 rounded-xl">
                      <CategoryDistributionWidget />
                    </div>
                  </div>
                  <div className="overflow-auto max-h-[600px] pr-1 rounded-xl">
                    <CashflowSankeyWidget 
                      widget={{ 
                        id: "cashflow-sankey-diagram",
                        type: "cashflow-sankey-diagram",
                        title: "Flux Financiers (Sankey)",
                        category: "finance",
                        context: "dashboard",
                        position: { x: 0, y: 0 },
                        size: { width: 3, height: 2, minWidth: 2, minHeight: 1, maxWidth: 3, maxHeight: 3 },
                        displaySize: "large",
                        importance: "normal",
                        collapsed: false,
                        pinned: false,
                        visible: true,
                        order: 1
                      }} 
                      period="month"
                      transactionStatus="all"
                      key="cashflow-sankey-widget"
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="overflow-auto max-h-[500px] pr-1 rounded-xl">
                      <IncomeExpenseRatioWidgetBlue />
                    </div>
                    <div className="overflow-auto max-h-[600px] pr-1 rounded-xl">
                      <MonthlyBalanceWidget />
                    </div>
                  </div>
                  <div className="overflow-auto max-h-[600px] pr-1 rounded-xl">
                    <MonthlyEvolutionWidget />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback = ({ error, resetErrorBoundary }: ErrorFallbackProps) => (
  <div className="bg-background/50 backdrop-blur-md rounded-lg p-8 text-center">
    <h2 className="text-2xl font-semibold mb-4">Une erreur est survenue</h2>
    <p className="text-muted-foreground mb-6">{error.message}</p>
    <Button onClick={resetErrorBoundary}>Réessayer</Button>
  </div>
);