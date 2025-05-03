import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, CalendarCheck, Archive, CalendarClock } from "lucide-react";
import { format, isThisWeek, isFuture } from "date-fns";
import { fr } from "date-fns/locale";
import { Visit } from "@/types/visits";

interface Props {
  visits: Visit[];
}

export function VisitsStats({ visits = [] }: Props) {
  const upcomingVisits = visits.filter((visit) => 
    !visit.archived && isFuture(new Date(visit.datetime))
  );
  const thisWeekVisits = visits.filter((visit) => 
    !visit.archived && isThisWeek(new Date(visit.datetime)) && isFuture(new Date(visit.datetime))
  );
  const archivedVisits = visits.filter((visit) => visit.archived);
  const nextVisit = upcomingVisits.length > 0 
    ? upcomingVisits.sort((a, b) => 
        new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
      )[0]
    : null;

  return (
    <motion.div 
      className="grid gap-4 md:grid-cols-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
    >
      {[
        {
          title: "Visites à venir",
          value: upcomingVisits.length,
          icon: CalendarDays,
          description: "Total des visites planifiées",
          color: "bg-gradient-to-br from-purple-500/10 to-violet-500/5",
          iconColor: "text-purple-500",
          accentColor: "purple"
        },
        {
          title: "Cette semaine",
          value: thisWeekVisits.length,
          icon: CalendarCheck,
          description: "Visites prévues cette semaine",
          color: "bg-gradient-to-br from-violet-500/10 to-indigo-500/5",
          iconColor: "text-violet-500",
          accentColor: "violet"
        },
        {
          title: "Visites archivées",
          value: archivedVisits.length,
          icon: Archive,
          description: "Historique des visites passées",
          color: "bg-gradient-to-br from-indigo-500/10 to-purple-500/5",
          iconColor: "text-indigo-500",
          accentColor: "indigo"
        },
        {
          title: "Prochaine visite",
          content: nextVisit ? (
            <>
              <div className="text-sm font-medium truncate">
                {nextVisit.property?.name || nextVisit.manualAddress || "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(nextVisit.datetime), "PPp", { locale: fr })}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune visite planifiée</p>
          ),
          icon: CalendarClock,
          color: "bg-gradient-to-br from-fuchsia-500/10 to-pink-500/5",
          iconColor: "text-fuchsia-500",
          accentColor: "fuchsia"
        }
      ].map((stat, index) => (
        <motion.div 
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="group relative"
        >
          <Card className={`${stat.color} border-primary/20 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-primary/40 relative z-10 backdrop-blur-sm`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
              </motion.div>
            </CardHeader>
            <CardContent>
              {stat.content || (
                <>
                  <motion.div 
                    className="text-2xl font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                      delay: index * 0.1 + 0.3
                    }}
                  >
                    {stat.value}
                  </motion.div>
                  <motion.p 
                    className="text-xs text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.4 }}
                  >
                    {stat.description}
                  </motion.p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}