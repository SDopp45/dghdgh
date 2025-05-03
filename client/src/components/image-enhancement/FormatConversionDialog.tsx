import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface FormatConversionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConvert: (format: string, quality: number) => Promise<void>;
  currentFormat: string;
}

export function FormatConversionDialog({
  isOpen,
  onClose,
  onConvert,
  currentFormat
}: FormatConversionDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>(currentFormat);
  const [quality, setQuality] = useState<number>(92);

  const formats = [
    { value: 'webp', label: 'WebP - Format moderne optimisé pour le web' },
    { value: 'jpeg', label: 'JPEG - Idéal pour les photos' },
    { value: 'png', label: 'PNG - Pour images avec transparence' },
    { value: 'avif', label: 'AVIF - Format nouvelle génération' },
  ];

  const handleConvert = async () => {
    await onConvert(selectedFormat, quality);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Convertir le format de l'image</DialogTitle>
          <DialogDescription>
            Choisissez le format de sortie et la qualité souhaités
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="format">Format de sortie</Label>
            <Select
              value={selectedFormat}
              onValueChange={setSelectedFormat}
            >
              <SelectTrigger id="format">
                <SelectValue placeholder="Sélectionnez un format" />
              </SelectTrigger>
              <SelectContent>
                {formats.map((format) => (
                  <SelectItem
                    key={format.value}
                    value={format.value}
                  >
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="quality">Qualité ({quality}%)</Label>
            <input
              type="range"
              min="1"
              max="100"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConvert}
            disabled={selectedFormat === currentFormat}
          >
            Convertir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
