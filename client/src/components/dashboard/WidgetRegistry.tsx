import { Widget } from "@/lib/stores/useWidgetStore";
import { PropertyComparisonWidget } from "./widgets/PropertyComparisonWidget";
import { PortfolioRadarWidget } from "./widgets/PortfolioRadarWidget";
import { CashflowSankeyWidget } from "./widgets/CashflowSankeyWidget";

// Type de widgets disponibles
export const widgetComponents: Record<string, React.ComponentType<any>> = {
  "property-comparison-table": PropertyComparisonWidget,
  "portfolio-radar-chart": PortfolioRadarWidget,
  "cashflow-sankey-diagram": CashflowSankeyWidget,
};

// Configuration des nouveaux widgets
export const newWidgets: Widget[] = [
  {
    id: "property-comparison-table",
    type: "property-comparison-table",
    title: "Comparaison des Propriétés",
    category: "propriétés",
    context: "dashboard",
    position: { x: 3, y: 3 },
    size: { width: 3, height: 2, minWidth: 2, minHeight: 1, maxWidth: 3, maxHeight: 3 },
    displaySize: "large",
    importance: "normal",
    collapsed: false,
    pinned: false,
    visible: true,
    order: 15
  },
  {
    id: "portfolio-radar-chart",
    type: "portfolio-radar-chart",
    title: "Analyse Radar du Portefeuille",
    category: "propriétés",
    context: "dashboard",
    position: { x: 0, y: 5 },
    size: { width: 3, height: 2, minWidth: 2, minHeight: 1, maxWidth: 3, maxHeight: 3 },
    displaySize: "large",
    importance: "normal",
    collapsed: false,
    pinned: false,
    visible: true,
    order: 16
  },
  {
    id: "cashflow-sankey-diagram",
    type: "cashflow-sankey-diagram",
    title: "Flux Financiers (Sankey)",
    category: "finance",
    context: "dashboard",
    position: { x: 3, y: 5 },
    size: { width: 3, height: 2, minWidth: 2, minHeight: 1, maxWidth: 3, maxHeight: 3 },
    displaySize: "large",
    importance: "normal",
    collapsed: false,
    pinned: false,
    visible: true,
    order: 17
  },
]; 