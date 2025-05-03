import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ImageGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (imageUrl: string) => void;
}

export function ImageGenerationDialog({
  isOpen,
  onClose,
  onGenerate,
}: ImageGenerationDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [steps, setSteps] = useState(20);
  const [guidance, setGuidance] = useState(7.5);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir une description pour générer l'image",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/image-enhancement/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          options: {
            negative_prompt: negativePrompt.trim(),
            num_inference_steps: steps,
            guidance_scale: guidance,
            width: 512,
            height: 512,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Génération échouée");
      }

      const data = await response.json();

      if (data.fallback) {
        toast({
          title: "Attention",
          description: "Le service de génération d'images n'est pas disponible. Veuillez vérifier la configuration.",
          variant: "warning",
        });
      } else {
        toast({
          title: "Succès",
          description: "Image générée avec succès",
        });
      }

      onGenerate(data.imageUrl);
      onClose();
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Erreur",
        description: "Impossible de générer l'image",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Génération d'Image IA</DialogTitle>
          <DialogDescription>
            Décrivez l'image que vous souhaitez générer
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="prompt">Description</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Une belle maison moderne avec de grandes fenêtres..."
              className="resize-none"
              rows={4}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="negative-prompt">Éléments à éviter (optionnel)</Label>
            <Input
              id="negative-prompt"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="flou, déformé, mauvaise qualité..."
            />
          </div>
          <div className="grid gap-2">
            <Label>Nombre d'étapes ({steps})</Label>
            <Slider
              value={[steps]}
              onValueChange={(value) => setSteps(value[0])}
              min={10}
              max={50}
              step={1}
            />
          </div>
          <div className="grid gap-2">
            <Label>Guide de fidélité ({guidance})</Label>
            <Slider
              value={[guidance]}
              onValueChange={(value) => setGuidance(value[0])}
              min={1}
              max={20}
              step={0.5}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              "Générer"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}