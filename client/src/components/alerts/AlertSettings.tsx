import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Calendar, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useUserSettings } from "@/hooks/use-user-settings";
import type { UserSettings } from "@shared/schema";

type NotificationPreferences = {
  email: boolean;
  frequency: "realtime" | "daily" | "weekly";
  alerts: {
    lease: {
      enabled: boolean;
      days: number;
      priority: "low" | "medium" | "high";
      message: string;
    };
    payment: {
      enabled: boolean;
      days: number;
      priority: "low" | "medium" | "high";
      message: string;
    };
  };
};

export function AlertSettings() {
  const { settings, updateSettings } = useUserSettings();
  const [preferences, setPreferences] = useState<NotificationPreferences>(settings?.notifications || {
    email: true,
    frequency: "daily",
    alerts: {
      lease: {
        enabled: true,
        days: 30,
        priority: "medium",
        message: "Le bail se termine bientôt",
      },
      payment: {
        enabled: true,
        days: 5,
        priority: "high",
        message: "Un retard de paiement a été détecté",
      },
    },
  });

  useEffect(() => {
    if (settings?.notifications) {
      setPreferences(settings.notifications);
    }
  }, [settings]);

  const handleSave = async () => {
    await updateSettings({
      notifications: preferences,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Paramètres des alertes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Email Notifications */}
          <motion.div 
            className="flex items-center justify-between"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="space-y-0.5">
              <Label className="text-base">Notifications par email</Label>
              <p className="text-sm text-muted-foreground">
                Recevoir les alertes par email
              </p>
            </div>
            <Switch
              checked={preferences.email}
              onCheckedChange={(checked) =>
                setPreferences((prev: NotificationPreferences) => ({ ...prev, email: checked }))
              }
            />
          </motion.div>

          {/* Alert Frequency */}
          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Label className="text-base">Fréquence des alertes</Label>
            <Select
              value={preferences.frequency}
              onValueChange={(value: "realtime" | "daily" | "weekly") =>
                setPreferences((prev: NotificationPreferences) => ({ ...prev, frequency: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir la fréquence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">Temps réel</SelectItem>
                <SelectItem value="daily">Quotidien</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {/* Lease Alerts */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Alertes de fin de bail</Label>
                <p className="text-sm text-muted-foreground">
                  Recevez des notifications avant l'expiration des baux
                </p>
              </div>
              <Switch
                checked={preferences.alerts.lease.enabled}
                onCheckedChange={(checked) =>
                  setPreferences((prev: NotificationPreferences) => ({
                    ...prev,
                    alerts: {
                      ...prev.alerts,
                      lease: { ...prev.alerts.lease, enabled: checked },
                    },
                  }))
                }
              />
            </div>
            {preferences.alerts.lease.enabled && (
              <div className="space-y-4 pl-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label>Jours avant échéance</Label>
                    <Input
                      type="number"
                      value={preferences.alerts.lease.days}
                      onChange={(e) =>
                        setPreferences((prev: NotificationPreferences) => ({
                          ...prev,
                          alerts: {
                            ...prev.alerts,
                            lease: {
                              ...prev.alerts.lease,
                              days: parseInt(e.target.value) || 30,
                            },
                          },
                        }))
                      }
                      min={1}
                      max={90}
                    />
                  </div>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <Label>Priorité</Label>
                  <Select
                    value={preferences.alerts.lease.priority}
                    onValueChange={(value: "low" | "medium" | "high") =>
                      setPreferences((prev: NotificationPreferences) => ({
                        ...prev,
                        alerts: {
                          ...prev.alerts,
                          lease: {
                            ...prev.alerts.lease,
                            priority: value,
                          },
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir la priorité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Basse</SelectItem>
                      <SelectItem value="medium">Moyenne</SelectItem>
                      <SelectItem value="high">Haute</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Message personnalisé</Label>
                  <Input
                    value={preferences.alerts.lease.message}
                    onChange={(e) =>
                      setPreferences((prev: NotificationPreferences) => ({
                        ...prev,
                        alerts: {
                          ...prev.alerts,
                          lease: {
                            ...prev.alerts.lease,
                            message: e.target.value,
                          },
                        },
                      }))
                    }
                    placeholder="Message pour les alertes de fin de bail"
                  />
                </div>
              </div>
            )}
          </motion.div>

          {/* Payment Alerts */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Alertes de retard de paiement</Label>
                <p className="text-sm text-muted-foreground">
                  Soyez notifié des retards de paiement de loyer
                </p>
              </div>
              <Switch
                checked={preferences.alerts.payment.enabled}
                onCheckedChange={(checked) =>
                  setPreferences((prev: NotificationPreferences) => ({
                    ...prev,
                    alerts: {
                      ...prev.alerts,
                      payment: { ...prev.alerts.payment, enabled: checked },
                    },
                  }))
                }
              />
            </div>
            {preferences.alerts.payment.enabled && (
              <div className="space-y-4 pl-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label>Jours de retard</Label>
                    <Input
                      type="number"
                      value={preferences.alerts.payment.days}
                      onChange={(e) =>
                        setPreferences((prev: NotificationPreferences) => ({
                          ...prev,
                          alerts: {
                            ...prev.alerts,
                            payment: {
                              ...prev.alerts.payment,
                              days: parseInt(e.target.value) || 5,
                            },
                          },
                        }))
                      }
                      min={1}
                      max={30}
                    />
                  </div>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <Label>Priorité</Label>
                  <Select
                    value={preferences.alerts.payment.priority}
                    onValueChange={(value: "low" | "medium" | "high") =>
                      setPreferences((prev: NotificationPreferences) => ({
                        ...prev,
                        alerts: {
                          ...prev.alerts,
                          payment: {
                            ...prev.alerts.payment,
                            priority: value,
                          },
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir la priorité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Basse</SelectItem>
                      <SelectItem value="medium">Moyenne</SelectItem>
                      <SelectItem value="high">Haute</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Message personnalisé</Label>
                  <Input
                    value={preferences.alerts.payment.message}
                    onChange={(e) =>
                      setPreferences((prev: NotificationPreferences) => ({
                        ...prev,
                        alerts: {
                          ...prev.alerts,
                          payment: {
                            ...prev.alerts.payment,
                            message: e.target.value,
                          },
                        },
                      }))
                    }
                    placeholder="Message pour les alertes de retard de paiement"
                  />
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button onClick={handleSave} className="w-full">
              Sauvegarder les préférences
            </Button>
          </motion.div>
        </motion.div>
      </CardContent>
    </Card>
  );
}