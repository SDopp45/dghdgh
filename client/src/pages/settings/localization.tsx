import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Globe, Languages, Euro, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUserSettings } from "@/hooks/use-user-settings";
import { Button } from "@/components/ui/button";
import type { UserSettings } from "@db/schema";

export default function LocalizationSettings() {
  const { settings, updateSettings } = useUserSettings();

  const handleUpdateLocale = async (newLocaleSettings: Partial<UserSettings["locale"]>) => {
    if (!settings) return;

    await updateSettings({
      locale: {
        ...settings.locale,
        ...newLocaleSettings,
      },
    });
  };

  if (!settings) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Localisation
        </h2>
        <p className="text-muted-foreground">
          Personnalisez vos préférences régionales et linguistiques
        </p>
      </motion.div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Langue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Langue de l'interface</Label>
                <Select
                  value={settings.locale.language}
                  onValueChange={(value) => handleUpdateLocale({ language: value as UserSettings["locale"]["language"] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une langue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pays/Région</Label>
                <Select
                  value={settings.locale.country}
                  onValueChange={(value) => handleUpdateLocale({ country: value as UserSettings["locale"]["country"] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez votre pays" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">France</SelectItem>
                    <SelectItem value="be">Belgique</SelectItem>
                    <SelectItem value="ch">Suisse</SelectItem>
                    <SelectItem value="ca">Canada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Format des montants
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Format de la devise</Label>
                <Select
                  value={settings.locale.currency}
                  onValueChange={(value) => handleUpdateLocale({ currency: value as UserSettings["locale"]["currency"] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eur">1.234,56 €</SelectItem>
                    <SelectItem value="eur-space">1 234,56 €</SelectItem>
                    <SelectItem value="chf">CHF 1'234.56</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="separateThousands"
                  checked={settings.locale.separateThousands}
                  onCheckedChange={(checked) => handleUpdateLocale({ separateThousands: checked })}
                />
                <Label htmlFor="separateThousands">Séparer les milliers</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Format des dates et heures
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Format de date</Label>
                <Select
                  value={settings.locale.dateFormat}
                  onValueChange={(value) => handleUpdateLocale({ dateFormat: value as UserSettings["locale"]["dateFormat"] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">31/12/2024</SelectItem>
                    <SelectItem value="eu">31.12.2024</SelectItem>
                    <SelectItem value="iso">2024-12-31</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Format d'heure</Label>
                <Select
                  value={settings.locale.timeFormat}
                  onValueChange={(value) => handleUpdateLocale({ timeFormat: value as UserSettings["locale"]["timeFormat"] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24 heures (14:30)</SelectItem>
                    <SelectItem value="12h">12 heures (2:30 PM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fuseau horaire</Label>
                <Select
                  value={settings.locale.timezone}
                  onValueChange={(value) => handleUpdateLocale({ timezone: value as UserSettings["locale"]["timezone"] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un fuseau horaire" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="europe-paris">Europe/Paris</SelectItem>
                    <SelectItem value="europe-brussels">Europe/Brussels</SelectItem>
                    <SelectItem value="europe-zurich">Europe/Zurich</SelectItem>
                    <SelectItem value="america-montreal">America/Montreal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}