import { DashboardContextProvider } from "@/hooks/use-dashboard";
import AddWidgetButton from "./AddWidgetButton";
import { GuestCountWidget } from "./GuestCountWidget";
import { PropertiesMap } from "./PropertiesMap";
import { WidgetRenderer } from "./WidgetRenderer";
import EmptyWidgets from "./EmptyWidgets";
import { DashboardStats } from "./DashboardStats";
import { RevenueChart } from "./RevenueChart";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [isLoaded, setIsLoaded] = useState(false);

  // Simulate loading state for demo purposes
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1200);
    
    return () => clearTimeout(timer);
  }, []);

  const defaultWidgets = [
    { id: "stats", type: "stats", x: 0, y: 0, w: 12, h: 4 },
    { id: "revenue", type: "revenue", x: 0, y: 4, w: 8, h: 7 },
    { id: "map", type: "map", x: 8, y: 4, w: 4, h: 7 },
  ];

  return (
    <DashboardContextProvider>
      <div className="flex flex-col gap-4 p-4 sm:p-8 min-h-screen">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <AddWidgetButton />
        </div>

        <AnimatePresence>
          {!isLoaded ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-12 gap-4 mt-4"
            >
              {/* Skeleton loaders */}
              <div className={cn("col-span-12 h-32 rounded-xl bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-900 animate-pulse")} />
              <div className={cn("col-span-8 h-64 rounded-xl bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-900 animate-pulse")} />
              <div className={cn("col-span-4 h-64 rounded-xl bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-900 animate-pulse")} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <WidgetRenderer
                defaultWidgets={defaultWidgets}
                renderWidget={(widget) => {
                  if (widget.type === "stats") {
                    return <DashboardStats widget={widget} />;
                  }
                  if (widget.type === "map") {
                    return <PropertiesMap widget={widget} />;
                  }
                  if (widget.type === "revenue") {
                    return <RevenueChart widget={widget} />;
                  }
                  if (widget.type === "guests") {
                    return <GuestCountWidget widget={widget} />;
                  }
                  return <EmptyWidgets widget={widget} />;
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardContextProvider>
  );
}

// Layout principal
export { DashboardLayout } from './DashboardLayout';

// Widgets standards
export { DashboardStats } from './widgets/DashboardStats';
export { PerformanceMetrics } from './widgets/PerformanceMetrics';
export { RecentActivity } from './widgets/RecentActivity';
export { VisitsWidget } from './widgets/VisitsWidget';

// Widgets spécifiques
export { RevenueChart } from './widgets/RevenueChart';
export { ExpenseBreakdown } from './widgets/ExpenseBreakdown';
export { OccupancyWidget } from './widgets/OccupancyWidget';
export { TenantStatusWidget } from './widgets/TenantStatusWidget';
export { MaintenanceWidget } from './widgets/MaintenanceWidget';
export { PerformanceAnalyticsWidget } from './widgets/PerformanceAnalyticsWidget';
export { PropertyInsightsWidget } from './widgets/PropertyInsightsWidget';
export { RentalPerformanceWidget } from './widgets/RentalPerformanceWidget';
export { VisitsCalendarWidget } from './widgets/VisitsCalendarWidget';
export { IoTDevicesWidget } from './widgets/IoTDevicesWidget';

// Widgets futuristes
export { PredictiveAnalyticsWidget } from './widgets/PredictiveAnalyticsWidget';
export { PropertyComparisonWidget } from './widgets/PropertyComparisonWidget';
export { PortfolioRadarWidget } from './widgets/PortfolioRadarWidget';
export { CashflowSankeyWidget } from './widgets/CashflowSankeyWidget';

// Contrôles
export { WidgetMenu } from './WidgetMenu';
export { WidgetContainer } from './WidgetContainer';
export { WidgetCustomization } from './WidgetCustomization';

// Utilitaires et hooks
export { useHeatmapData } from './hooks/useHeatmapData';
export { usePredictiveData } from './hooks/usePredictiveData'; 