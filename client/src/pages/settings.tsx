import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Bell, User, Globe, Paintbrush, Shield, Building, Euro, FileText, Key, FileInput, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function SettingsPage() {
  const [, setLocation] = useLocation();

  const settingsCategories = [
    {
      title: "Compte & Sécurité",
      items: [
        {
          title: "Profil & Identité",
          description: "Gérer vos informations personnelles",
      icon: User,
      href: "/settings/profile",
      color: "text-blue-500"
    },
        {
          title: "Sécurité",
          description: "Mot de passe et authentification",
          icon: Shield,
          href: "/settings/security",
          color: "text-emerald-500"
        },
    {
      title: "Notifications",
      description: "Configurer vos préférences de notifications",
      icon: Bell,
      href: "/settings/notifications",
      color: "text-amber-500"
        }
      ]
    },
    {
      title: "Préférences Générales",
      items: [
    {
      title: "Localisation",
      description: "Format des dates et paramètres régionaux",
      icon: Globe,
      href: "/settings/localization",
          color: "text-indigo-500"
        },
        {
          title: "Apparence",
          description: "Thème et interface utilisateur",
          icon: Paintbrush,
          href: "/settings/appearance",
          color: "text-purple-500"
        }
      ]
    },
    {
      title: "Propriétés & Finance",
      items: [
        {
          title: "Paramètres des biens",
          description: "Options par défaut des propriétés",
          icon: Building,
          href: "/settings/properties",
          color: "text-teal-500"
        },
        {
          title: "Finance",
          description: "Paramètres financiers et comptabilité",
          icon: Euro,
          href: "/settings/finance",
          color: "text-green-500"
        },
        {
          title: "Paiements",
          description: "Méthodes de paiement et facturation",
          icon: CreditCard,
          href: "/settings/payments",
      color: "text-rose-500"
        }
      ]
    },
    {
      title: "Documents & Contrats",
      items: [
        {
          title: "Modèles de documents",
          description: "Gérer vos modèles de contrats et documents",
          icon: FileText,
          href: "/settings/document-templates",
          color: "text-cyan-500"
        },
        {
          title: "Signatures",
          description: "Paramètres de signature électronique",
          icon: Key,
          href: "/settings/signatures",
          color: "text-orange-500"
        },
        {
          title: "Import/Export",
          description: "Options d'import et d'export de données",
          icon: FileInput,
          href: "/settings/import-export",
          color: "text-slate-500"
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