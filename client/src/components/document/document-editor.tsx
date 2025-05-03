import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Document } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Pencil, Save } from "lucide-react";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";

interface DocumentEditorProps {
  document: Document;
  onClose?: () => void;
}

export default function DocumentEditor({ document, onClose }: DocumentEditorProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      title: document.title,
    }
  });

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/documents/${document.id}/copy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: form.getValues('title'),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save document');
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/documents'] });

      toast({
        title: "Document sauvegardé",
        description: "Les modifications ont été enregistrées avec succès"
      });

      setIsEditorOpen(false);
      onClose?.();
    } catch (error) {
      console.error("Error saving document:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de sauvegarder le document"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Modifier">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] w-full h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle>Modifier le document</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex justify-between items-center px-6 py-3 border-b bg-muted/40">
              <Input
                {...form.register("title")}
                className="max-w-sm"
                placeholder="Titre du document..."
              />
              <Button type="submit" disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </div>

            <div className="flex-1 overflow-hidden">
              <iframe
                src={document.fileUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}