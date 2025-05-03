import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Download, FileText, Clock, XCircle, ChevronLeft, ChevronRight, Trash2, AlertCircle, ArrowDown, ArrowUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { SimplePagination } from '@/components/ui/pagination';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
}

interface LinkItem {
  id: string | number;
  title: string;
  clicks: number;
  type: 'link' | 'form';
  formDefinition?: FormField[];
  customColor?: string;
  customTextColor?: string;
  buttonStyle?: string;
  animation?: string;
}

interface LinkProfile {
  accentColor: string;
  textColor: string;
  backgroundColor: string;
  buttonStyle?: string;
  buttonRadius?: number;
  fontFamily?: string;
  animation?: string;
}

interface FormSubmission {
  id: number;
  linkId: number;
  formData: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface FormSubmissionsViewerProps {
  links: LinkItem[];
  profile?: LinkProfile;
}

export function FormSubmissionsViewer({ links, profile }: FormSubmissionsViewerProps) {
  // Filtrer uniquement les liens de type 'form'
  const formLinks = links.filter(link => link.type === 'form');
  const [selectedLinkId, setSelectedLinkId] = useState<string>(String(formLinks[0]?.id || ''));
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'table' | 'cards' | 'debug'>('table');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<FormSubmission | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const selectedLink = formLinks.find(link => String(link.id) === selectedLinkId);
  
  // Styles fixes pour le composant (indépendants du profil)
  const fixedAccentColor = '#3b82f6'; // Bleu
  const fixedTextColor = '#1f2937'; // Gris foncé
  
  useEffect(() => {
    if (selectedLinkId) {
      console.log('Selected link ID:', selectedLinkId);
      console.log('Selected link:', selectedLink);
      console.log('Selected link form definition:', selectedLink?.formDefinition);
      fetchSubmissions(selectedLinkId);
    }
  }, [selectedLinkId]);
  
  const fetchSubmissions = async (linkId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Récupération des réponses pour le formulaire ${linkId}...`);
      const response = await apiRequest(`/api/links/form-submissions/${linkId}`);
      
      console.log('Réponse brute reçue:', JSON.stringify(response));
      
      if (response && response.success && Array.isArray(response.data)) {
        // Vérifier et nettoyer les données pour assurer la conformité
        const validSubmissions = response.data
          .filter((item: any) => item && typeof item === 'object')
          .map((item: any) => {
            console.log('Traitement de la soumission:', JSON.stringify(item));
            
            // Vérifier si formData est un objet ou une chaîne JSON
            let formDataObj = item.formData;
            if (typeof item.formData === 'string') {
              try {
                formDataObj = JSON.parse(item.formData);
                console.log('FormData était une chaîne, convertie en objet:', formDataObj);
              } catch(e) {
                console.error('Erreur lors du parsing de formData:', e);
                formDataObj = {};
              }
            }
            
            return {
              id: item.id,
              linkId: item.linkId,
              formData: formDataObj || {},
              createdAt: item.createdAt || new Date().toISOString()
            };
          });
        
        console.log(`${validSubmissions.length} réponses valides trouvées:`, JSON.stringify(validSubmissions));
        setSubmissions(validSubmissions);
      } else {
        console.error('Format de réponse invalide:', response);
        setError('Format de réponse invalide. Veuillez réessayer.');
        setSubmissions([]);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des réponses:', err);
      
      // Message d'erreur plus descriptif
      let errorMessage = 'Erreur lors de la récupération des réponses';
      if (err instanceof Error) {
        errorMessage += `: ${err.message}`;
      }
      
      setError(errorMessage);
      setSubmissions([]);
      
      // Retry après 3 secondes en cas d'erreur 500 (peut être un problème temporaire)
      if (err instanceof Error && err.message.includes('500')) {
        setTimeout(() => {
          console.log('Nouvelle tentative de récupération après erreur 500...');
          fetchSubmissions(linkId);
        }, 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const exportToCSV = () => {
    if (!submissions.length || !selectedLink?.formDefinition) return;
    
    // Créer les en-têtes
    const headers = selectedLink.formDefinition.map(field => field.label).join(',');
    
    // Créer les données
    const rows = submissions.map(submission => {
      return selectedLink.formDefinition
        ?.map(field => {
          const value = submission.formData[field.id];
          // Échapper les valeurs pour le CSV
          if (value === undefined || value === null) return '';
          return typeof value === 'string' 
            ? `"${value.replace(/"/g, '""')}"`
            : String(value);
        })
        .join(',');
    }).join('\n');
    
    const csv = `${headers}\n${rows}`;
    
    // Créer et télécharger le fichier
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedLink.title}-reponses.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const exportToPdf = () => {
    if (!submissions.length || !selectedLink?.formDefinition) return;
    
    try {
      // Création du document PDF
      const doc = new jsPDF();
      
      // Définir le titre
      doc.setFontSize(16);
      doc.text(`Réponses du formulaire: ${selectedLink.title}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Exporté le ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}`, 14, 22);
      
      // Préparer les données pour le tableau
      const headers = ['Date'].concat(selectedLink.formDefinition.map(field => field.label));
      
      const data = submissions.map(submission => {
        // Première colonne: date
        const rowData = [format(new Date(submission.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })];
        
        // Ajouter les données de chaque champ
        selectedLink.formDefinition?.forEach(field => {
          const value = submission.formData[field.id];
          rowData.push(value !== undefined && value !== null ? String(value) : '-');
        });
        
        return rowData;
      });
      
      // Générer le tableau
      autoTable(doc, {
        head: [headers],
        body: data,
        startY: 30,
        theme: 'grid',
        headStyles: {
          fillColor: [59, 130, 246], // Bleu
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8,
          cellPadding: 3
        }
      });
      
      // Sauvegarder le PDF
      doc.save(`${selectedLink.title}-reponses.pdf`);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
    }
  };
  
  const handleDeleteClick = (submission: FormSubmission) => {
    setSubmissionToDelete(submission);
    setIsDeleteDialogOpen(true);
  };
  
  const toggleSortDirection = () => {
    // Inverser la direction du tri
    const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    setSortDirection(newDirection);
    
    // Réinitialiser à la première page après le tri
    setCurrentPage(1);
  };
  
  const sortSubmissions = (submissionsToSort: FormSubmission[]) => {
    return [...submissionsToSort].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      
      return sortDirection === 'asc' 
        ? dateA - dateB // Ordre croissant (anciens en premier)
        : dateB - dateA; // Ordre décroissant (récents en premier)
    });
  };
  
  const confirmDelete = async () => {
    if (!submissionToDelete) return;
    
    setIsDeleting(true);
    
    try {
      console.log(`Suppression de la réponse ${submissionToDelete.id}...`);
      const response = await apiRequest(`/api/links/form-submissions/${submissionToDelete.id}`, {
        method: 'DELETE'
      });
      
      if (response && response.success) {
        // Retirer la soumission de la liste locale
        setSubmissions(prevSubmissions => 
          prevSubmissions.filter(s => s.id !== submissionToDelete.id)
        );
        
        // Ajuster la page courante si nécessaire
        const remainingItems = submissions.length - 1;
        const newTotalPages = Math.ceil(remainingItems / itemsPerPage);
        if (currentPage > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages);
        }
        
        console.log('Réponse supprimée avec succès');
      } else {
        console.error('Erreur lors de la suppression:', response);
        setError('Erreur lors de la suppression. Veuillez réessayer.');
      }
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      let errorMessage = 'Erreur lors de la suppression';
      if (err instanceof Error) {
        errorMessage += `: ${err.message}`;
      }
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setSubmissionToDelete(null);
    }
  };
  
  const renderBasicData = () => {
    if (!submissions || submissions.length === 0) {
      return <div>Aucune donnée</div>;
    }
    
    // Récupérer toutes les clés uniques de toutes les soumissions
    const allKeys = Array.from(
      new Set(
        submissions.flatMap(submission => 
          Object.keys(submission.formData || {})
        )
      )
    );
    
    // Définir les en-têtes avec les labels si disponibles
    const headers = allKeys.map(key => {
      // Chercher le label correspondant à cet ID de champ dans la définition du formulaire
      const fieldDef = selectedLink?.formDefinition?.find(field => field.id === key);
      return {
        key,
        label: fieldDef?.label || `Champ (${key})`
      };
    });
    
    // Trier toutes les soumissions par date
    const sortedSubmissions = sortSubmissions(submissions);
    
    // Calculer le nombre total de pages
    const totalPages = Math.ceil(sortedSubmissions.length / itemsPerPage);
    
    // Obtenir les submissions pour la page actuelle
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedSubmissions = sortedSubmissions.slice(startIndex, endIndex);
    
    const handlePageChange = (page: number) => {
      setCurrentPage(page);
      window.scrollTo(0, 0);
    };
    
    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-gray-800">Données brutes</h3>
          <Badge 
            variant="secondary" 
            className="ml-2 bg-blue-100 text-blue-800 border-blue-200"
          >
            {submissions.length} {submissions.length > 1 ? 'réponses' : 'réponse'}
          </Badge>
        </div>
        
        <div className="rounded-md border border-gray-200">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead 
                  className="whitespace-nowrap font-medium cursor-pointer text-blue-700"
                  onClick={toggleSortDirection}
                >
                  <div className="flex items-center space-x-1">
                    <span>Date</span>
                    {sortDirection === 'asc' ? (
                      <ArrowUp className="h-3.5 w-3.5 text-blue-500" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-blue-500" />
                    )}
                  </div>
                </TableHead>
                {headers.map(header => (
                  <TableHead key={header.key} className="whitespace-nowrap font-medium text-blue-700">
                    {header.label}
                  </TableHead>
                ))}
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSubmissions.map((submission, idx) => (
                <TableRow key={submission.id || idx} className="hover:bg-gray-50">
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-2 text-gray-400" />
                      <span className="text-gray-700">{format(new Date(submission.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
                    </div>
                  </TableCell>
                  {headers.map(header => (
                    <TableCell key={header.key} className="text-gray-700">
                      {submission.formData && submission.formData[header.key] !== undefined 
                        ? String(submission.formData[header.key])
                        : <span className="text-gray-400 italic">-</span>}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteClick(submission)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Supprimer</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {submissions.length > itemsPerPage && (
          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center space-x-2">
              <Select
                value={String(itemsPerPage)}
                onValueChange={(val) => {
                  setItemsPerPage(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[180px] border-gray-200">
                  <SelectValue placeholder="Lignes par page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 lignes par page</SelectItem>
                  <SelectItem value="10">10 lignes par page</SelectItem>
                  <SelectItem value="20">20 lignes par page</SelectItem>
                  <SelectItem value="50">50 lignes par page</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="text-sm text-gray-500">
                Affichage de {startIndex + 1}-{Math.min(endIndex, submissions.length)} sur {submissions.length}
              </div>
            </div>
            
            <SimplePagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={handlePageChange} 
            />
          </div>
        )}
        
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer définitivement cette réponse ? 
                Cette action ne peut pas être annulée.
              </DialogDescription>
            </DialogHeader>
            
            <div className="my-4 p-4 border rounded-md bg-red-50 flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-700">Attention</p>
                <p className="text-gray-600">
                  Toutes les données associées à cette réponse seront définitivement supprimées.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
                className="border-gray-300 text-gray-700"
              >
                Annuler
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };
  
  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="flex-1">
            <Select value={selectedLinkId} onValueChange={setSelectedLinkId}>
              <SelectTrigger className="w-full sm:w-[300px] border-gray-200">
                <SelectValue placeholder="Sélectionner un formulaire" />
              </SelectTrigger>
              <SelectContent>
                {formLinks.map(link => (
                  <SelectItem key={link.id} value={String(link.id)}>
                    {link.title} ({link.clicks} réponse{link.clicks !== 1 ? 's' : ''})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToCSV} 
              disabled={isLoading || submissions.length === 0}
              className="border-gray-200 text-blue-600 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToPdf} 
              disabled={isLoading || submissions.length === 0}
              className="border-gray-200 text-blue-600 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter PDF
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="font-medium mb-2">Erreur</h3>
            <p className="text-sm text-gray-500">{error}</p>
            <Button 
              onClick={() => fetchSubmissions(selectedLinkId)} 
              variant="outline" 
              size="sm"
              className="mt-4 border-gray-200 hover:border-gray-300"
            >
              Réessayer
            </Button>
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="font-medium mb-2">Aucune réponse</h3>
            <p className="text-sm text-gray-500">
              Ce formulaire n'a pas encore reçu de réponses.
            </p>
          </div>
        ) : (
          renderBasicData()
        )}
      </CardContent>
    </Card>
  );
} 