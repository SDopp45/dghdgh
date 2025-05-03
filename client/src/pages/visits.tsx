import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  ListChecks, 
  Users, 
  Home, 
  FileText, 
  TrendingUp,
  Building,
  CheckCircle,
  Clock
} from "lucide-react";
import { VisitsTabs } from "@/components/visits/visits-tabs";
import { VisitCalendar } from "@/components/visits/visit-calendar";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Visit } from "@/types/visits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

// Animation variants for the container and items
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export default function VisitsPage() {
  // Récupérer le paramètre de vue depuis l'URL
  const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const urlView = search.get('view');
  const selectedVisitId = search.get('selected');
  const [view, setView] = useState<"list" | "calendar">(urlView === "calendar" ? "calendar" : "list");
  
  // État pour suivre la visite sélectionnée
  const [selectedVisit, setSelectedVisit] = useState<string | null>(selectedVisitId);
  
  // Mettre à jour la vue quand l'URL change
  useEffect(() => {
    const handleURLChange = () => {
      const search = new URLSearchParams(window.location.search);
      const urlView = search.get('view');
      const selectedId = search.get('selected');
      
      setView(urlView === "calendar" ? "calendar" : "list");
      setSelectedVisit(selectedId);
    };
    
    // Écouter les changements d'URL
    window.addEventListener('popstate', handleURLChange);
    
    // Nettoyage
    return () => {
      window.removeEventListener('popstate', handleURLChange);
    };
  }, []);

  // Récupérer les statistiques des visites
  const { data: visits = [] } = useQuery<Visit[]>({
    queryKey: ["/api/visits"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Effet pour ouvrir les détails de la visite sélectionnée
  useEffect(() => {
    if (selectedVisit && visits.length > 0) {
      // Trouver la visite sélectionnée
      const visit = visits.find(v => v.id.toString() === selectedVisit);
      
      if (visit) {
        // Ouvrir les détails de la visite
        // Note: Vous devrez implémenter cette logique en fonction de votre interface utilisateur
        // Par exemple, ouvrir une modal ou naviguer vers une vue détaillée
        console.log("Visite sélectionnée:", visit);
        
        // Exemple: ouvrir une modal ou déclencher l'affichage des détails
        // openVisitDetails(visit); // Supposons que cette fonction existe
      }
    }
  }, [selectedVisit, visits]);

  // Statistiques des visites
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  const stats = {
    upcoming: visits.filter(v => !v.archived && new Date(v.datetime) >= currentDate).length,
    pending: visits.filter(v => !v.archived && v.status === "pending" && new Date(v.datetime) >= currentDate).length,
    completed: visits.filter(v => !v.archived && v.status === "completed").length,
    conversion: visits.filter(v => !v.archived && v.status === "completed").length / 
               (visits.filter(v => !v.archived).length || 1) * 100
  };

  const [isPageReady, setIsPageReady] = useState(false);
  
  // Simulate data loading like in finance/maintenance pages
  useEffect(() => {
    const timer = setTimeout(() => setIsPageReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Widgets de statistiques
  const statCards = [
    {
      title: "Visites à venir",
      value: stats.upcoming,
      icon: CalendarIcon,
      color: "text-violet-500",
      bgColor: "bg-violet-50 dark:bg-violet-950/10",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between min-h-[32px]">
            <span className="text-3xl font-bold text-violet-500 animate-in fade-in-50 duration-500">
              {stats.upcoming}
            </span>
            <span className="text-sm text-muted-foreground">
              Total
            </span>
          </div>
          <div className="space-y-2">
            <Progress 
              value={100} 
              className="h-2 bg-violet-100 dark:bg-violet-950/20"
              indicatorClassName="bg-violet-500"
            />
            <div className="text-xs font-medium text-violet-600 dark:text-violet-400">
              Nombre total de visites planifiées
            </div>
          </div>
        </div>
      )
    },
    {
      title: "En attente",
      value: stats.pending,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-violet-100 dark:bg-violet-900/20",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between min-h-[32px]">
            <span className="text-3xl font-bold text-amber-500 animate-in fade-in-50 duration-500 delay-200">
              {stats.pending}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round((stats.pending / Math.max(stats.upcoming, 1)) * 100)}%
            </span>
          </div>
          <div className="space-y-2">
            <div className="h-2.5 w-full rounded-full bg-violet-100 dark:bg-violet-950/20">
              <motion.div 
                className="h-full bg-amber-500 rounded-full transition-all"
                initial={{ width: 0 }}
                animate={{ width: `${(stats.pending / Math.max(stats.upcoming, 1)) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              />
            </div>
            <div className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Visites en attente de réalisation
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Terminées",
      value: stats.completed,
      icon: CheckCircle,
      color: "text-emerald-500",
      bgColor: "bg-gradient-to-br from-violet-100 to-violet-200 dark:from-emerald-950/30 dark:to-violet-950/30 dark:bg-gray-800/80",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between min-h-[32px]">
            <span className="text-3xl font-bold text-emerald-500 dark:text-emerald-400 animate-in fade-in-50 duration-500 delay-300">
              {stats.completed}
            </span>
            <span className="text-sm text-muted-foreground">
              Finalisées
            </span>
          </div>
          <div className="space-y-2">
            <div className="h-2.5 w-full rounded-full bg-violet-100 dark:bg-violet-950/20">
              <motion.div 
                className="h-full bg-emerald-500 dark:bg-emerald-600/70 rounded-full transition-all"
                initial={{ width: 0 }}
                animate={{ width: `${(stats.completed / Math.max(stats.upcoming + stats.completed, 1)) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
              />
            </div>
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-300">
              Visites terminées
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Taux de conversion",
      value: `${stats.conversion.toFixed(0)}%`,
      icon: TrendingUp,
      color: "text-indigo-500",
      bgColor: "bg-violet-200 dark:bg-violet-800/40",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between min-h-[32px]">
            <span className="text-3xl font-bold text-indigo-500 animate-in fade-in-50 duration-500 delay-400">
              {stats.conversion.toFixed(0)}%
            </span>
            <span className="text-sm text-muted-foreground">
              Conversion
            </span>
          </div>
          <div className="space-y-2">
            <div className="h-2.5 w-full rounded-full flex overflow-hidden bg-violet-100 dark:bg-violet-950/20">
              <motion.div 
                className="bg-indigo-500 transition-all" 
                initial={{ width: 0 }}
                animate={{ width: `${stats.conversion}%` }}
                transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between text-xs font-medium">
              <span className="text-indigo-600 dark:text-indigo-400">Taux de réalisation des visites</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  // Squelette de chargement
  if (!isPageReady) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        {/* Squelette de l'en-tête */}
        <div className="p-6 rounded-xl border border-gray-200 mb-8">
          <div className="flex justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                <div className="h-10 w-64 bg-gray-200 animate-pulse rounded-lg"></div>
              </div>
              <div className="h-5 w-80 bg-gray-200 animate-pulse rounded-lg ml-[52px]"></div>
            </div>
            <div className="w-40 h-10 bg-gray-200 animate-pulse rounded-lg"></div>
          </div>
        </div>
        
        {/* Squelette des stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((_, index) => (
            <div key={index} className="h-32 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
        
        {/* Squelette du contenu */}
        <div className="min-h-[500px] mt-6">
          <div className="h-10 bg-gray-200 animate-pulse rounded-lg w-full mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((_, index) => (
              <div key={index} className="h-24 bg-gray-200 animate-pulse rounded-lg w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="mb-8 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="flex justify-between items-center p-6">
          <div>
            <motion.div
              className="flex items-center gap-3 mb-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Building className="h-10 w-10 text-violet-500" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent animate-gradient">
                Gestion des Visites
              </h1>
            </motion.div>
            <motion.p
              className="text-muted-foreground text-lg ml-[52px]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Gérez les visites et rendez-vous pour vos biens
            </motion.p>
          </div>
          <Link href="/visits/new">
            <Button className="gap-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-300">
              <Plus className="h-4 w-4" />
              Nouvelle visite
            </Button>
          </Link>
        </div>
      </div>

      {/* Widgets statistiques */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {statCards.map((card, index) => (
          <motion.div 
            key={index} 
            variants={item}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="group relative min-w-[200px] hover:shadow-lg transition-all duration-300"
          >
            <Card className={`overflow-hidden shadow-sm border-none ${card.bgColor} hover:bg-opacity-90 transition-all duration-300`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <motion.div 
                  className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </motion.div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {card.content}
              </CardContent>
          </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Vue actuelle */}
      <motion.div 
        className="min-h-[500px] bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {view === "list" ? (
          <VisitsTabs />
        ) : (
          <VisitCalendar />
        )}
      </motion.div>
    </div>
  );
}