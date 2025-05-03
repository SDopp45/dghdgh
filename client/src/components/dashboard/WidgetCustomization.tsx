import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Pencil, Save, RotateCcw, Pin, Palette } from "lucide-react";
import { useWidgetStore, WidgetId, type WidgetColors } from "@/stores/widgetStore";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "@/hooks/use-toast";
import { HexColorPicker, HexColorInput } from "react-colorful";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function WidgetCustomization() {
  const { widgets, isEditMode, toggleEditMode, toggleWidgetVisibility, toggleWidgetPin, updateWidgetOrder, updateWidgetColors, resetLayout } = useWidgetStore();
  const [selectedWidgetId, setSelectedWidgetId] = useState<WidgetId | null>(null);
  const [activeColor, setActiveColor] = useState<keyof WidgetColors>('primary');

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(widgets);
    const [reorderedItem] = items.splice(result.source.index, 1);

    if (reorderedItem.pinned) {
      toast({
        title: "Widget épinglé",
        description: "Les widgets épinglés ne peuvent pas être déplacés.",
        variant: "default"
      });
      return;
    }

    items.splice(result.destination.index, 0, reorderedItem);

    const updatedWidgets = items.map((item, index) => ({
      ...item,
      order: index,
    }));

    updateWidgetOrder(updatedWidgets);
  };

  const handleSave = () => {
    toggleEditMode();
    toast({
      title: "Configuration sauvegardée",
      description: "Votre disposition personnalisée a été enregistrée avec succès.",
    });
  };

  const handleReset = () => {
    resetLayout();
    toast({
      title: "Disposition réinitialisée",
      description: "La disposition des widgets a été restaurée par défaut.",
    });
  };

  const handleColorChange = (color: string) => {
    if (!selectedWidgetId) return;

    const widget = widgets.find(w => w.id === selectedWidgetId);
    if (!widget) return;

    const newColors: WidgetColors = {
      ...(widget.colors || { primary: '#1a56db', background: '#ffffff', text: '#000000' }),
      [activeColor]: color
    };

    updateWidgetColors(selectedWidgetId, newColors);
  };

  if (!isEditMode) {
    return (
      <Button
        variant="outline"
        size="lg"
        onClick={toggleEditMode}
        className="fixed bottom-8 right-8 z-50 shadow-lg hover:shadow-xl transition-all duration-200 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Pencil className="h-5 w-5" />
        Personnaliser le tableau de bord
      </Button>
    );
  }

  // Sort widgets with pinned items at the top
  const sortedWidgets = [...widgets].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return a.order - b.order;
  });

  return (
    <Card className="fixed bottom-8 right-8 p-6 z-50 w-96 shadow-xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Personnalisation des widgets</h3>
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="widgets">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3"
              >
                {sortedWidgets.map((widget, index) => (
                  <Draggable
                    key={widget.id}
                    draggableId={widget.id}
                    index={index}
                    isDragDisabled={widget.pinned}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors duration-200 ${
                          widget.pinned ? 'border-l-4 border-primary' : ''
                        } ${widget.pinned ? 'cursor-default' : 'cursor-move'}`}
                        style={{
                          ...provided.draggableProps.style,
                          background: widget.colors?.background,
                          color: widget.colors?.text,
                        }}
                      >
                        <span className="text-sm font-medium">
                          {widget.title}
                          {widget.pinned && (
                            <span className="ml-2 text-xs text-primary">(Épinglé)</span>
                          )}
                        </span>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={widget.visible}
                            onCheckedChange={() =>
                              toggleWidgetVisibility(widget.id as WidgetId)
                            }
                          />
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-0 h-8 w-8"
                                onClick={() => setSelectedWidgetId(widget.id)}
                              >
                                <Palette className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64">
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <Label>Couleurs</Label>
                                    <div className="space-x-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={activeColor === 'primary' ? 'bg-muted' : ''}
                                        onClick={() => setActiveColor('primary')}
                                      >
                                        Principal
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={activeColor === 'background' ? 'bg-muted' : ''}
                                        onClick={() => setActiveColor('background')}
                                      >
                                        Fond
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={activeColor === 'text' ? 'bg-muted' : ''}
                                        onClick={() => setActiveColor('text')}
                                      >
                                        Texte
                                      </Button>
                                    </div>
                                  </div>
                                  <HexColorPicker
                                    color={widget.colors?.[activeColor] || '#000000'}
                                    onChange={handleColorChange}
                                  />
                                  <div className="flex items-center space-x-2">
                                    <Label>Code hex:</Label>
                                    <HexColorInput
                                      color={widget.colors?.[activeColor] || '#000000'}
                                      onChange={handleColorChange}
                                      className="w-20 px-2 py-1 border rounded"
                                    />
                                  </div>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleWidgetPin(widget.id as WidgetId)}
                                  className={`p-1 ${widget.pinned ? 'text-primary' : 'text-muted-foreground'}`}
                                >
                                  <Pin className={`h-4 w-4 ${widget.pinned ? 'fill-current' : ''}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{widget.pinned ? 'Désépingler' : 'Épingler'} le widget</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </Card>
  );
}