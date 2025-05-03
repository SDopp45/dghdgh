import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Brain, 
  BarChart3, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight, 
  ZoomIn, 
  ZoomOut, 
  MousePointer, 
  Move,
  CheckCircle,
  Clock4,
  Mail,
  MinusCircle,
  History as HistoryIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useProperties } from "@/api/properties";

interface WidgetScrollerProps {
  className?: string;
}

interface ScrollerSection {
  title: string;
  icon: React.ReactNode;
  widgets: {
    title: string;
    value: string | number;
    change?: number;
    trend?: 'up' | 'down' | 'neutral';
    icon?: React.ReactNode;
    color?: string;
  }[];
  color: string;
  bgClass: string;
}

export function WidgetScroller({ className }: WidgetScrollerProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Récupération des données des propriétés pour les widgets
  const { data: propertiesData } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      // Simulation de données pour l'exemple
      return {
        total: 24,
        rented: 22,
        vacant: 2,
        maintenance: {
          urgent: 3,
          scheduled: 8,
          completed: 45,
          efficiency: 92
        },
        financial: {
          monthlyRevenue: 12500,
          monthlyExpenses: 3200,
          balance: 9300,
          growth: 5.2
        }
      };
    }
  });

  // Données simulées pour les autres sections
  const sections: ScrollerSection[] = [
    {
      title: "Propriétés",
      icon: <Building2 className="h-4 w-4" />,
      color: "text-blue-500",
      bgClass: "bg-blue-50 dark:bg-blue-950/10",
      widgets: [
        { 
          title: "Patrimoine", 
          value: "2.5M€", 
          change: 5.2, 
          trend: 'up',
          icon: <TrendingUp className="h-4 w-4" />,
          color: "text-blue-500"
        },
        { 
          title: "Mensuel", 
          value: "12.5K€", 
          change: 3.1, 
          trend: 'up',
          icon: <Wallet className="h-4 w-4" />,
          color: "text-blue-500"
        },
        { 
          title: "Occupation", 
          value: propertiesData ? `${Math.round((propertiesData.rented / propertiesData.total) * 100)}%` : "92%", 
          change: -2, 
          trend: 'down',
          icon: <BarChart3 className="h-4 w-4" />,
          color: "text-blue-500"
        },
        { 
          title: "Inventaire", 
          value: propertiesData?.total || "24", 
          change: 2, 
          trend: 'up',
          icon: <Building2 className="h-4 w-4" />,
          color: "text-blue-500"
        }
      ]
    },
    {
      title: "Visites",
      icon: <CalendarRange className="h-4 w-4" />,
      color: "text-purple-500",
      bgClass: "bg-purple-50 dark:bg-purple-950/10",
      widgets: [
        { 
          title: "À venir", 
          value: "8", 
          change: 2, 
          trend: 'up',
          icon: <CalendarRange className="h-4 w-4" />,
          color: "text-purple-500"
        },
        { 
          title: "En attente", 
          value: "3", 
          change: -1, 
          trend: 'down',
          icon: <AlertTriangle className="h-4 w-4" />,
          color: "text-purple-500"
        },
        { 
          title: "Terminées", 
          value: "45", 
          change: 5, 
          trend: 'up',
          icon: <CheckCircle className="h-4 w-4" />,
          color: "text-purple-500"
        },
        { 
          title: "Taux de conversion", 
          value: "68%", 
          change: 3, 
          trend: 'up',
          icon: <TrendingUp className="h-4 w-4" />,
          color: "text-purple-500"
        }
      ]
    },
    {
      title: "Locataires",
      icon: <Users className="h-4 w-4" />,
      color: "text-green-500",
      bgClass: "bg-green-50 dark:bg-green-950/10",
      widgets: [
        { 
          title: "Tous locataires", 
          value: "18", 
          change: 2, 
          trend: 'up',
          icon: <Users className="h-4 w-4" />,
          color: "text-green-500"
        },
        { 
          title: "En cours", 
          value: "15", 
          change: 0, 
          trend: 'neutral',
          icon: <CheckCircle className="h-4 w-4" />,
          color: "text-green-500"
        },
        { 
          title: "Mensuel", 
          value: "8.2K€", 
          change: 4.5, 
          trend: 'up',
          icon: <Wallet className="h-4 w-4" />,
          color: "text-green-500"
        },
        { 
          title: "Loyer moyen", 
          value: "1.2K€", 
          change: 2.1, 
          trend: 'up',
          icon: <TrendingUp className="h-4 w-4" />,
          color: "text-green-500"
        }
      ]
    },
    {
      title: "Historique",
      icon: <Star className="h-4 w-4" />,
      color: "text-amber-500",
      bgClass: "bg-amber-50 dark:bg-amber-950/10",
      widgets: [
        { 
          title: "Tous", 
          value: "32", 
          change: 0, 
          trend: 'neutral',
          icon: <HistoryIcon className="h-4 w-4" />,
          color: "text-amber-500"
        },
        { 
          title: "Bien notés", 
          value: "24", 
          change: 3, 
          trend: 'up',
          icon: <Star className="h-4 w-4" />,
          color: "text-amber-500"
        },
        { 
          title: "À risque", 
          value: "3", 
          change: -1, 
          trend: 'down',
          icon: <AlertTriangle className="h-4 w-4" />,
          color: "text-amber-500"
        },
        { 
          title: "Récentes", 
          value: "5", 
          change: 1, 
          trend: 'up',
          icon: <Clock4 className="h-4 w-4" />,
          color: "text-amber-500"
        }
      ]
    },
    {
      title: "Maintenance",
      icon: <Wrench className="h-4 w-4" />,
      color: "text-red-500",
      bgClass: "bg-red-50 dark:bg-red-950/10",
      widgets: [
        { 
          title: "Priorités", 
          value: propertiesData?.maintenance.urgent || "4", 
          change: 1, 
          trend: 'up',
          icon: <AlertTriangle className="h-4 w-4" />,
          color: "text-red-500"
        },
        { 
          title: "État", 
          value: "85%", 
          change: 5, 
          trend: 'up',
          icon: <CheckCircle className="h-4 w-4" />,
          color: "text-red-500"
        },
        { 
          title: "Performance", 
          value: `${propertiesData?.maintenance.efficiency || 92}%`, 
          change: 2, 
          trend: 'up',
          icon: <TrendingUp className="h-4 w-4" />,
          color: "text-red-500"
        },
        { 
          title: "Coûts", 
          value: "3.2K€", 
          change: -8, 
          trend: 'down',
          icon: <Wallet className="h-4 w-4" />,
          color: "text-red-500"
        }
      ]
    },
    {
      title: "Finance",
      icon: <Wallet className="h-4 w-4" />,
      color: "text-blue-500",
      bgClass: "bg-blue-50 dark:bg-blue-950/10",
      widgets: [
        { 
          title: "Crédits", 
          value: "1.2M€", 
          change: 0, 
          trend: 'neutral',
          icon: <Wallet className="h-4 w-4" />,
          color: "text-blue-500"
        },
        { 
          title: "Dépenses", 
          value: propertiesData?.financial.monthlyExpenses ? `${propertiesData.financial.monthlyExpenses}€` : "15K€", 
          change: -5, 
          trend: 'down',
          icon: <ArrowRight className="h-4 w-4" />,
          color: "text-blue-500"
        },
        { 
          title: "Revenus", 
          value: propertiesData?.financial.monthlyRevenue ? `${propertiesData.financial.monthlyRevenue}€` : "45K€", 
          change: 8, 
          trend: 'up',
          icon: <TrendingUp className="h-4 w-4" />,
          color: "text-blue-500"
        },
        { 
          title: "Balance", 
          value: propertiesData?.financial.balance ? `${propertiesData.financial.balance}€` : "30K€", 
          change: 12, 
          trend: 'up',
          icon: <Wallet className="h-4 w-4" />,
          color: "text-blue-500"
        }
      ]
    },
    {
      title: "Documents",
      icon: <FileText className="h-4 w-4" />,
      color: "text-slate-500",
      bgClass: "bg-slate-50 dark:bg-slate-950/10",
      widgets: [
        { 
          title: "Contrats", 
          value: "24", 
          change: 2, 
          trend: 'up',
          icon: <FileText className="h-4 w-4" />,
          color: "text-slate-500"
        },
        { 
          title: "Lettres", 
          value: "12", 
          change: 1, 
          trend: 'up',
          icon: <Mail className="h-4 w-4" />,
          color: "text-slate-500"
        },
        { 
          title: "En attente", 
          value: "3", 
          change: -1, 
          trend: 'down',
          icon: <Clock4 className="h-4 w-4" />,
          color: "text-slate-500"
        },
        { 
          title: "Expirés", 
          value: "2", 
          change: 0, 
          trend: 'neutral',
          icon: <AlertTriangle className="h-4 w-4" />,
          color: "text-slate-500"
        }
      ]
    }
  ];

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSection((prev) => (prev + 1) % sections.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, sections.length]);

  const nextSection = () => {
    setCurrentSection((prev) => (prev + 1) % sections.length);
    setIsAutoPlaying(false);
  };

  const prevSection = () => {
    setCurrentSection((prev) => (prev - 1 + sections.length) % sections.length);
    setIsAutoPlaying(false);
  };

  return (
    <Card className={cn(
      "h-[185px] w-[690px]",
      "bg-gradient-to-br from-background to-background/80 border-border shadow-md",
      className
    )}>
      <div className="flex items-center justify-between mb-2 px-4 pt-3">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-full bg-background/80 shadow-sm", sections[currentSection].color)}>
            {sections[currentSection].icon}
          </div>
          <h3 className="text-sm font-semibold">{sections[currentSection].title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevSection}
            className="h-7 w-7 hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextSection}
            className="h-7 w-7 hover:bg-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto pb-2 w-full px-4"
      >
        <div className="grid grid-cols-4 gap-3 w-full">
          {sections[currentSection].widgets.map((widget, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="h-[110px]"
            >
              <Card className={cn(
                "h-full transition-all duration-300 hover:shadow-lg",
                sections[currentSection].bgClass
              )}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2">
                  <CardTitle className="text-xs font-medium">{widget.title}</CardTitle>
                  <div className={cn(
                    "p-1.5 rounded-full bg-background/80 shadow-sm",
                    widget.color || sections[currentSection].color
                  )}>
                    {widget.icon || sections[currentSection].icon}
                  </div>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  <div className="text-lg font-semibold">{widget.value}</div>
                  {widget.change !== undefined && (
                    <div className="mt-1 flex items-center gap-1">
                      <span
                        className={cn(
                          "text-[10px] font-medium",
                          widget.trend === 'up' && "text-green-500",
                          widget.trend === 'down' && "text-red-500",
                          widget.trend === 'neutral' && "text-muted-foreground"
                        )}
                      >
                        {widget.change > 0 ? '+' : ''}{widget.change}%
                      </span>
                      {widget.trend === 'up' && <TrendingUp className="h-2.5 w-2.5 text-green-500" />}
                      {widget.trend === 'down' && <TrendingUp className="h-2.5 w-2.5 text-red-500 rotate-180" />}
                      {widget.trend === 'neutral' && <MinusCircle className="h-2.5 w-2.5 text-muted-foreground" />}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-1.5 mt-1">
        {sections.map((section, index) => (
          <button
            key={index}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              currentSection === index ? "bg-current" : "bg-muted"
            )}
            style={{ color: currentSection === index ? section.color.replace("text-", "").replace("-500", "") : undefined }}
            onClick={() => {
              setCurrentSection(index);
              setIsAutoPlaying(false);
            }}
          />
        ))}
      </div>
    </Card>
  );
} 