import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect } from "react";

interface StyleSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (style: string, intensity: number) => Promise<void>;
  title: string;
  description: string;
  styles: Array<{ value: string; label: string; description?: string }>;
  defaultStyle?: string;
  defaultIntensity?: number;
}

export function StyleSettingsDialog({
  isOpen,
  onClose,
  onApply,
  title,
  description,
  styles,
  defaultStyle,
  defaultIntensity = 100
}: StyleSettingsDialogProps) {
  const [selectedStyle, setSelectedStyle] = useState<string>(defaultStyle || styles[0].value);
  const [intensity, setIntensity] = useState<number>(defaultIntensity);

  // Reset values when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedStyle(defaultStyle || styles[0].value);
      setIntensity(defaultIntensity);
    }
  }, [isOpen, defaultStyle, defaultIntensity]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleApply();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleApply = async () => {
    await onApply(selectedStyle, intensity);
    onClose();
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent 
        className="sm:max-w-[425px]"
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        <DialogHeader>
          <DialogTitle id="dialog-title">{title}</DialogTitle>
          <DialogDescription id="dialog-description">{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div 
            className="grid gap-2"
            role="group"
            aria-labelledby="style-label"
          >
            <Label id="style-label">Style</Label>
            <Select
              value={selectedStyle}
              onValueChange={setSelectedStyle}
              aria-label="Sélectionnez un style"
            >
              <SelectTrigger aria-label="Style actuel">
                <SelectValue placeholder="Sélectionnez un style" />
              </SelectTrigger>
              <SelectContent>
                {styles.map((style) => (
                  <SelectItem
                    key={style.value}
                    value={style.value}
                    aria-label={`${style.label}${style.description ? ` - ${style.description}` : ''}`}
                  >
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div 
            className="grid gap-2"
            role="group"
            aria-labelledby="intensity-label"
          >
            <Label id="intensity-label">Intensité ({intensity}%)</Label>
            <Slider
              value={[intensity]}
              onValueChange={([value]) => setIntensity(value)}
              min={1}
              max={100}
              step={1}
              aria-label={`Intensité de l'effet: ${intensity}%`}
              aria-valuemin={1}
              aria-valuemax={100}
              aria-valuenow={intensity}
            />
            <div className="sr-only" aria-live="polite">
              Intensité actuelle : {intensity}%
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            aria-label="Annuler les modifications"
          >
            Annuler
          </Button>
          <Button 
            onClick={handleApply}
            aria-label="Appliquer les modifications"
          >
            Appliquer
          </Button>
          <div className="sr-only">
            Raccourcis clavier : Ctrl+Entrée pour appliquer, Échap pour annuler
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}