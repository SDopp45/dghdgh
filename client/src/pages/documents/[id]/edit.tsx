import { useParams, Link, useLocation } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Document } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { FormWizard } from "@/components/document/form-wizard";
import { PDFViewer } from "@/components/document/pdf-viewer";
import { useState } from "react";
import { PdfViewerDialog } from "@/components/document/pdf-viewer-dialog";

interface PDFAnnotation {
  type: 'text' | 'highlight' | 'drawing';
  content: string;
  position: { x: number; y: number };
  page: number;
}

export default function EditDocumentPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [annotations, setAnnotations] = useState<PDFAnnotation[]>([]);

  // Fetch document data
  const { data: document, isLoading } = useQuery<Document>({
    queryKey: [`/api/documents/${id}`],
    enabled: !!id,
    onError: (error) => {
      console.error('Error fetching document:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger le document."
      });
    }
  });

  // Fetch form data
  const { data: formData } = useQuery<Record<string, any>>({
    queryKey: [`/api/documents/${id}/data`],
    enabled: !!id,
  });

  // Save annotations mutation
  const { mutate: saveAnnotations } = useMutation({
    mutationFn: async (annotations: PDFAnnotation[]) => {
      const response = await fetch(`/api/documents/${id}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annotations })
      });
      if (!response.ok) throw new Error('Failed to save annotations');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}`] });
      toast({
        title: "Annotations sauvegardées",
        description: "Les annotations ont été sauvegardées avec succès."
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de sauvegarder les annotations."
      });
    }
  });

  const handleSaveAsNew = async () => {
    if (!document || !formData) return;

    try {
      const response = await fetch(`/api/documents/${id}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData,
          annotations
        })
      });

      if (!response.ok) throw new Error('Erreur lors de la création');

      const newDoc = await response.json();

      // Invalidate documents cache
      await queryClient.invalidateQueries({ queryKey: ['/api/documents'] });

      toast({
        title: "Document créé",
        description: "Une nouvelle version du document a été créée avec les données du formulaire."
      });

      // Redirect to the new document
      setLocation(`/documents/${newDoc.id}/edit`);
    } catch (error) {
      console.error('Error creating document copy:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer une nouvelle version du document."
      });
    }
  };

  const handleAnnotationChange = (newAnnotations: PDFAnnotation[]) => {
    setAnnotations(newAnnotations);
    saveAnnotations(newAnnotations);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card className="animate-pulse">
          <CardHeader className="h-[100px] bg-muted" />
          <CardContent className="h-[200px] bg-muted/50" />
        </Card>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center h-[500px]">
            <p className="text-muted-foreground">Document non trouvé</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/documents">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
        </Link>
        <Button onClick={handleSaveAsNew} className="gap-2">
          <Save className="h-4 w-4" />
          Sauvegarder comme nouveau document
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{document.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <PDFViewer
                url={document.fileUrl}
                className="h-[70vh]"
                onAnnotationChange={handleAnnotationChange}
              />
            </CardContent>
          </Card>
        </div>

        <div>
          <FormWizard
            documentId={id}
            onPreview={() => setPreviewOpen(true)}
            onSave={handleSaveAsNew}
          />
        </div>
      </div>

      {previewOpen && document && (
        <PdfViewerDialog
          fileUrl={document.fileUrl}
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}