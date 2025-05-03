import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Save, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface FormField {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'select';
  value: string | boolean;
  required?: boolean;
  label?: string;
}

interface FormWizardProps {
  documentId: string;
  onPreview: () => void;
  onSave: () => void;
}

export function FormWizard({ documentId, onPreview, onSave }: FormWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch form fields avec gestion d'erreur
  const { data: fields = [], isLoading: isLoadingFields, error: fieldsError } = useQuery<FormField[]>({
    queryKey: [`/api/documents/${documentId}/fields`],
    enabled: !!documentId,
    retry: 3,
    onError: (error) => {
      console.error('Error fetching fields:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les champs du formulaire",
        variant: "destructive",
      });
    }
  });

  // Fetch existing form data avec gestion d'erreur
  const { data: existingData, isLoading: isLoadingData, error: dataError } = useQuery<Record<string, any>>({
    queryKey: [`/api/documents/${documentId}/data`],
    enabled: !!documentId,
    retry: 3,
    onError: (error) => {
      console.error('Error fetching existing data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données existantes",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (existingData && !dataError) {
      try {
        setFormData(existingData);
      } catch (error) {
        console.error('Error setting form data:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les données du formulaire",
          variant: "destructive",
        });
      }
    }
  }, [existingData, dataError, toast]);

  const { mutate: saveFormData, isPending: isSaving } = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      try {
        const response = await fetch(`/api/documents/${documentId}/data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          throw new Error('Failed to save form data');
        }

        return response.json();
      } catch (error) {
        console.error('Error in mutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}`] });
      toast({
        title: "Sauvegarde réussie",
        description: "Les données du formulaire ont été sauvegardées."
      });
    },
    onError: (error) => {
      console.error('Error saving form data:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de sauvegarder les données du formulaire."
      });
    }
  });

  // Calculate progress avec vérification
  const totalFields = Array.isArray(fields) ? fields.length : 0;
  const completedFields = Object.keys(formData || {}).length;
  const progress = totalFields ? (completedFields / totalFields) * 100 : 0;

  // Group fields into steps avec vérification
  const steps = Array.isArray(fields) ? Array.from({ length: Math.ceil(fields.length / 3) }, (_, i) => 
    fields.slice(i * 3, (i + 1) * 3)
  ) : [];

  const currentFields = steps[currentStep] || [];

  const handleFieldChange = (name: string, value: string | boolean) => {
    try {
      const newFormData = { ...formData, [name]: value };
      setFormData(newFormData);
      saveFormData(newFormData);
    } catch (error) {
      console.error('Error handling field change:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le champ"
      });
    }
  };

  if (isLoadingFields || isLoadingData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (fieldsError || dataError) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>
              Une erreur est survenue lors du chargement du formulaire
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assistant de remplissage</CardTitle>
        <Progress value={progress} className="w-full" />
        <div className="text-sm text-muted-foreground">
          {completedFields} sur {totalFields} champs remplis
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentFields.map((field) => (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label || field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.type === 'checkbox' ? (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={field.name}
                  checked={!!formData[field.name]}
                  onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
                />
                <label htmlFor={field.name} className="text-sm text-muted-foreground">
                  {field.label || field.name}
                </label>
              </div>
            ) : (
              <Input
                id={field.name}
                type="text"
                value={formData[field.name] || ''}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                className="w-full"
                placeholder={`Entrez ${field.label || field.name}...`}
              />
            )}
          </div>
        ))}

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Précédent
          </Button>

          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={onPreview}
              disabled={completedFields === 0}
            >
              <Eye className="mr-2 h-4 w-4" />
              Aperçu
            </Button>
            <Button
              variant="outline"
              onClick={onSave}
              disabled={completedFields === 0 || isSaving}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
            <Button
              onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
              disabled={currentStep === steps.length - 1}
            >
              Suivant
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {completedFields === totalFields && (
          <Alert className="mt-4">
            <AlertDescription>
              Tous les champs ont été remplis. Vous pouvez maintenant prévisualiser ou sauvegarder le document.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}