import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Widget, WidgetSize, WidgetImportance } from "@/lib/stores/useWidgetStore";
import { Button } from "@/components/ui/button";
import { MoreVertical, GripHorizontal, Maximize2, Minimize2, LayoutTemplate, Pin, Pencil, Move } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { useWidgetStore } from "@/lib/stores/useWidgetStore";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface BaseWidgetProps {
  widget: Widget;
  onRemove?: () => void;
  children: React.ReactNode;
  dragHandleProps?: DraggableProvidedDragHandleProps;
  isFullscreen?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  isDragging?: boolean;
  className?: string;
}

const importanceColors = {
  normal: "shadow-lg hover:shadow-xl",
  important: "ring-2 ring-yellow-500/20 shadow-yellow-500/10",
  critical: "ring-2 ring-red-500/20 shadow-red-500/10",
} as const;

const sizeOptions = [
  { width: 1, height: 1, label: "1x1" },
  { width: 1, height: 2, label: "1x2" },
  { width: 1, height: 3, label: "1x3" },
  { width: 2, height: 1, label: "2x1" },
  { width: 2, height: 2, label: "2x2" },
  { width: 2, height: 3, label: "2x3" },
  { width: 3, height: 1, label: "3x1" },
  { width: 3, height: 2, label: "3x2" },
  { width: 3, height: 3, label: "3x3" },
];

export function BaseWidget({ 
  widget, 
  onRemove, 
  children, 
  dragHandleProps,
  isFullscreen,
  onFullscreenChange,
  isDragging,
  className 
}: BaseWidgetProps) {
  const updateWidgetTitle = useWidgetStore((state) => state.updateWidgetTitle);
  const togglePinned = useWidgetStore((state) => state.togglePinned);
  const updateWidgetSize = useWidgetStore((state) => state.updateWidgetSize);
  const [isHovered, setIsHovered] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(widget.title);

  const isSeparator = widget.type === 'section-title';

  const handleRename = () => {
    if (newTitle.trim()) {
      updateWidgetTitle(widget.id, newTitle);
      setIsRenaming(false);
    }
  };

  const handleResize = (width: number, height: number) => {
    updateWidgetSize(widget.id, { width, height });
  };

  const currentSize = `${widget.size.width}x${widget.size.height}`;

  return (
    <>
      <motion.div
        initial={false}
        animate={{
          scale: isDragging ? 1.02 : isFullscreen ? 1 : isHovered ? 1.005 : 1,
          zIndex: isFullscreen ? 50 : widget.pinned ? 10 : isDragging ? 40 : 1,
          y: widget.pinned && !isSeparator ? -2 : 0,
          rotate: isDragging ? 1 : 0
        }}
        onHoverStart={() => !isDragging && setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        transition={{ 
          type: "spring",
          stiffness: 200,
          damping: 20
        }}
        className="h-full"
        layout
      >
        <Card 
          className={cn(
            "h-full relative overflow-hidden transition-all duration-300",
            importanceColors[widget.importance || "normal"],
            isFullscreen ? "fixed inset-4 z-50" : "",
            !isSeparator && widget.pinned ? "ring-2 ring-fuchsia-500/30 shadow-lg shadow-fuchsia-500/10" : "",
            isDragging ? "shadow-2xl ring-2 ring-fuchsia-500/20" : "",
            "bg-gradient-to-br from-background/95 via-background/90 to-background/80",
            className
          )}
        >
          <motion.div 
            className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 via-purple-500/2 to-transparent pointer-events-none opacity-0 group-hover:opacity-100"
            animate={{ opacity: isHovered || isDragging ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          />

          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <motion.div 
                {...dragHandleProps}
                className="cursor-move"
              >
                <GripHorizontal className={cn(
                  "h-4 w-4",
                  isDragging ? "text-fuchsia-500" : "text-muted-foreground"
                )} />
              </motion.div>
              <span className="text-foreground/90 flex items-center gap-2">
                {isRenaming ? (
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Nouveau titre"
                  />
                ) : (
                  widget.title
                )}
              </span>
            </CardTitle>

            <div className="flex items-center gap-2">
              {!isSeparator && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 p-0"
                      >
                        <Move className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      <DropdownMenuRadioGroup
                        value={currentSize}
                        onValueChange={(value) => {
                          const [width, height] = value.split('x').map(Number);
                          handleResize(width, height);
                        }}
                      >
                        {sizeOptions.map((option) => (
                          <DropdownMenuRadioItem
                            key={option.label}
                            value={`${option.width}x${option.height}`}
                          >
                            {option.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <motion.div whileHover={{ scale: 1.1 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 p-0",
                        widget.pinned ? "text-fuchsia-500 hover:text-fuchsia-500/80" : "text-muted-foreground"
                      )}
                      onClick={() => togglePinned(widget.id)}
                    >
                      <Pin className={cn("h-4 w-4", widget.pinned && "fill-current")} />
                    </Button>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.1 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 p-0"
                      onClick={() => onFullscreenChange?.(!isFullscreen)}
                    >
                      {isFullscreen ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </Button>
                  </motion.div>
                </>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.div whileHover={{ scale: 1.1 }}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-gradient-to-br from-background/95 to-background/90 border-fuchsia-500/20">
                  <DropdownMenuItem
                    onClick={() => setIsRenaming(true)}
                    className="flex items-center gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    Renommer
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onRemove}
                    className="text-destructive flex items-center gap-2"
                  >
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          <CardContent className="relative z-10">
            <motion.div
              initial={false}
              animate={{ 
                opacity: 1, 
                scale: 1
              }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer le widget</DialogTitle>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nouveau titre"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenaming(false)}>
              Annuler
            </Button>
            <Button onClick={handleRename}>
              Renommer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}