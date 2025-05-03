import { AlertSettings } from "@/components/alerts/AlertSettings";
import { ActiveAlerts } from "@/components/alerts/ActiveAlerts";
import { motion } from "framer-motion";

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
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export default function FinanceSettings() {
  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="relative space-y-8"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg blur-3xl opacity-50" />
      <motion.div
        variants={item}
        className="relative"
      >
        <div className="relative space-y-1">
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Paramètres financiers
          </h2>
          <p className="text-muted-foreground text-lg">
            Gérez vos préférences d'alertes et de notifications
          </p>
        </div>
      </motion.div>

      <motion.div 
        variants={item}
        className="relative grid gap-8"
      >
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative backdrop-blur-xl bg-background/50 p-6 rounded-lg border border-border/30 shadow-2xl space-y-8">
            <ActiveAlerts />
            <AlertSettings />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}