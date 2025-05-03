import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import * as pdfjsLib from 'pdfjs-dist';

// Worker initialization
const pdfjs = pdfjsLib as any;
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

interface PdfViewerDialogProps {
  fileUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PdfViewerDialog({ fileUrl, isOpen, onClose }: PdfViewerDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);

  const handleDownload = () => {
    if (!fileUrl) return;
    const downloadUrl = fileUrl.replace('/preview', '/download');
    window.open(downloadUrl, '_blank');
  };

  useEffect(() => {
    let isSubscribed = true;

    const loadPDF = async () => {
      if (!isOpen || !fileUrl) return;

      try {
        setIsLoading(true);
        setHasError(false);

        // Cleanup previous instance
        if (pdfDocRef.current) {
          pdfDocRef.current.destroy();
          pdfDocRef.current = null;
        }

        const loadingTask = pdfjs.getDocument({
          url: fileUrl,
          withCredentials: true
        });

        const pdfDoc = await loadingTask.promise;

        if (!isSubscribed) {
          pdfDoc.destroy();
          return;
        }

        pdfDocRef.current = pdfDoc;
        await renderPage(1);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading PDF:', error);
        if (isSubscribed) {
          setHasError(true);
          setIsLoading(false);
          toast({
            variant: "destructive",
            title: "Erreur",
            description: "Impossible de charger le document PDF."
          });
        }
      }
    };

    loadPDF();

    return () => {
      isSubscribed = false;
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, [fileUrl, isOpen, toast]);

  const renderPage = async (pageNumber: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    try {
      const page = await pdfDocRef.current.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport
      }).promise;

      setCurrentPage(pageNumber);
    } catch (error) {
      console.error('Error rendering page:', error);
      setHasError(true);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors de l'affichage de la page."
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-hidden">
        <DialogHeader className="p-4 bg-background/80 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Visualisation du document
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleDownload}
                className="h-8 w-8"
                title="Télécharger le PDF"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 w-full h-[calc(90vh-4rem)] p-4">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {hasError ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <p className="mb-4">
                Une erreur est survenue lors du chargement du PDF.
              </p>
              <Button onClick={handleDownload} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Télécharger le PDF
              </Button>
            </div>
          ) : (
            <div className="w-full h-full overflow-auto flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="shadow-lg"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}