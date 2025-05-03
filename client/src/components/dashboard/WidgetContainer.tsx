import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useWidgetStore } from "@/lib/stores/useWidgetStore";
import type { Widget, WidgetContext } from "@/lib/stores/useWidgetStore";
import { cn } from "@/lib/utils";
import { OccupancyWidget } from "./widgets/OccupancyWidget";
import { MaintenanceTasksWidget } from "./widgets/MaintenanceTasksWidget";
import { IoTDevicesWidget } from "./widgets/IoTDevicesWidget";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Wrench, Cpu } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type WidgetType = 'occupancy' | 'maintenance' | 'iot-devices';

interface WidgetConfig {
  title: string;
  icon: LucideIcon;
  category: Widget['category'];
}

const widgetConfig: Record<WidgetType, WidgetConfig> = {
  occupancy: {
    title: "Taux d'occupation",
    icon: Building2,
    category: "rental"
  },
  maintenance: {
    title: "Maintenance",
    icon: Wrench,
    category: "maintenance"
  },
  'iot-devices': {
    title: "Appareils connectés",
    icon: Cpu,
    category: "monitoring"
  }
};

const widgetComponents: Record<WidgetType, React.ComponentType<{ widget: Widget; onRemove?: () => void }>> = {
  occupancy: OccupancyWidget,
  maintenance: MaintenanceTasksWidget,
  'iot-devices': IoTDevicesWidget,
};

function isValidWidgetType(type: string): type is WidgetType {
  return Object.keys(widgetConfig).includes(type);
}

interface WidgetContainerProps {
  context: WidgetContext;
  className?: string;
}

export function WidgetContainer({ context, className }: WidgetContainerProps) {
  const { widgets, addWidget, removeWidget, reorderWidgets, setContext, getContextWidgets } = useWidgetStore();
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Définir le contexte actuel
  setContext(context);

  // Obtenir les widgets pour ce contexte
  const contextWidgets = getContextWidgets(context);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    reorderWidgets(result.source.index, result.destination.index);
  };

  const addNewWidget = (type: WidgetType) => {
    const config = widgetConfig[type];
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type,
      title: config.title,
      category: config.category,
      context, // Ajouter le contexte au nouveau widget
      position: {
        x: contextWidgets.length % 2,
        y: Math.floor(contextWidgets.length / 2),
      },
      size: { width: 1, height: 1 },
      collapsed: false,
      visible: true,
      colors: {
        primary: '#1a56db',
        background: '#ffffff',
        text: '#000000'
      }
    };
    addWidget(newWidget);
    setIsConfigOpen(false);
  };

  return (
    <div className={cn("space-y-6 p-6", className)}>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Widgets</h2>
        <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un widget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un widget</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(widgetConfig).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <Button
                    key={type}
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={() => isValidWidgetType(type) && addNewWidget(type)}
                  >
                    <Icon className="h-6 w-6" />
                    {config.title}
                  </Button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="widgets">
          {(provided) => (
            <motion.div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-1 gap-6"
              layout
            >
              <AnimatePresence>
                {contextWidgets.map((widget, index) => {
                  if (!isValidWidgetType(widget.type)) return null;
                  const WidgetComponent = widgetComponents[widget.type];
                  if (!WidgetComponent) return null;

                  return (
                    <Draggable key={widget.id} draggableId={widget.id} index={index}>
                      {(provided, snapshot) => (
                        <motion.div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={cn(
                            snapshot.isDragging && "z-50",
                            "touch-none"
                          )}
                          style={provided.draggableProps.style}
                        >
                          <WidgetComponent
                            widget={widget}
                            onRemove={() => removeWidget(widget.id)}
                          />
                        </motion.div>
                      )}
                    </Draggable>
                  );
                })}
              </AnimatePresence>
              {provided.placeholder}
            </motion.div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}