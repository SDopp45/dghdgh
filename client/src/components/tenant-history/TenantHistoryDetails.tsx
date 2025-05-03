import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  Edit,
  FileText,
  Star as StarIcon,
  User,
  Home,
  Calendar,
  Tag,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { formatDate, getRelativeTime } from '@/lib/date-utils';
import { TenantHistoryEntry, TenantHistoryEventType, TenantHistoryDetailsProps } from '@/types/tenant-history';
import { getEventTypeIcon, getEventTypeLabel } from './TenantHistoryTable';

const TenantHistoryDetails: React.FC<TenantHistoryDetailsProps> = ({
  id,
  isOpen,
  onClose,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const { toast } = useToast();
  
  // Récupération des détails de l'entrée
  const { data: entry, isLoading, error } = useQuery({
    queryKey: ['tenantHistoryEntry', id],
    queryFn: async () => {
      const response = await fetch(`/api/tenant-history/${id}`);
      if (!response.ok) {
        throw new Error("Impossible de récupérer les détails de l'entrée");
      }
      return await response.json() as TenantHistoryEntry;
    },
    enabled: isOpen && id > 0,
  });
  
  // Récupération des documents associés
  const { data: documents, isLoading: isLoadingDocs } = useQuery({
    queryKey: ['tenantHistoryDocuments', id],
    queryFn: async () => {
      const response = await fetch(`/api/tenant-history/${id}/documents`);
      if (!response.ok) {
        return [];
      }
      return await response.json() as Array<{
        id: number;
        name: string;
        url: string;
        size: number;
        createdAt: string;
      }>;
    },
    enabled: isOpen && id > 0,
  });
  
  const renderRatingStars = (rating: number | null) => {
    if (rating === null) return <span className="text-gray-400">Non évalué</span>;
    
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <StarIcon 
          key={i}
          className={`h-5 w-5 ${i <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
        />
      );
    }
    
    return <div className="flex space-x-1">{stars}</div>;
  };
  
  const handleDownloadDocument = (docId: number, fileName: string) => {
    // Simulation du téléchargement d'un document
    toast({
      title: "Téléchargement lancé",
      description: `Téléchargement de ${fileName} en cours...`,
    });
  };
  
  if (!isOpen) return null;
  
  const loading = isLoading || !entry;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {loading ? (
              "Chargement des détails..."
            ) : (
              <div className="flex items-center space-x-2">
                <span className="p-1 rounded-full bg-gray-100">
                  {getEventTypeIcon(entry.eventType)}
                </span>
                <span>
                  {getEventTypeLabel(entry.eventType)}
                </span>
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            {loading ? (
              "Veuillez patienter..."
            ) : (
              <>
                <span className="text-sm text-muted-foreground">
                  {formatDate(entry.date || entry.createdAt, true)} ({getRelativeTime(entry.date || entry.createdAt)})
                </span>
                {entry.isOrphaned && (
                  <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-200">
                    Orphelin
                  </Badge>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Détails</TabsTrigger>
              <TabsTrigger value="documents">
                Documents
                {documents && documents.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {documents.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Locataire
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(entry.tenantName || 
                      entry.tenantFullName || 
                      entry.tenant?.user?.fullName ||
                      entry.userName) ? (
                      <p className="font-medium">
                        {entry.tenantName || 
                         entry.tenantFullName || 
                         entry.tenant?.user?.fullName ||
                         entry.userName}
                      </p>
                    ) : (
                      <p className="text-gray-500 italic">Non défini</p>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Home className="h-4 w-4 mr-2" />
                      Propriété
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(entry.propertyName || 
                      entry.property?.name || 
                      entry.property?.address) ? (
                      <p className="font-medium">
                        {entry.propertyName || 
                         entry.property?.name || 
                         entry.property?.address}
                      </p>
                    ) : (
                      <p className="text-gray-500 italic">Non définie</p>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {entry.rating !== null && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <StarIcon className="h-4 w-4 mr-2" />
                      Évaluation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center space-y-2">
                      <div className="text-2xl font-bold">{entry.rating}/5</div>
                      {renderRatingStars(entry.rating)}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{entry.description || entry.feedback || "Aucune description fournie"}</p>
                </CardContent>
              </Card>
              
              {entry.eventTags && entry.eventTags.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Tag className="h-4 w-4 mr-2" />
                      Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {entry.eventTags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Créé le</span>
                    <span>{formatDate(entry.createdAt, true)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mis à jour le</span>
                    <span>{entry.updatedAt ? formatDate(entry.updatedAt, true) : formatDate(entry.createdAt, true)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Statut</span>
                    <Badge variant={entry.status === 'archived' ? 'outline' : 'secondary'}>
                      {entry.status === 'active' ? 'Actif' : 
                       entry.status === 'archived' ? 'Archivé' : 'Orphelin'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="documents" className="pt-4">
              {isLoadingDocs ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : documents && documents.length > 0 ? (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <Card key={doc.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-8 w-8 text-blue-500" />
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(doc.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadDocument(doc.id, doc.name)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 flex flex-col items-center justify-center space-y-2">
                    <FileText className="h-12 w-12 text-gray-400" />
                    <p className="text-muted-foreground text-center">
                      Aucun document associé à cette entrée
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          {!loading && onEdit && (
            <Button onClick={() => onEdit(entry)}>
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TenantHistoryDetails;