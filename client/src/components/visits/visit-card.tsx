import { useState } from "react";
import { Visit } from "@/types/visits";
import { 
  Pencil, 
  Trash2, 
  Sliders,
  Calendar as CalendarIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// Icônes des types de visites
const visitTypeIcons = {
  physical: "🏠",
  virtual: "💻",
  video: "📹",
};

// Configuration des statuts
const statusConfig = {
  pending: {
    label: "En attente",
    icon: <div className="h-4 w-4 rounded-full bg-amber-500"></div>,
    color: "bg-amber-500 text-white"
  },
  completed: {
    label: "Terminée",
    icon: <div className="h-4 w-4 rounded-full bg-emerald-500"></div>,
    color: "bg-emerald-500 text-white"
  },
  cancelled: {
    label: "Annulée",
    icon: <div className="h-4 w-4 rounded-full bg-rose-500"></div>,
    color: "bg-rose-500 text-white"
  },
  no_show: {
    label: "Absent",
    icon: <div className="h-4 w-4 rounded-full bg-neutral-500"></div>,
    color: "bg-neutral-500 text-white"
  }
};

interface VisitCardProps {
  visit: Visit;
  onStatusChange: (visitId: number, status: string) => void;
  onDelete: (visitId: number) => void;
  onEdit: () => void;
  showFullDate?: boolean;
}

export function VisitCard({ 
  visit, 
  onStatusChange, 
  onDelete, 
  onEdit, 
  showFullDate = true 
}: VisitCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "p-4 rounded-lg border transition-colors",
        visit.status === "pending" && "border-amber-200 bg-amber-50/50 dark:bg-transparent dark:border-amber-500/30",
        visit.status === "completed" && "border-emerald-200 bg-emerald-50/50 dark:bg-transparent dark:border-emerald-500/30",
        visit.status === "cancelled" && "border-rose-200 bg-rose-50/50 dark:bg-transparent dark:border-rose-500/30",
        visit.status === "no_show" && "border-neutral-200 bg-neutral-50/50 dark:bg-transparent dark:border-neutral-500/30",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{visitTypeIcons[visit.visitType]}</span>
            <h3 className="font-medium text-lg">
              {visit.firstName} {visit.lastName}
            </h3>
            <Badge 
              className={cn(
                "ml-2 flex items-center gap-1.5",
                statusConfig[visit.status as keyof typeof statusConfig].color
              )}
            >
              {statusConfig[visit.status as keyof typeof statusConfig].icon}
              <span>{statusConfig[visit.status as keyof typeof statusConfig].label}</span>
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>
                {showFullDate 
                  ? format(new Date(visit.datetime), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })
                  : format(new Date(visit.datetime), "'à' HH'h'mm", { locale: fr })
                }
              </span>
            </div>

            {(visit.property?.name || visit.manualAddress) && (
              <div>
                <span>•</span>
                <span className="ml-1">
                  {visit.property?.name || visit.manualAddress}
                </span>
                {visit.property?.address && (
                  <span className="ml-1 text-gray-500">
                    ({visit.property.address})
                  </span>
                )}
              </div>
            )}

            {visit.phone && (
              <div>
                <span>•</span>
                <span className="ml-1">
                  <span className="text-gray-600 mr-1">📞</span>
                  {visit.phone}
                </span>
              </div>
            )}

            {visit.email && (
              <div>
                <span>•</span>
                <span className="ml-1">
                  {visit.email}
                </span>
              </div>
            )}

            <div>
              <span>•</span>
              <span className="ml-1">
                <span className="text-gray-600 mr-1">Type:</span>
                {visit.visitType === "physical" ? "En personne" : 
                 visit.visitType === "virtual" ? "Virtuelle" : "Vidéo"}
              </span>
            </div>

            {visit.message && (
              <div className="w-full mt-1 border-t pt-1 text-sm text-muted-foreground">
                <span className="text-gray-600 font-medium">Notes:</span>
                <span className="ml-2">{visit.message}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="bg-white dark:bg-transparent"
            onClick={onEdit}
            title="Modifier la visite"
          >
            <Pencil className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="bg-white dark:bg-transparent text-rose-600 hover:text-rose-700"
            onClick={() => {
              if (confirm("Êtes-vous sûr de vouloir supprimer définitivement cette visite ?")) {
                onDelete(visit.id);
              }
            }}
            title="Supprimer définitivement"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-white dark:bg-transparent"
                title="Changer le statut"
              >
                <Sliders className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Object.entries(statusConfig).map(([status, config]) => (
                <DropdownMenuItem
                  key={status}
                  disabled={visit.status === status}
                  onClick={() => onStatusChange(visit.id, status)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {config.icon}
                  <span>{config.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}