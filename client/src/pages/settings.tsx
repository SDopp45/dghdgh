import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, User, Bell, Globe, Palette, Shield, Database, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { LucideIcon } from "lucide-react";

interface SettingsItem {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
}

interface SettingsCategory {
  title: string;
  items: SettingsItem[];
}

export default function SettingsPage() {
  const [, setLocation] = useLocation();

  const settingsCategories: SettingsCategory[] = [
    {
      title: "Compte",
      items: [
        {
          title: "Tableau de bord utilisateur",
          description: "Interface unifiée pour gérer votre profil et vos paramètres de sécurité",
          icon: User,
          href: "/settings/user-dashboard",
          color: "text-indigo-600"
        }
      ]
    },
    {
      title: "Préférences",
      items: [
        {
          title: "Stockage et données",
          description: "Gérez votre utilisation de stockage et vos quotas",
          icon: Database,
          href: "/settings/storage",
          color: "text-cyan-500"
        },
        {
          title: "Quotas IA",
          description: "Gérez et achetez des crédits pour l'assistant d'intelligence artificielle",
          icon: Zap,
          href: "/settings/ai-tokens",
          color: "text-amber-500"
        }
      ]
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-10"
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-8 w-8 text-primary" />
          Paramètres
        </h2>
        <p className="text-muted-foreground">
          Personnalisez votre expérience et gérez vos préférences
        </p>
      </motion.div>

      {settingsCategories.map((category, index) => (
        <motion.div
          key={category.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 * (index + 1) }}
          className="space-y-4"
        >
          <h3 className="text-xl font-medium border-b pb-2">{category.title}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {category.items.map((item) => (
              <Card key={item.href} className="hover:shadow-lg transition-shadow duration-200 hover:border-primary/50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                    {item.title}
              </CardTitle>
                  <CardDescription>{item.description}</CardDescription>
            </CardHeader>
                <CardContent className="pt-0">
              <Button 
                variant="outline" 
                className="w-full"
                    onClick={() => setLocation(item.href)}
              >
                Configurer
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
        </motion.div>
      ))}
    </motion.div>
  );
}