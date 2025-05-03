import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Paintbrush, Sparkles } from "lucide-react";

interface StyleTransferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyStyle: (style: string, prompt?: string, strength?: number) => Promise<void>;
}

export function StyleTransferDialog({
  isOpen,
  onClose,
  onApplyStyle
}: StyleTransferDialogProps) {
  const [selectedStyle, setSelectedStyle] = useState<string>("professional");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [strength, setStrength] = useState<number>(100);
  const [isCustom, setIsCustom] = useState(false);

  const styles = [
    { value: "modern", label: "Moderne & Minimaliste" },
    { value: "luxury", label: "Luxe & Élégance" },
    { value: "cozy", label: "Chaleureux & Accueillant" },
    { value: "professional", label: "Professionnel" },
    { value: "dramatic", label: "Dramatique & Cinématique" },
  ];

  const handleApply = async () => {
    await onApplyStyle(
      selectedStyle,
      isCustom ? customPrompt : undefined,
      strength / 100
    );
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transfert de Style IA</DialogTitle>
          <DialogDescription>
            Transformez votre image avec notre IA avancée
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Style</Label>
            <Select
              value={selectedStyle}
              onValueChange={(value) => {
                setSelectedStyle(value);
                setIsCustom(false);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un style" />
              </SelectTrigger>
              <SelectContent>
                {styles.map((style) => (
                  <SelectItem
                    key={style.value}
                    value={style.value}
                  >
                    {style.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Style Personnalisé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedStyle === "custom" && (
            <div className="grid gap-2">
              <Label>Description du Style</Label>
              <Input
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Décrivez le style souhaité..."
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label>Intensité du Style ({strength}%)</Label>
            <Slider
              value={[strength]}
              onValueChange={([value]) => setStrength(value)}
              min={1}
              max={100}
              step={1}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button
            onClick={handleApply}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Appliquer le Style
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
