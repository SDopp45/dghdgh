import { FileText } from "lucide-react";
import { Button } from "./button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DocumentViewerButtonProps {
  documentId: number;
  section: string;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

export function DocumentViewerButton({ documentId, section, className, children, onClick }: DocumentViewerButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    try {
      setIsLoading(true);
      
      if (onClick) {
        onClick();
        return;
      }

      // Verify document exists first
      const response = await fetch(`/api/documents/${documentId}`);
      if (!response.ok) {
        throw new Error('Document non trouvé');
      }
      setShowPreview(true);
    } catch (error) {
      console.error('Error opening document:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible d'ouvrir le document",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!documentId) return null;

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon"
        onClick={handleClick}
        className={className}
        title="Voir le document"
        disabled={isLoading}
      >
        {children || <FileText className="h-4 w-4" />}
      </Button>

      {!onClick && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl h-[90vh]">
            <DialogHeader>
              <DialogTitle>Document</DialogTitle>
            </DialogHeader>
            <div className="flex-1 w-full h-full min-h-[600px] mt-4">
              <iframe
                src={`/api/documents/${documentId}/preview`}
                className="w-full h-full border-0 rounded-md"
                title="Document Preview"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}