import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";

interface ImageViewerDialogProps {
  images: Array<{ id: number; imageUrl: string }>;
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageViewerDialog({
  images,
  currentIndex,
  isOpen,
  onClose,
}: ImageViewerDialogProps) {
  const [index, setIndex] = useState(currentIndex);
  const [scale, setScale] = useState(1);

  const next = () => {
    setIndex((prev) => (prev + 1) % images.length);
    setScale(1);
  };

  const previous = () => {
    setIndex((prev) => (prev - 1 + images.length) % images.length);
    setScale(1);
  };

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.5, 3));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.5, 0.5));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
        <DialogDescription className="sr-only">
          Visionneuse d'images avec contrôles de zoom et de navigation. Utilisez les flèches gauche et droite pour naviguer entre les images.
        </DialogDescription>

        <div className="relative w-full h-[90vh] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            {images[index]?.imageUrl ? (
              <img
                src={images[index].imageUrl}
                alt={`Image ${index + 1} sur ${images.length}`}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${scale})` }}
                onError={(e) => {
                  console.error(`Failed to load image: ${images[index].imageUrl}`);
                  e.currentTarget.src = '/placeholder-image.png';
                }}
              />
            ) : (
              <div className="text-center p-4">
                <div className="text-muted-foreground">Image non disponible</div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={zoomOut}
              className="bg-background/50 hover:bg-background/80"
              aria-label="Zoom arrière"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={zoomIn}
              className="bg-background/50 hover:bg-background/80"
              aria-label="Zoom avant"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onClose}
              className="bg-background/50 hover:bg-background/80"
              aria-label="Fermer la visionneuse"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation buttons */}
          {images.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={previous}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/50 hover:bg-background/80"
                aria-label="Image précédente"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/50 hover:bg-background/80"
                aria-label="Image suivante"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Image counter */}
          <div 
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/50 px-2 py-1 rounded-full text-sm"
            role="status"
            aria-live="polite"
          >
            {index + 1} / {images.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}