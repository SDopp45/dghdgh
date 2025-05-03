import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from 'wouter';
import { 
  ChevronLeft, 
  ChevronRight, 
  Building2, 
  CalendarRange, 
  Users, 
  Star, 
  Wrench, 
  Wallet, 
  FileText, 
  Library,
  TrendingUp, 
  ArrowRight, 
  CheckCircle,
  Clock4,
  Mail,
  Settings,
  LayoutDashboard,
  BarChart3,
  PieChart,
  ListFilter,
  LineChart,
  BarChart,
  Home,
  AlertTriangle,
  Calendar,
  UserPlus,
  Tag,
  ReceiptText,
  HandCoins,
  ArrowUpDown,
  ScrollText,
  MinusCircle,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Scale,
  Clock,
  XCircle,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useProperties } from "@/api/properties";
import { usePropertyAnalytics } from "@/api/analytics";
import { useQuery, useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { format, isAfter, parseISO, isToday, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import { Visit } from "@/types/visits";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreditWidget } from "./CreditWidget";
import { PendingCreditsWidgetBlue } from "@/components/dashboard/widgets/PendingCreditsWidgetBlue";
import { LeaseEndWidget } from "@/components/dashboard/widgets/LeaseEndWidget";
import { FormResponsesWidget } from "@/components/dashboard/widgets/FormResponsesWidget";

interface DashboardWidgetScrollerProps {
  className?: string;
}

interface SectionWidgets {
  sectionTitle: string;
  sectionIcon: React.ReactNode;
  path: string;
  color: string;
  bgClass: string;
  widgets: {
    title: string;
    icon: React.ReactNode;
    description: string;
    value?: string | number;
    trend?: 'up' | 'down' | 'neutral';
    change?: number;
    colors?: {
      primary?: string;
      background?: string;
      text?: string;
    };
  }[];
}

export function DashboardWidgetScroller({ className }: DashboardWidgetScrollerProps) {
  const queryClient = useQueryClient();
  const [currentSection, setCurrentSection] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const visitsScrollRef = useRef<HTMLDivElement>(null);
  const [currentVisitIndex, setCurrentVisitIndex] = useState(0);
  const [currentTransactionIndex, setCurrentTransactionIndex] = useState(0);
  const [rentFilterMode, setRentFilterMode] = useState<'today' | 'week' | 'all'>('week');
  const [visitFilterMode, setVisitFilterMode] = useState<'today' | 'week' | 'all'>('week');
  const [, navigate] = useLocation();
  const [transactionToUpdate, setTransactionToUpdate] = useState<{ id: number; status: string } | null>(null);
  const [visitToUpdate, setVisitToUpdate] = useState<{ id: number; status: string } | null>(null);

  // Récupération des données réelles
  const { data: properties = [], isLoading: isLoadingProperties } = useProperties();
  const { data: propertyAnalytics = [], isLoading: isLoadingPropertyAnalytics } = usePropertyAnalytics();
  const { data: tenants = [], isLoading: isLoadingTenants } = useQuery<any[]>({
    queryKey: ["/api/tenants"],
  });
  const { data: visits = [], isLoading: isLoadingVisits } = useQuery<Visit[]>({
    queryKey: ["/api/visits"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  const { data: maintenance = [], isLoading: isLoadingMaintenance } = useQuery<any[]>({
    queryKey: ["/api/maintenance"],
  });
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<{ data: any[], meta: any }, Error, any[]>({
    queryKey: ["/api/transactions"],
    select: (response) => {
      if (!response || !response.data || !Array.isArray(response.data)) {
        return [];
      }
      return response.data;
    },
    queryFn: async () => {
      const response = await fetch('/api/transactions');
      if (!response.ok) throw new Error('Erreur lors de la récupération des transactions');
      return response.json();
    }
  });

  // Calcul des statistiques pour le dashboard
  const totalProperties = properties.length;
  const totalValue = properties.reduce((sum, p) => sum + Number(p.purchasePrice), 0);
  const monthlyRevenue = properties.reduce((sum, p) => sum + Number(p.monthlyRent), 0);
  const monthlyExpenses = properties.reduce((sum, p) => sum + Number(p.monthlyExpenses), 0);
  const monthlyBalance = monthlyRevenue - monthlyExpenses;
  const monthlyBalanceChange = Math.abs(monthlyBalance - (monthlyRevenue - monthlyExpenses));
  const occupancyRate = properties.length > 0 
    ? (properties.filter(p => p.status === 'rented').length / properties.length) * 100 
    : 0;
  const previousOccupancyRate = occupancyRate - 2; // Pour la démonstration
  const occupancyTrend = occupancyRate > previousOccupancyRate ? 'up' : 'down';
  const occupancyChange = Math.abs(occupancyRate - previousOccupancyRate);

  // Calcul des statistiques pour les propriétés
  const rentedProperties = properties.filter(p => p.status === 'rented').length;
  const vacantProperties = properties.filter(p => p.status === 'vacant').length;
  const averageROI = propertyAnalytics.length > 0
    ? propertyAnalytics.reduce((sum, p) => sum + p.roi, 0) / propertyAnalytics.length
    : 0;

  // Calcul des statistiques pour les visites
  const upcomingVisits = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Filtrer les visites non archivées et en attente
    let filteredVisits = visits.filter(visit => !visit.archived && visit.status === 'pending');
    
    // Appliquer le filtre selon le mode
    switch (visitFilterMode) {
      case 'today':
        filteredVisits = filteredVisits.filter(visit => {
          const visitDate = parseISO(visit.datetime);
          return isToday(visitDate);
        });
        break;
      case 'week':
        filteredVisits = filteredVisits.filter(visit => {
          const visitDate = parseISO(visit.datetime);
          return (isAfter(visitDate, today) || isToday(visitDate)) && isBefore(visitDate, nextWeek);
        });
        break;
      case 'all':
        // Pas de filtre supplémentaire
        break;
    }
    
    // Trier les visites : d'abord celles d'aujourd'hui, puis par date
    return filteredVisits.sort((a, b) => {
      const dateA = parseISO(a.datetime);
      const dateB = parseISO(b.datetime);
      
      // Prioriser les visites du jour
      const aTodayStatus = isToday(dateA) ? 0 : 1;
      const bTodayStatus = isToday(dateB) ? 0 : 1;
      
      if (aTodayStatus !== bTodayStatus) {
        return aTodayStatus - bTodayStatus;
      }
      
      // Trier par date/heure
      return dateA.getTime() - dateB.getTime();
    }).slice(0, 5); // Limiter à 5 visites
  }, [visits, visitFilterMode]);

  // Calcul du nombre de visites en attente selon le filtre
  const pendingVisits = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Filtrer les visites non archivées et en attente
    let filteredVisits = visits.filter(visit => !visit.archived && visit.status === 'pending');
    
    // Appliquer le filtre selon le mode
    switch (visitFilterMode) {
      case 'today':
        filteredVisits = filteredVisits.filter(visit => {
          const visitDate = parseISO(visit.datetime);
          return isToday(visitDate);
        });
        break;
      case 'week':
        filteredVisits = filteredVisits.filter(visit => {
          const visitDate = parseISO(visit.datetime);
          return (isAfter(visitDate, today) || isToday(visitDate)) && isBefore(visitDate, nextWeek);
        });
        break;
      case 'all':
        // Pas de filtre supplémentaire
        break;
    }
    
    return filteredVisits.length;
  }, [visits, visitFilterMode]);

  const conversionRate = visits.length > 0
    ? (visits.filter(v => v.status === 'completed').length / visits.length) * 100
    : 0;

  // Calcul des statistiques pour les locataires
  const activeTenants = tenants.filter(t => t.active).length;
  const onTimePayments = tenants.filter(t => t.paymentStatus === 'on_time').length;
  const newTenants = tenants.filter(t => {
    const leaseStart = new Date(t.leaseStartDate);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return leaseStart > monthAgo;
  }).length;
  const endingLeases = tenants.filter(t => {
    const leaseEnd = new Date(t.leaseEndDate);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return leaseEnd <= threeMonthsFromNow && t.active;
  }).length;

  // Calcul des statistiques pour les finances
  const completedTransactions = transactions.filter(t => t.status === 'completed');
  const totalCredits = completedTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpenses = completedTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalRevenues = completedTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = totalRevenues - (totalExpenses + totalCredits);
  
  const balanceTrend = balance > 0 ? 'up' : 'down';
  const balanceChange = totalRevenues > 0 ? Math.abs((balance / totalRevenues) * 100) : 0;

  // Calcul des statistiques pour le dashboard
  const stats = useMemo(() => {
    if (isLoadingProperties || isLoadingTransactions || isLoadingMaintenance) {
      return {
        totalProperties: 0,
        vacantProperties: 0,
        totalMaintenance: 0,
        urgentMaintenance: 0,
        monthlyRevenue: 0,
        monthlyExpenses: 0,
        balance: 0
      };
    }

    const totalProperties = properties.length;
    const vacantProperties = properties.filter(p => p.status === 'vacant').length;
    
    const totalMaintenance = maintenance.length;
    const urgentMaintenance = maintenance.filter(m => m.priority === 'high').length;
    
    const monthlyRevenue = properties.reduce((sum, p) => sum + Number(p.monthlyRent), 0);
    const monthlyExpenses = properties.reduce((sum, p) => sum + Number(p.monthlyExpenses), 0);
    
    const balance = monthlyRevenue - monthlyExpenses;

    return {
      totalProperties,
      vacantProperties,
      totalMaintenance,
      urgentMaintenance,
      monthlyRevenue,
      monthlyExpenses,
      balance
    };
  }, [properties, maintenance, isLoadingProperties, isLoadingTransactions, isLoadingMaintenance]);

  // Définition des widgets principaux pour chaque section
  const sections: SectionWidgets[] = [
    {
      sectionTitle: "Propriétés",
      sectionIcon: <Building2 className="h-5 w-5" />,
      path: "/properties",
      color: "text-green-500",
      bgClass: "bg-green-50 dark:bg-green-950/10",
      widgets: [
        {
          title: "Total propriétés",
          icon: <Home className="h-5 w-5" />,
          description: "Nombre total de biens",
          value: stats.totalProperties,
          trend: 'up',
          change: 2,
          colors: {
            primary: '#10b981',
            background: '#064e3b',
            text: '#ffffff'
          }
        },
        {
          title: "Biens vacants",
          icon: <Building2 className="h-5 w-5" />,
          description: "Propriétés disponibles",
          value: stats.vacantProperties,
          trend: stats.vacantProperties > 0 ? 'down' : 'up',
          change: Math.abs(stats.vacantProperties),
          colors: {
            primary: '#10b981',
            background: '#064e3b',
            text: '#ffffff'
          }
        },
        {
          title: "Valeur estimée",
          icon: <HandCoins className="h-5 w-5" />,
          description: "Valorisation du portefeuille",
          value: formatCurrency(totalValue),
          trend: 'up',
          change: 5.2,
          colors: {
            primary: '#10b981',
            background: '#064e3b',
            text: '#ffffff'
          }
        },
        {
          title: "ROI moyen",
          icon: <BarChart className="h-5 w-5" />,
          description: "Retour sur investissement",
          value: `${averageROI.toFixed(1)}%`,
          trend: 'up',
          change: 0.5,
          colors: {
            primary: '#10b981',
            background: '#064e3b',
            text: '#ffffff'
          }
        }
      ]
    },
    {
      sectionTitle: "Visites",
      sectionIcon: <CalendarRange className="h-5 w-5" />,
      path: "/visits",
      color: "text-purple-500",
      bgClass: "bg-purple-50 dark:bg-purple-950/10",
      widgets: [
        {
          title: "Visites à venir",
          icon: <Calendar className="h-5 w-5" />,
          description: "Prochains rendez-vous",
          value: upcomingVisits.length,
          trend: 'up',
          change: 2,
          colors: {
            primary: '#8b5cf6',
            background: '#2e1065',
            text: '#ffffff'
          }
        },
        {
          title: "En attente",
          icon: <Clock4 className="h-5 w-5" />,
          description: "Demandes non confirmées",
          value: pendingVisits,
          trend: 'down',
          change: 1,
          colors: {
            primary: '#8b5cf6',
            background: '#2e1065',
            text: '#ffffff'
          }
        },
        {
          title: "Conversion",
          icon: <TrendingUp className="h-5 w-5" />,
          description: "Taux de signature",
          value: `${conversionRate.toFixed(0)}%`,
          trend: 'up',
          change: 3,
          colors: {
            primary: '#8b5cf6',
            background: '#2e1065',
            text: '#ffffff'
          }
        },
        {
          title: "Dernière semaine",
          icon: <ListFilter className="h-5 w-5" />,
          description: "Activité récente",
          value: visits.filter(v => {
            const visitDate = new Date(v.datetime);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return visitDate > weekAgo;
          }).length,
          trend: 'up',
          change: 4,
          colors: {
            primary: '#8b5cf6',
            background: '#2e1065',
            text: '#ffffff'
          }
        }
      ]
    },
    {
      sectionTitle: "Locataires",
      sectionIcon: <Users className="h-5 w-5" />,
      path: "/tenants",
      color: "text-orange-500",
      bgClass: "bg-orange-50 dark:bg-orange-950/10",
      widgets: [
        {
          title: "Total locataires",
          icon: <Users className="h-5 w-5" />,
          description: "Nombre de locataires actifs",
          value: activeTenants,
          trend: 'up',
          change: 2,
          colors: {
            primary: '#f97316',
            background: '#7c2d12',
            text: '#ffffff'
          }
        },
        {
          title: "Paiements à jour",
          icon: <CheckCircle className="h-5 w-5" />,
          description: "Loyers payés à temps",
          value: `${((onTimePayments / activeTenants) * 100).toFixed(0)}%`,
          trend: 'up',
          change: 3,
          colors: {
            primary: '#f97316',
            background: '#7c2d12',
            text: '#ffffff'
          }
        },
        {
          title: "Nouveaux",
          icon: <UserPlus className="h-5 w-5" />,
          description: "Nouveaux locataires ce mois",
          value: newTenants,
          trend: 'up',
          change: 1,
          colors: {
            primary: '#f97316',
            background: '#7c2d12',
            text: '#ffffff'
          }
        },
        {
          title: "Fin de bail",
          icon: <AlertTriangle className="h-5 w-5" />,
          description: "Contrats arrivant à terme",
          value: endingLeases,
          trend: 'neutral',
          change: 0,
          colors: {
            primary: '#f97316',
            background: '#7c2d12',
            text: '#ffffff'
          }
        }
      ]
    },
    {
      sectionTitle: "Maintenance",
      sectionIcon: <Wrench className="h-5 w-5" />,
      path: "/maintenance",
      color: "text-red-500",
      bgClass: "bg-red-50 dark:bg-red-950/10",
      widgets: [
        {
          title: "Tâches totales",
          icon: <Wrench className="h-5 w-5" />,
          description: "Nombre total de tâches",
          value: stats.totalMaintenance,
          trend: 'neutral',
          change: 0,
          colors: {
            primary: '#ef4444',
            background: '#7f1d1d',
            text: '#ffffff'
          }
        },
        {
          title: "Urgentes",
          icon: <AlertTriangle className="h-5 w-5" />,
          description: "Tâches prioritaires",
          value: stats.urgentMaintenance,
          trend: stats.urgentMaintenance > 0 ? 'down' : 'up',
          change: Math.abs(stats.urgentMaintenance),
          colors: {
            primary: '#ef4444',
            background: '#7f1d1d',
            text: '#ffffff'
          }
        },
        {
          title: "Planifiées",
          icon: <Calendar className="h-5 w-5" />,
          description: "Interventions à venir",
          value: maintenance.filter(m => m.status === 'scheduled').length,
          trend: 'up',
          change: 1,
          colors: {
            primary: '#ef4444',
            background: '#7f1d1d',
            text: '#ffffff'
          }
        },
        {
          title: "Coûts mensuels",
          icon: <Wallet className="h-5 w-5" />,
          description: "Dépenses maintenance",
          value: formatCurrency(maintenance.reduce((sum, m) => sum + Number(m.cost), 0)),
          trend: 'down',
          change: 8,
          colors: {
            primary: '#ef4444',
            background: '#7f1d1d',
            text: '#ffffff'
          }
        }
      ]
    },
    {
      sectionTitle: "Finances",
      sectionIcon: <Wallet className="h-5 w-5" />,
      path: "/finance",
      color: "text-blue-500",
      bgClass: "bg-blue-50 dark:bg-blue-950/10",
      widgets: [
        {
          title: "Revenus mensuels",
          icon: <ArrowUpRight className="h-5 w-5" />,
          description: "Total des revenus",
          value: formatCurrency(stats.monthlyRevenue),
          trend: 'up',
          change: 5,
          colors: {
            primary: '#3b82f6',
            background: '#1e3a8a',
            text: '#ffffff'
          }
        },
        {
          title: "Dépenses mensuelles",
          icon: <ArrowDownRight className="h-5 w-5" />,
          description: "Total des dépenses",
          value: formatCurrency(stats.monthlyExpenses),
          trend: 'down',
          change: 1.2,
          colors: {
            primary: '#3b82f6',
            background: '#1e3a8a',
            text: '#ffffff'
          }
        },
        {
          title: "Crédits en cours",
          icon: <CreditCard className="h-5 w-5" />,
          description: "Total des crédits",
          value: formatCurrency(totalCredits),
          trend: 'up',
          change: 0.8,
          colors: {
            primary: '#3b82f6',
            background: '#1e3a8a',
            text: '#ffffff'
          }
        },
        {
          title: "Balance",
          icon: <Scale className="h-5 w-5" />,
          description: "Solde mensuel",
          value: formatCurrency(stats.balance),
          trend: stats.balance >= 0 ? 'up' : 'down',
          change: Math.abs(stats.balance),
          colors: {
            primary: '#3b82f6',
            background: '#1e3a8a',
            text: '#ffffff'
          }
        }
      ]
    }
  ];

  // Créer un tableau plat de tous les widgets pour le défilement infini
  const allWidgets = sections.flatMap((section, sectionIndex) => 
    section.widgets.map(widget => ({
      ...widget,
      sectionIndex,
      sectionTitle: section.sectionTitle,
      sectionIcon: section.sectionIcon,
      path: section.path,
      color: section.color,
      bgClass: section.bgClass
    }))
  );

  // Dupliquer les widgets pour créer un défilement infini
  const duplicatedWidgets = [...allWidgets, ...allWidgets, ...allWidgets];

  // Fonction pour faire défiler vers la gauche
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  // Fonction pour faire défiler vers la droite
  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  // Fonction pour détecter la section actuelle en fonction du défilement
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    const containerWidth = scrollContainerRef.current.clientWidth;
    const scrollWidth = scrollContainerRef.current.scrollWidth;
    
    // Calculer la position relative (0 à 1)
    // Utiliser une approche plus robuste pour calculer la position relative
    const maxScroll = scrollWidth - containerWidth;
    const relativePosition = maxScroll > 0 ? scrollLeft / maxScroll : 0;
    
    // Calculer l'index de section en fonction de la position
    const sectionCount = sections.length;
    const newSectionIndex = Math.min(
      Math.floor(relativePosition * sectionCount),
      sectionCount - 1
    );
    
    if (newSectionIndex !== currentSection) {
      setCurrentSection(newSectionIndex);
    }
  };

  // Ajouter l'écouteur d'événements de défilement
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Fonction pour gérer le défilement infini
  const handleInfiniteScroll = () => {
    // Désactiver complètement cette fonction pour éviter tout défilement automatique
    return;
  };

  // Ajouter l'écouteur d'événements pour le défilement infini
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleInfiniteScroll);
      return () => container.removeEventListener('scroll', handleInfiniteScroll);
    }
  }, []);

  // Initialiser le défilement au milieu
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollWidth = container.scrollWidth;
      container.scrollTo({ 
        left: scrollWidth / 3, 
        behavior: 'auto' 
      });
    }
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const styles = `
    @keyframes scroll {
      0% {
        transform: translateX(0);
      }
      100% {
        transform: translateX(calc(-250px * ${allWidgets.length}));
      }
    }

    .animate-scroll {
      will-change: transform;
    }

    .animate-scroll:hover {
      animation-play-state: paused;
    }
  `;

  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Fonction pour faire défiler les visites
  const scrollVisits = (direction: 'left' | 'right') => {
    if (upcomingVisits.length <= 1) return;
    
    if (direction === 'left') {
      setCurrentVisitIndex(prev => (prev > 0 ? prev - 1 : upcomingVisits.length - 1));
    } else {
      setCurrentVisitIndex(prev => (prev < upcomingVisits.length - 1 ? prev + 1 : 0));
    }
  };

  // Fonction pour faire défiler les transactions
  const scrollTransactions = (direction: 'left' | 'right') => {
    const pendingTransactions = getPendingRents();
    if (pendingTransactions.length <= 1) return;
    
    if (direction === 'left') {
      setCurrentTransactionIndex(prev => (prev > 0 ? prev - 1 : pendingTransactions.length - 1));
    } else {
      setCurrentTransactionIndex(prev => (prev < pendingTransactions.length - 1 ? prev + 1 : 0));
    }
  };

  // Fonction pour récupérer les loyers en attente
  const getPendingRents = () => {
    // Filtrer d'abord toutes les transactions de type loyer en attente
    const allPendingRents = transactions.filter(t => {
      return t.status === 'pending' && t.category === 'rent';
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Appliquer les filtres selon le mode
    switch (rentFilterMode) {
      case 'today':
        // Uniquement les loyers dus aujourd'hui
        return allPendingRents.filter(t => {
          if (!t.date) return false; // Ne pas inclure ceux sans date
          const dueDate = parseISO(t.date);
          return isToday(dueDate);
        });
      
      case 'week':
        // Loyers des 7 prochains jours
        return allPendingRents.filter(t => {
          if (!t.date) return false; // Ne pas inclure ceux sans date
          const dueDate = parseISO(t.date);
          return isAfter(dueDate, today) || isToday(dueDate);
        });
      
      case 'all':
      default:
        // Tous les loyers en attente
        return allPendingRents;
    }
  };

  // Fonction pour compter les loyers urgents (dus aujourd'hui ou en retard)
  const getUrgentRentsCount = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Compter tous les loyers en attente dus aujourd'hui ou en retard
    return transactions.filter(t => {
      if (t.status !== 'pending' || t.category !== 'rent') return false;
      
      // Si pas de date d'échéance, considérer comme urgent
      if (!t.date) return true;
      
      const dueDate = parseISO(t.date);
      
      // En retard ou aujourd'hui
      return !isAfter(dueDate, today);
    }).length;
  };

  // Mutation pour mettre à jour le statut d'une visite
  const updateVisitStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/visits/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du statut');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      setVisitToUpdate(null);
    },
    onError: (error) => {
      console.error('Erreur lors de la mise à jour:', error);
      setVisitToUpdate(null);
    }
  });

  // Mutation pour mettre à jour le statut d'une transaction
  const updateTransactionStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du statut');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setTransactionToUpdate(null);
    },
    onError: (error) => {
      console.error('Erreur lors de la mise à jour:', error);
      setTransactionToUpdate(null);
    }
  });

  return (
    <div className="space-y-4">
      <Card className={cn(
        "w-full h-[185px]",
        "bg-transparent border-none shadow-none",
        "relative overflow-hidden",
        className
      )}>
        <div className="flex items-center justify-end mb-2 px-4 pt-3 relative z-10">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                scrollLeft();
                setIsAutoPlaying(false);
              }}
              className="h-7 w-7 hover:bg-accent/50 rounded-full transition-all duration-300 hover:scale-110"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                scrollRight();
                setIsAutoPlaying(false);
              }}
              className="h-7 w-7 hover:bg-accent/50 rounded-full transition-all duration-300 hover:scale-110"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto pb-2 w-full px-4 relative z-10 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
        >
          <div 
            className="flex gap-3 w-max"
            style={{
              animation: isAutoPlaying ? 'scroll 120s linear infinite' : 'none',
              animationPlayState: isAutoPlaying ? 'running' : 'paused',
            }}
          >
            {duplicatedWidgets.map((widget, index) => (
              <motion.div
                key={`${widget.title}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 100,
                  damping: 15
                }}
                className="h-[110px] w-[250px] cursor-pointer group flex-shrink-0"
                onClick={() => handleNavigate(widget.path)}
              >
                <Card className={cn(
                  "h-full transition-all duration-500 hover:shadow-xl hover:scale-105 overflow-hidden relative",
                  "border-t-2 border-t-primary/30",
                  "hover:border-primary/50",
                  "bg-gradient-to-br from-background/90 to-background/50",
                  "backdrop-blur-sm",
                  "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:to-transparent before:opacity-50",
                  "after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.05),rgba(255,255,255,0))]"
                )}>
                  <div className={cn(
                    "absolute inset-0 w-[5px] h-full",
                    widget.trend === 'up' ? "bg-gradient-to-b from-green-500/70 to-green-500/30" : 
                    widget.trend === 'down' ? "bg-gradient-to-b from-red-500/70 to-red-500/30" : 
                    "bg-gradient-to-b from-slate-500/70 to-slate-500/30"
                  )} />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2 pl-4 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "p-1 rounded-full bg-background/80 shadow-md backdrop-blur-sm",
                        "border border-border/20",
                        "transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                        widget.color
                      )}>
                        {widget.sectionIcon}
                      </div>
                      <CardTitle className="text-xs font-medium truncate max-w-[110px]">{widget.title}</CardTitle>
                    </div>
                    <div className={cn(
                      "p-1.5 rounded-full bg-background/80 shadow-md backdrop-blur-sm",
                      "border border-border/20",
                      "transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                      widget.color
                    )}>
                      {widget.icon}
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 pt-0 pl-4 relative z-10">
                    <div 
                      className={cn(
                        "text-lg font-bold",
                        "transition-all duration-300 group-hover:scale-105",
                        widget.trend === 'up' && "text-green-500",
                        widget.trend === 'down' && "text-red-500",
                        widget.trend === 'neutral' && "text-slate-500"
                      )}
                    >
                      {widget.value}
                    </div>
                    {widget.change !== undefined && (
                      <div className="mt-1 flex items-center gap-1">
                        <span className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded-sm",
                          "transition-all duration-300 group-hover:scale-105",
                          widget.trend === 'up' && "bg-green-500/10 text-green-500",
                          widget.trend === 'down' && "bg-red-500/10 text-red-500",
                          widget.trend === 'neutral' && "bg-slate-500/10 text-muted-foreground"
                        )}>
                          {widget.change > 0 ? '+' : ''}{widget.change}%
                          {widget.trend === 'up' && <TrendingUp className="inline h-2.5 w-2.5 ml-0.5" />}
                          {widget.trend === 'down' && <TrendingUp className="inline h-2.5 w-2.5 ml-0.5 rotate-180" />}
                          {widget.trend === 'neutral' && <MinusCircle className="inline h-2.5 w-2.5 ml-0.5" />}
                        </span>
                      </div>
                    )}
                  </CardContent>
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </Card>

      {/* Widget des visites à venir avec système de défilement */}
      <div className="flex gap-4">
        <Card className="w-1/2 h-[140px] bg-gradient-to-br from-background/90 to-background/50 backdrop-blur-sm border-t-2 border-t-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 w-[5px] h-full bg-gradient-to-b from-purple-500/70 to-purple-500/30" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2 pl-4 relative z-10">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-full bg-background/80 shadow-md backdrop-blur-sm border border-border/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 text-purple-500">
              <Calendar className="h-4 w-4" />
            </div>
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                <span>Visites à venir{visitFilterMode === 'today' ? " (aujourd'hui)" : visitFilterMode === 'week' ? " (7j)" : ""}</span>
                {pendingVisits > 0 && (
                  <div className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 ml-2">
                    {pendingVisits} en attente
                  </div>
                )}
              </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-7 w-7 hover:bg-accent/50 rounded-full transition-all duration-300 hover:scale-110"
              onClick={() => scrollVisits('left')}
              disabled={upcomingVisits.length <= 1}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-7 w-7 hover:bg-accent/50 rounded-full transition-all duration-300 hover:scale-110"
              onClick={() => scrollVisits('right')}
              disabled={upcomingVisits.length <= 1}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-7 text-xs ${visitFilterMode === 'today' ? 'text-red-500' : 'text-muted-foreground'}`}
                onClick={() => {
                  setVisitFilterMode(visitFilterMode === 'today' ? 'week' : 'today');
                  setCurrentVisitIndex(0);
                }}
                title={visitFilterMode === 'today' ? "Afficher les visites des 7 prochains jours" : "Afficher uniquement les visites d'aujourd'hui"}
              >
                Auj.
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-7 text-xs ${visitFilterMode === 'week' ? 'text-blue-500' : 'text-muted-foreground'}`}
                onClick={() => {
                  setVisitFilterMode(visitFilterMode === 'week' ? 'all' : 'week');
                  setCurrentVisitIndex(0);
                }}
                title={visitFilterMode === 'week' ? "Afficher toutes les visites" : "Afficher les visites des 7 prochains jours"}
              >
                7j
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-7 text-xs ${visitFilterMode === 'all' ? 'text-green-500' : 'text-muted-foreground'}`}
                onClick={() => {
                  setVisitFilterMode(visitFilterMode === 'all' ? 'week' : 'all');
                  setCurrentVisitIndex(0);
                }}
                title={visitFilterMode === 'all' ? "Afficher les visites des 7 prochains jours" : "Afficher toutes les visites"}
              >
                Tous
              </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => handleNavigate(`/visits?filter=${visitFilterMode}`)}
            >
              Voir tout
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-2 pt-0 pl-4 relative z-10">
          <div className="space-y-2">
            {upcomingVisits.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentVisitIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                    className="relative"
                >
                    <div className="flex items-center justify-between">
                      {/* Colonne de gauche: Informations sur la propriété */}
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-full bg-background/80 shadow-sm border border-border/20">
                      <Building2 className="h-3 w-3 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">
                        {upcomingVisits[currentVisitIndex].property?.name || 
                         upcomingVisits[currentVisitIndex].manualAddress || 
                         "Propriété non spécifiée"}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                              {isToday(parseISO(upcomingVisits[currentVisitIndex].datetime)) ? 
                                `Aujourd'hui à ${format(parseISO(upcomingVisits[currentVisitIndex].datetime), "HH:mm", { locale: fr })}` : 
                                format(parseISO(upcomingVisits[currentVisitIndex].datetime), "EEEE d MMMM, HH:mm", { locale: fr })}
                        </span>
                      </p>
                    </div>
                  </div>

                      {/* Colonne de droite: Statut et actions */}
                      <div className="flex flex-col items-end gap-1">
                        {/* Ligne 1: Statut et informations visiteur */}
                        <div className="flex items-center gap-2">
                          <div className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            upcomingVisits[currentVisitIndex].status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 
                            upcomingVisits[currentVisitIndex].status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 
                            upcomingVisits[currentVisitIndex].status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 
                            'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          }`}>
                            {upcomingVisits[currentVisitIndex].status === 'pending' ? 'En attente' : 
                             upcomingVisits[currentVisitIndex].status === 'completed' ? 'Complétée' : 
                             upcomingVisits[currentVisitIndex].status === 'cancelled' ? 'Annulée' : 'Absente'}
                          </div>
                          <div className="text-xs flex items-center gap-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                            <span>
                      {upcomingVisits[currentVisitIndex].firstName} {upcomingVisits[currentVisitIndex].lastName}
                    </span>
                          </div>
                        </div>
                        
                        {/* Ligne 2: Boutons d'action */}
                        <div className="flex items-center gap-1 mb-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-full" 
                            title="Marquer comme terminée"
                            onClick={() => setVisitToUpdate({ id: upcomingVisits[currentVisitIndex].id, status: 'completed' })}
                          >
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full" 
                            title="Marquer comme absente"
                            onClick={() => setVisitToUpdate({ id: upcomingVisits[currentVisitIndex].id, status: 'absent' })}
                          >
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full" 
                            title="Annuler la visite"
                            onClick={() => setVisitToUpdate({ id: upcomingVisits[currentVisitIndex].id, status: 'cancelled' })}
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex items-center justify-center h-10">
                <p className="text-xs text-muted-foreground">Aucune visite à venir</p>
              </div>
            )}
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </Card>

        {/* Widget Fin de baux */}
        <LeaseEndWidget />
      </div>

      {/* Nouvelle rangée pour les widgets financiers */}
      <div className="flex gap-4 mt-4">
        {/* Widget des loyers en attente */}
        <Card className="w-1/2 h-[140px] bg-gradient-to-br from-background/90 to-background/50 backdrop-blur-sm border-t-2 border-t-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg overflow-hidden relative">
          <div className="absolute inset-0 w-[5px] h-full bg-gradient-to-b from-blue-500/70 to-blue-500/30" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2 pl-4 relative z-10">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-full bg-background/80 shadow-md backdrop-blur-sm border border-border/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 text-blue-500">
                <Wallet className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                <span>Loyers à encaisser{rentFilterMode === 'today' ? " (aujourd'hui)" : rentFilterMode === 'week' ? " (7j)" : ""}</span>
                {getPendingRents().length > 0 && (
                  <div className="flex items-center gap-1 ml-2">
                    <div className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                      {getPendingRents().length} en attente
                    </div>
                    {getUrgentRentsCount() > 0 && (
                      <div className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                        {getUrgentRentsCount()} urgent{getUrgentRentsCount() > 1 ? 's' : ''}
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
                onClick={() => scrollTransactions('left')}
                disabled={getPendingRents().length <= 1}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-7 w-7 hover:bg-accent/50 rounded-full transition-all duration-300 hover:scale-110"
                onClick={() => scrollTransactions('right')}
                disabled={getPendingRents().length <= 1}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-7 text-xs ${rentFilterMode === 'today' ? 'text-red-500' : 'text-muted-foreground'}`}
                onClick={() => {
                  setRentFilterMode(rentFilterMode === 'today' ? 'week' : 'today');
                  setCurrentTransactionIndex(0);
                }}
                title={rentFilterMode === 'today' ? "Afficher les loyers des 7 prochains jours" : "Afficher uniquement les loyers d'aujourd'hui"}
              >
                Auj.
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-7 text-xs ${rentFilterMode === 'week' ? 'text-blue-500' : 'text-muted-foreground'}`}
                onClick={() => {
                  setRentFilterMode(rentFilterMode === 'week' ? 'all' : 'week');
                  setCurrentTransactionIndex(0);
                }}
                title={rentFilterMode === 'week' ? "Afficher tous les loyers" : "Afficher les loyers des 7 prochains jours"}
              >
                7j
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-7 text-xs ${rentFilterMode === 'all' ? 'text-green-500' : 'text-muted-foreground'}`}
                onClick={() => {
                  setRentFilterMode(rentFilterMode === 'all' ? 'week' : 'all');
                  setCurrentTransactionIndex(0);
                }}
                title={rentFilterMode === 'all' ? "Afficher les loyers des 7 prochains jours" : "Afficher tous les loyers"}
              >
                Tous
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => handleNavigate("/finance")}
              >
                Voir tout
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-2 pt-0 pl-4 relative z-10">
            <div className="space-y-2">
              {getPendingRents().length > 0 ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTransactionIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="relative"
                  >
                    {(() => {
                      const pendingTransactions = getPendingRents();
                      const transaction = pendingTransactions[currentTransactionIndex];
                      
                      return (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-full bg-background/80 shadow-sm border border-border/20">
                              <Home className="h-3 w-3 text-blue-500" />
                            </div>
                            <div>
                              <p className="text-xs font-medium">
                                {transaction.property?.name || transaction.description || "Loyer"}
                              </p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />
                                <span>{transaction.tenant?.fullName || "Locataire"}</span>
                              </p>
                              {transaction.description && (
                                <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                                  {transaction.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="text-xs font-medium text-blue-500">
                              {formatCurrency(transaction.amount)}
                            </div>
                            {/* Informations complémentaires */}
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              {transaction.date && (
                                <span>
                                  Date: {format(parseISO(transaction.date), "d MMM yyyy", { locale: fr })}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              {transaction.date ? (
                                <>
                                  {(() => {
                                    const dueDate = parseISO(transaction.date);
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    
                                    // Déterminer la couleur de l'indicateur
                                    let indicatorColor = "bg-orange-500"; // Par défaut pour les échéances futures
                                    let statusText = format(dueDate, "d MMMM yyyy", { locale: fr });
                                    
                                    if (isToday(dueDate)) {
                                      indicatorColor = "bg-amber-500"; // Jaune pour aujourd'hui
                                      statusText = "Aujourd'hui";
                                    } else if (!isAfter(dueDate, today)) {
                                      indicatorColor = "bg-red-500"; // Rouge pour en retard
                                      statusText = `En retard (${format(dueDate, "d MMM", { locale: fr })})`;
                                    }
                                    
                                    return (
                                      <>
                                        <div className={`w-2 h-2 rounded-full ${indicatorColor}`} />
                                        <span>Échéance: {statusText}</span>
                                      </>
                                    );
                                  })()}
                                </>
                              ) : (
                                <>
                                  <div className="w-2 h-2 rounded-full bg-red-500" />
                                  <span>Échéance non spécifiée</span>
                                </>
                              )}
                            </div>
                            {/* Boutons d'action */}
                            <div className="flex items-center gap-1 mt-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-full" 
                                title="Marquer comme complétée"
                                onClick={() => setTransactionToUpdate({ id: transaction.id, status: 'completed' })}
                              >
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full" 
                                title="Marquer comme annulée"
                                onClick={() => setTransactionToUpdate({ id: transaction.id, status: 'cancelled' })}
                              >
                                <XCircle className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="flex items-center justify-center h-10">
                  <p className="text-xs text-muted-foreground">Aucun loyer en attente</p>
                </div>
              )}
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </Card>
        
        {/* Widget des crédits à payer */}
        <CreditWidget />
      </div>

      {/* Widget des réponses aux formulaires */}
      <div className="mt-4">
        <FormResponsesWidget />
      </div>

      {/* Dialogue de confirmation pour la mise à jour du statut */}
      <AlertDialog open={!!transactionToUpdate} onOpenChange={() => setTransactionToUpdate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {transactionToUpdate?.status === 'completed' ? 'Marquer comme complétée' : 'Marquer comme annulée'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir {transactionToUpdate?.status === 'completed' ? 'marquer cette transaction comme complétée' : 'annuler cette transaction'} ?
              Cette action ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (transactionToUpdate) {
                  updateTransactionStatus.mutate(transactionToUpdate);
                }
              }}
              className={transactionToUpdate?.status === 'completed' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogue de confirmation pour la mise à jour du statut d'une visite */}
      <AlertDialog open={!!visitToUpdate} onOpenChange={() => setVisitToUpdate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {visitToUpdate?.status === 'completed' ? 'Marquer comme terminée' : 
               visitToUpdate?.status === 'absent' ? 'Marquer comme absente' : 
               'Annuler la visite'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir {visitToUpdate?.status === 'completed' ? 'marquer cette visite comme terminée' : 
                                     visitToUpdate?.status === 'absent' ? 'marquer cette visite comme absente' : 
                                     'annuler cette visite'} ?
              Cette action ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (visitToUpdate) {
                  updateVisitStatus.mutate(visitToUpdate);
                }
              }}
              className={visitToUpdate?.status === 'completed' ? 'bg-green-600 hover:bg-green-700' : 
                        visitToUpdate?.status === 'absent' ? 'bg-red-600 hover:bg-red-700' : 
                        'bg-amber-600 hover:bg-amber-700'}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 