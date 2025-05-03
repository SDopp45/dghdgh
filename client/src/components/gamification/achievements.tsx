import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Home, Wrench, Users, Clock, Heart, Crown, Target, Shield, Calendar, TrendingUp, PiggyBank, Percent } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface CategoryProgress {
  level: number;
  progress: number;
  maxLevel: number;
}

interface AchievementLevel {
  description: string;
  target: number;
  points: number;
}

interface Achievement {
  id: string;
  title: string;
  icon: JSX.Element;
  category: "property" | "maintenance" | "tenant" | "visit" | "finance";
  currentLevel: number;
  levels: AchievementLevel[];
  completed: boolean;
  targetReached:boolean;
}

export function Achievements() {
  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ["/api/properties"],
  });

  const { data: maintenance = [] } = useQuery<any[]>({
    queryKey: ["/api/maintenance"],
  });

  const { data: tenants = [] } = useQuery<any[]>({
    queryKey: ["/api/tenants"],
  });

  const { data: visits = [] } = useQuery<any[]>({
    queryKey: ["/api/visits"],
  });

  const { data: transactions = [] } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
  });

  const [categoryProgress, setCategoryProgress] = useState<Record<string, CategoryProgress>>({
    property: { level: 1, progress: 0, maxLevel: 10 },
    maintenance: { level: 1, progress: 0, maxLevel: 10 },
    tenant: { level: 1, progress: 0, maxLevel: 10 },
    visit: { level: 1, progress: 0, maxLevel: 10 },
    finance: { level: 1, progress: 0, maxLevel: 10 },
  });

  const [achievements, setAchievements] = useState<Achievement[]>([
    // Property Achievements
    {
      id: "property-portfolio",
      title: "Portfolio Immobilier",
      icon: <Home className="w-6 h-6 text-blue-500" />,
      category: "property",
      currentLevel: 1,
      levels: [
        { description: "Gérer 1 propriété", target: 1, points: 100 },
        { description: "Gérer 3 propriétés", target: 3, points: 300 },
        { description: "Gérer 6 propriétés", target: 6, points: 600 }
      ],
      completed: false,
      targetReached: false
    },
    {
      id: "property-value",
      title: "Empire Immobilier",
      icon: <Crown className="w-6 h-6 text-yellow-500" />,
      category: "property",
      currentLevel: 1,
      levels: [
        { description: "100k€ de patrimoine", target: 100000, points: 200 },
        { description: "500k€ de patrimoine", target: 500000, points: 400 },
        { description: "1M€ de patrimoine", target: 1000000, points: 800 }
      ],
      completed: false,
      targetReached: false
    },
    // Maintenance Achievements
    {
      id: "quick-maintenance",
      title: "Résolutions Rapides",
      icon: <Clock className="w-6 h-6 text-blue-500" />,
      category: "maintenance",
      currentLevel: 1,
      levels: [
        { description: "3 demandes en 24h", target: 3, points: 150 },
        { description: "6 demandes en 24h", target: 6, points: 300 },
        { description: "10 demandes en 24h", target: 10, points: 600 }
      ],
      completed: false,
      targetReached: false
    },
    {
      id: "maintenance-expert",
      title: "Expert Maintenance",
      icon: <Wrench className="w-6 h-6 text-green-500" />,
      category: "maintenance",
      currentLevel: 1,
      levels: [
        { description: "10 demandes résolues", target: 10, points: 200 },
        { description: "25 demandes résolues", target: 25, points: 400 },
        { description: "50 demandes résolues", target: 50, points: 800 }
      ],
      completed: false,
      targetReached: false
    },
    // Tenant Achievements
    {
      id: "tenant-retention",
      title: "Fidélisation",
      icon: <Target className="w-6 h-6 text-purple-500" />,
      category: "tenant",
      currentLevel: 1,
      levels: [
        { description: "3 locataires > 6 mois", target: 3, points: 150 },
        { description: "6 locataires > 1 an", target: 6, points: 300 },
        { description: "10 locataires > 2 ans", target: 10, points: 600 }
      ],
      completed: false,
      targetReached: false
    },
    {
      id: "perfect-record",
      title: "Gestion Parfaite",
      icon: <Shield className="w-6 h-6 text-red-500" />,
      category: "tenant",
      currentLevel: 1,
      levels: [
        { description: "1 mois sans impayé", target: 1, points: 200 },
        { description: "3 mois sans impayé", target: 3, points: 400 },
        { description: "6 mois sans impayé", target: 6, points: 800 }
      ],
      completed: false,
      targetReached: false
    },
    // Visit Achievements
    {
      id: "visit-organizer",
      title: "Organisateur",
      icon: <Calendar className="w-6 h-6 text-indigo-500" />,
      category: "visit",
      currentLevel: 1,
      levels: [
        { description: "3 visites organisées", target: 3, points: 100 },
        { description: "6 visites organisées", target: 6, points: 200 },
        { description: "10 visites organisées", target: 10, points: 400 }
      ],
      completed: false,
      targetReached: false
    },
    {
      id: "conversion-master",
      title: "Maître des Conversions",
      icon: <Percent className="w-6 h-6 text-emerald-500" />,
      category: "visit",
      currentLevel: 1,
      levels: [
        { description: "20% taux de conversion", target: 20, points: 150 },
        { description: "35% taux de conversion", target: 35, points: 300 },
        { description: "50% taux de conversion", target: 50, points: 600 }
      ],
      completed: false,
      targetReached: false
    },
    // Finance Achievements
    {
      id: "revenue-growth",
      title: "Croissance Rentable",
      icon: <TrendingUp className="w-6 h-6 text-green-500" />,
      category: "finance",
      currentLevel: 1,
      levels: [
        { description: "5k€ revenus mensuels", target: 5000, points: 200 },
        { description: "15k€ revenus mensuels", target: 15000, points: 400 },
        { description: "30k€ revenus mensuels", target: 30000, points: 800 }
      ],
      completed: false,
      targetReached: false
    },
    {
      id: "cost-optimizer",
      title: "Optimisation Coûts",
      icon: <PiggyBank className="w-6 h-6 text-orange-500" />,
      category: "finance",
      currentLevel: 1,
      levels: [
        { description: "5% réduction coûts", target: 5, points: 150 },
        { description: "10% réduction coûts", target: 10, points: 300 },
        { description: "15% réduction coûts", target: 15, points: 600 }
      ],
      completed: false,
      targetReached: false
    }
  ]);

  // Update achievements and category progress
  useEffect(() => {
    if (properties.length > 0 || maintenance.length > 0 || tenants.length > 0 || visits.length > 0 || transactions.length > 0) {
      const newAchievements = achievements.map(achievement => {
        let currentLevel = achievement.currentLevel;
        let completed = achievement.completed;
        let targetReached = false;

        switch (achievement.id) {
          case "property-portfolio":
            const propertyCount = properties.length;
            const nextLevel = achievement.levels.findIndex(level => propertyCount < level.target) + 1;
            if (nextLevel > currentLevel) {
              currentLevel = nextLevel;
              targetReached = true;
            }
            completed = currentLevel > achievement.levels.length;
            break;
          case "property-value":
            const totalValue = properties.reduce((sum, p) => sum + Number(p.purchasePrice), 0);
            const nextLevel2 = achievement.levels.findIndex(level => totalValue < level.target) + 1;
            if (nextLevel2 > currentLevel) {
              currentLevel = nextLevel2;
              targetReached = true;
            }
            completed = currentLevel > achievement.levels.length;
            break;
          case "quick-maintenance":
            const quickResolutions = maintenance.filter((m: any) => {
              const created = new Date(m.createdAt);
              const completed = m.completedAt ? new Date(m.completedAt) : null;
              if (!completed) return false;
              const hours = (completed.getTime() - created.getTime()) / (1000 * 60 * 60);
              return hours <= 24;
            }).length;
            const nextLevel3 = achievement.levels.findIndex(level => quickResolutions < level.target) + 1;
            if (nextLevel3 > currentLevel) {
              currentLevel = nextLevel3;
              targetReached = true;
            }
            completed = currentLevel > achievement.levels.length;
            break;
          case "maintenance-expert":
            const resolvedRequests = maintenance.filter((m: any) => m.status === "completed").length;
            const nextLevel4 = achievement.levels.findIndex(level => resolvedRequests < level.target) + 1;
            if (nextLevel4 > currentLevel) {
              currentLevel = nextLevel4;
              targetReached = true;
            }
            completed = currentLevel > achievement.levels.length;
            break;
          case "tenant-retention":
            const longTermTenants = tenants.filter((t: any) => {
              const startDate = new Date(t.leaseStart);
              const now = new Date();
              const months = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
              return months >= (achievement.levels[currentLevel - 1].target * 6); // Converting target to months
            }).length;
            const nextLevel5 = achievement.levels.findIndex(level => longTermTenants < level.target) + 1;
            if (nextLevel5 > currentLevel) {
              currentLevel = nextLevel5;
              targetReached = true;
            }
            completed = currentLevel > achievement.levels.length;
            break;
          case "visit-organizer":
            const visitCount = visits.length;
            const nextLevel6 = achievement.levels.findIndex(level => visitCount < level.target) + 1;
            if (nextLevel6 > currentLevel) {
              currentLevel = nextLevel6;
              targetReached = true;
            }
            completed = currentLevel > achievement.levels.length;
            break;
          case "conversion-master":
            const completedVisits = visits.filter((v: any) => v.status === "completed").length;
            const conversionRate = (completedVisits / visits.length) * 100 || 0;
            const nextLevel7 = achievement.levels.findIndex(level => conversionRate < level.target) + 1;
            if (nextLevel7 > currentLevel) {
              currentLevel = nextLevel7;
              targetReached = true;
            }
            completed = currentLevel > achievement.levels.length;
            break;
          case "revenue-growth":
            const monthlyRevenue = transactions
              .filter((t: any) => t.type === "income" && t.status === "completed")
              .reduce((sum, t) => sum + Number(t.amount), 0) / 12;
            const nextLevel8 = achievement.levels.findIndex(level => monthlyRevenue < level.target) + 1;
            if (nextLevel8 > currentLevel) {
              currentLevel = nextLevel8;
              targetReached = true;
            }
            completed = currentLevel > achievement.levels.length;
            break;
          case "cost-optimizer":
            const lastMonthDate = new Date();
            lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);

            const recentTransactions = transactions.filter((t: any) =>
              new Date(t.date) >= lastMonthDate && t.status === "completed"
            );

            const expenses = recentTransactions
              .filter(t => t.type === "expense")
              .reduce((sum, t) => sum + Number(t.amount), 0);

            const income = recentTransactions
              .filter(t => t.type === "income")
              .reduce((sum, t) => sum + Number(t.amount), 0);

            const costRatio = income > 0 ? (expenses / income) * 100 : 100;
            const reduction = Math.max(0, Math.round(100 - costRatio));

            const nextLevel9 = achievement.levels.findIndex(level => reduction < level.target) + 1;
            if (nextLevel9 > currentLevel) {
              currentLevel = nextLevel9;
              targetReached = true;
            }
            completed = currentLevel > achievement.levels.length;
            break;
        }

        return {
          ...achievement,
          currentLevel: Math.min(currentLevel, achievement.levels.length),
          completed,
          targetReached
        };
      });

      setAchievements(newAchievements);

      // Mise à jour des progrès par catégorie
      const newCategoryProgress = { ...categoryProgress };

      ["property", "maintenance", "tenant", "visit", "finance"].forEach(category => {
        const categoryAchievements = newAchievements.filter(a => a.category === category);
        let totalPoints = 0;

        categoryAchievements.forEach(achievement => {
          // Attribuer les points pour tous les niveaux complétés
          const completedLevels = achievement.currentLevel - 1;
          for (let i = 0; i < completedLevels; i++) {
            totalPoints += achievement.levels[i].points;
          }
        });

        const level = Math.min(Math.floor(totalPoints / 1000) + 1, 10);
        const progress = level < 10 ? (totalPoints % 1000) : 1000;

        newCategoryProgress[category] = {
          level,
          progress,
          maxLevel: 10
        };
      });

      setCategoryProgress(newCategoryProgress);
    }
  }, [properties, maintenance, tenants, visits, transactions]);

  const categoryTitles = {
    property: "Gestion Immobilière",
    maintenance: "Maintenance",
    tenant: "Gestion Locative",
    visit: "Visites",
    finance: "Finances"
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Réalisations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6 overflow-x-auto pb-4 -mx-6 px-6">
          {Object.entries(categoryTitles).map(([category, title]) => (
            <div key={category} className="min-w-[300px] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{title}</h3>
                <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1 rounded-full">
                  <Trophy className="h-4 w-4" />
                  <span className="font-bold">
                    Niv. {categoryProgress[category].level}
                  </span>
                </div>
              </div>

              {/* Level Progress */}
              {categoryProgress[category].level < 10 && (
                <div className="space-y-1">
                  <Progress
                    value={(categoryProgress[category].progress / 1000) * 100}
                    className="h-1"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{categoryProgress[category].progress}/1000</span>
                    <span>Niveau suivant {categoryProgress[category].level + 1}</span>
                  </div>
                </div>
              )}

              {/* Achievements List */}
              <div className="space-y-2">
                {achievements
                  .filter(achievement => achievement.category === category)
                  .map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`p-3 border rounded-lg ${
                        achievement.completed
                          ? "bg-secondary/50"
                          : achievement.targetReached
                          ? "bg-green-50 dark:bg-green-950"
                          : "bg-background"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">
                          {achievement.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm truncate">
                            {achievement.title}{" "}
                            <span className="text-xs text-muted-foreground">
                              (Niveau {achievement.currentLevel})
                            </span>
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {achievement.levels[achievement.currentLevel - 1]?.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">
                            {achievement.levels[achievement.currentLevel - 1]?.points}
                          </span>
                          {achievement.completed ? (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          ) : achievement.currentLevel > 1 && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                      </div>
                      {achievement.targetReached && (
                        <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                          Niveau suivant débloqué !
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}