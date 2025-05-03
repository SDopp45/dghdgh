import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// Worker initialization
const pdfWorkerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
}

interface PDFViewerProps {
  url: string;
  className?: string;
  onAnnotationChange?: (annotations: any[]) => void;
}

export function PDFViewer({ url, className = '', onAnnotationChange }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let isSubscribed = true;

    const loadPDF = async () => {
      if (!url) return;

      try {
        setLoading(true);
        setError(null);

        // Cleanup previous PDF instance
        if (pdfDocRef.current) {
          pdfDocRef.current.cleanup();
          pdfDocRef.current = null;
        }

        const loadingTask = pdfjsLib.getDocument({
          url,
          withCredentials: true,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/cmaps/',
          cMapPacked: true,
        });

        const pdfDoc = await loadingTask.promise;

        if (!isSubscribed) {
          pdfDoc.cleanup();
          return;
        }

        pdfDocRef.current = pdfDoc;
        setNumPages(pdfDoc.numPages);
        await renderPage(1);
        setLoading(false);
      } catch (error) {
        console.error('Error loading PDF:', error);
        if (isSubscribed) {
          setError('Impossible de charger le PDF. Veuillez réessayer.');
          setLoading(false);
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
        pdfDocRef.current.cleanup();
        pdfDocRef.current = null;
      }
    };
  }, [url, toast]);

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
      setError('Erreur lors de l\'affichage de la page.');
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors de l'affichage de la page."
      });
    }
  };

  const handleDownload = () => {
    if (!url) return;
    const downloadUrl = url.replace('/preview', '/download');
    window.open(downloadUrl, '_blank');
  };

  const handlePageChange = async (newPage: number) => {
    if (newPage >= 1 && newPage <= numPages) {
      setCurrentPage(newPage);
      await renderPage(newPage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      <div className="flex items-center justify-between p-2 bg-background border rounded-lg">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} sur {numPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const newScale = Math.max(scale - 0.1, 0.5);
              setScale(newScale);
              renderPage(currentPage);
            }}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm w-16 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const newScale = Math.min(scale + 0.1, 3.0);
              setScale(newScale);
              renderPage(currentPage);
            }}
            disabled={scale >= 3.0}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleDownload}
            title="Télécharger le PDF"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative overflow-auto border rounded-lg bg-background">
        <canvas
          ref={canvasRef}
          className="mx-auto"
        />
      </div>
    </div>
  );
}