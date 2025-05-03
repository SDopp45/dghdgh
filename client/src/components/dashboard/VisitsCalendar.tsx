import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, User, Home } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface Visit {
  id: number;
  datetime: string;
  firstName: string;
  lastName: string;
  property?: {
    name: string;
  };
}

interface Tenant {
  id: number;
  firstName: string;
  lastName: string;
  active: boolean;
  leaseEnd: string;
  property?: {
    name: string;
  };
}

export function VisitsCalendar() {
  const { data: visits = [] } = useQuery<Visit[]>({
    queryKey: ["/api/visits"],
  });

  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  const events = [
    ...visits.map((visit) => ({
      date: new Date(visit.datetime),
      type: "visit" as const,
      title: `Visite - ${visit.property?.name}`,
      description: `${visit.firstName} ${visit.lastName}`,
    })),
    ...tenants
      .filter((tenant) => tenant.active)
      .map((tenant) => ({
        date: new Date(tenant.leaseEnd),
        type: "lease" as const,
        title: `Fin de bail - ${tenant.property?.name}`,
        description: `${tenant.firstName} ${tenant.lastName}`,
      })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <CalendarComponent
          mode="single"
          selected={new Date()}
          modifiers={{
            event: events.map((event) => event.date),
          }}
          modifiersStyles={{
            event: {
              backgroundColor: "hsl(var(--primary))",
              color: "white",
              borderRadius: "50%",
            },
          }}
        />
      </motion.div>

      <div className="space-y-2">
        <motion.h4 
          className="text-sm font-semibold"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          Prochains événements
        </motion.h4>
        <motion.div layout className="space-y-2">
          <AnimatePresence>
            {events
              .filter((event) => event.date >= new Date())
              .slice(0, 3)
              .map((event, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0, 
                    scale: 1,
                    transition: {
                      type: "spring",
                      stiffness: 300,
                      damping: 25,
                      delay: index * 0.1
                    }
                  }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  whileHover={{ 
                    scale: 1.02,
                    transition: { duration: 0.2 }
                  }}
                  className="flex items-start space-x-4 p-2 rounded-lg hover:bg-muted/50 relative overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"
                    initial={{ x: "-100%" }}
                    animate={{ 
                      x: "100%",
                      transition: {
                        repeat: Infinity,
                        duration: 1.5,
                        delay: index * 0.2
                      }
                    }}
                  />
                  <div
                    className={`mt-1 p-2 rounded-full bg-muted ${
                      event.type === "visit"
                        ? "text-purple-500"
                        : "text-orange-500"
                    }`}
                  >
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      {event.type === "visit" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Home className="h-4 w-4" />
                      )}
                    </motion.div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{event.title}</p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      <span>
                        {format(event.date, "PPp", { locale: fr })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {event.description}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`
                      ${event.type === "visit"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-orange-100 text-orange-800"}
                      transition-all duration-300
                    `}
                  >
                    {event.type === "visit" ? "Visite" : "Fin de bail"}
                  </Badge>
                </motion.div>
              ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}