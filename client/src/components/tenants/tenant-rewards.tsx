import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, Heart, Clock, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Tenant } from "@db/schema";

export function TenantRewards() {
  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
    queryFn: async () => {
      const response = await fetch("/api/tenants");
      if (!response.ok) throw new Error("Failed to fetch tenants");
      return response.json();
    },
  });

  // Calculate tenant management stats
  const totalTenants = tenants.length;
  const longTermTenants = tenants.filter((t) => {
    const startDate = new Date(t.leaseStart);
    const now = new Date();
    const years = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return years >= 2;
  }).length;

  const renewals = tenants.filter((t) => t.renewalCount > 0).length;

  const achievements = [
    {
      title: "Gestion Réussie",
      description: "Gérer 10 locataires actifs",
      progress: totalTenants,
      maxProgress: 10,
      icon: Users,
      color: "text-blue-500",
      level: Math.floor(totalTenants / 10) + 1,
      nextMilestone: (Math.floor(totalTenants / 10) + 1) * 10,
    },
    {
      title: "Relations Durables",
      description: "Avoir 5 locataires depuis plus de 2 ans",
      progress: longTermTenants,
      maxProgress: 5,
      icon: Heart,
      color: "text-red-500",
      level: Math.floor(longTermTenants / 5) + 1,
      nextMilestone: (Math.floor(longTermTenants / 5) + 1) * 5,
    },
    {
      title: "Renouvellements",
      description: "Obtenir 10 renouvellements de bail",
      progress: renewals,
      maxProgress: 10,
      icon: Clock,
      color: "text-green-500",
      level: Math.floor(renewals / 10) + 1,
      nextMilestone: (Math.floor(renewals / 10) + 1) * 10,
    },
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
          Récompenses Gestion Locative
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