import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Clock, CheckCircle2, Star, Target, TrendingUp, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";

export function MaintenanceRewards() {
  const { data: maintenance, isLoading } = useQuery({
    queryKey: ["/api/maintenance"],
    queryFn: async () => {
      const response = await fetch("/api/maintenance");
      if (!response.ok) throw new Error("Failed to fetch maintenance requests");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
                  <div>
                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-48 bg-muted rounded animate-pulse mt-1" />
                  </div>
                </div>
                <div className="h-2 w-full bg-muted rounded animate-pulse" />
                <div className="h-4 w-16 bg-muted rounded animate-pulse ml-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate maintenance stats
  const totalRequests = maintenance?.length || 0;
  const resolvedRequests = maintenance?.filter((m: any) => m.status === "completed").length || 0;
  const quickResolutions = maintenance?.filter((m: any) => {
    const created = new Date(m.createdAt);
    const completed = m.completedAt ? new Date(m.completedAt) : null;
    return completed && differenceInHours(completed, created) <= 24;
  }).length || 0;

  // Calcul du taux de résolution dans les délais
  const highPriorityRequests = maintenance?.filter((m: any) => m.priority === "high").length || 0;
  const resolvedHighPriority = maintenance?.filter((m: any) => 
    m.priority === "high" && m.status === "completed"
  ).length || 0;

  const achievements = [
    {
      title: "Résolutions Rapides",
      description: "Résoudre une demande en moins de 24h",
      progress: quickResolutions,
      maxProgress: 10,
      icon: Clock,
      color: "text-blue-500",
      level: Math.floor(quickResolutions / 10) + 1,
      nextMilestone: (Math.floor(quickResolutions / 10) + 1) * 10,
    },
    {
      title: "Expert Maintenance",
      description: "Résoudre des demandes de maintenance",
      progress: resolvedRequests,
      maxProgress: 50,
      icon: CheckCircle2,
      color: "text-green-500",
      level: Math.floor(resolvedRequests / 50) + 1,
      nextMilestone: (Math.floor(resolvedRequests / 50) + 1) * 50,
    },
    {
      title: "Urgences Maîtrisées",
      description: "Résoudre des demandes prioritaires",
      progress: resolvedHighPriority,
      maxProgress: highPriorityRequests || 1,
      icon: Shield,
      color: "text-red-500",
      level: Math.floor((resolvedHighPriority / (highPriorityRequests || 1)) * 5) + 1,
      nextMilestone: Math.ceil(highPriorityRequests * ((Math.floor((resolvedHighPriority / (highPriorityRequests || 1)) * 5) + 1) / 5)),
    },
    {
      title: "Efficacité Globale",
      description: "Maintenir un taux de résolution élevé",
      progress: resolvedRequests,
      maxProgress: totalRequests || 1,
      icon: TrendingUp,
      color: "text-purple-500",
      level: Math.floor((resolvedRequests / (totalRequests || 1)) * 5) + 1,
      nextMilestone: Math.ceil(totalRequests * ((Math.floor((resolvedRequests / (totalRequests || 1)) * 5) + 1) / 5)),
    }
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Récompenses Maintenance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div 
          className="space-y-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {achievements.map((achievement) => (
            <motion.div key={achievement.title} variants={item} className="space-y-2">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full bg-gray-100 ${achievement.color}`}>
                  <achievement.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold flex items-center gap-2">
                      {achievement.title}
                      <Badge variant="secondary" className="text-xs">
                        Niveau {achievement.level}
                      </Badge>
                    </h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {achievement.description}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <Progress
                  value={(achievement.progress / achievement.maxProgress) * 100}
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{achievement.progress} / {achievement.nextMilestone}</span>
                  <span>Prochain niveau: {achievement.nextMilestone - achievement.progress} restant</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </CardContent>
    </Card>
  );
}