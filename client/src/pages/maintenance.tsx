import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableRow, TableHeader } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AddMaintenanceDialog } from "@/components/maintenance/add-maintenance-dialog";
import { EditMaintenanceDialog } from "@/components/maintenance/edit-maintenance-dialog";
import { Progress } from "@/components/ui/progress";
import { CircleSlash, Clock, AlertTriangle, CheckCircle2, Trash2, Download, MoreVertical, Pencil, FileText, Check, Plus, Wrench, Settings, Search, Loader2, Filter, SlidersHorizontal, RefreshCw, CalendarIcon, EuroIcon, EyeIcon, ChevronDown, CreditCard, User } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ExportMenu } from "@/components/data-export/ExportMenu";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel,
    SelectSeparator,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { MaintenanceStats } from "@/components/maintenance/maintenance-stats";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

const ITEMS_PER_PAGE = 5;

const statusColors = {
    "open": "bg-yellow-100 text-yellow-800 hover:bg-yellow-200/50 border-yellow-200",
    "in_progress": "bg-blue-100 text-blue-800 hover:bg-blue-200/50 border-blue-200",
    "completed": "bg-green-100 text-green-800 hover:bg-green-200/50 border-green-200"
};

const statusIcons = {
    "open": <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />,
    "in_progress": <Clock className="h-3.5 w-3.5 text-blue-500" />,
    "completed": <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
};

const statusLabels = {
    "open": "Ouvert",
    "in_progress": "En cours",
    "completed": "Terminé"
};

const priorityColors = {
    high: {
        bg: "bg-red-100",
        text: "text-red-800",
        border: "border-red-200",
        hover: "hover:bg-red-200/50"
    },
    medium: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        border: "border-yellow-200",
        hover: "hover:bg-yellow-200/50"
    },
    low: {
        bg: "bg-green-100",
        text: "text-green-800",
        border: "border-green-200",
        hover: "hover:bg-green-200/50"
    }
};

const MaintenanceTable = ({ requests, showAll = false, queryClient, toast }: { requests: any[], showAll?: boolean, queryClient: any, toast: any }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [maintenanceToDelete, setMaintenanceToDelete] = useState<any | null>(null);
    const [deleteWithDocument, setDeleteWithDocument] = useState(false);
    const [deleteTransaction, setDeleteTransaction] = useState(false);
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmDeleteChecked, setConfirmDeleteChecked] = useState(false);
    const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
    const [displayCounts, setDisplayCounts] = useState({
        high: ITEMS_PER_PAGE,
        medium: ITEMS_PER_PAGE,
        low: ITEMS_PER_PAGE
    });
    const [showTransactionDialog, setShowTransactionDialog] = useState(false);
    const [selectedMaintenance, setSelectedMaintenance] = useState<any>(null);
    
    // Nouvel état pour la confirmation de changement de statut
    const [showStatusConfirmDialog, setShowStatusConfirmDialog] = useState(false);
    const [statusChangeData, setStatusChangeData] = useState<{ request: any, newStatus: string, updateProperty: boolean }>({ 
        request: null, 
        newStatus: '', 
        updateProperty: true 
    });
    
    // États pour la prévisualisation des documents
    const [showPreview, setShowPreview] = useState(false);
    const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
    const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);

    const [transactionDescription, setTransactionDescription] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
    const [selectedDocumentsForTransaction, setSelectedDocumentsForTransaction] = useState<number[]>([]);

    const createTransactionMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Erreur lors de la création de la transaction');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
            toast({
                title: "✨ Transaction créée",
                description: "La transaction a été créée avec succès.",
                className: "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20",
            });
            setShowTransactionDialog(false);
            setSelectedMaintenance(null);
        },
        onError: () => {
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible de créer la transaction."
            });
        },
    });

    const handleStatusChange = (request: any, newStatus: string) => {
        if (newStatus === "in_progress" && request.status !== "in_progress") {
            // Si passage au statut "en cours", demander confirmation pour la mise à jour de la propriété
            setStatusChangeData({
                request, 
                newStatus, 
                updateProperty: true
            });
            setShowStatusConfirmDialog(true);
        } else {
            // Pour les autres changements de statut, procéder directement
            handleStatusUpdate(request, newStatus, true);
        }
    };

    const handleStatusUpdate = async (request: any, newStatus: string, updateProperty: boolean = true) => {
        try {
            const response = await fetch(`/api/maintenance/${request.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: newStatus,
                    documentId: request.documentId,
                    updateProperty: updateProperty // Ce flag sera traité côté serveur
                }),
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la mise à jour du statut');
            }

            queryClient.invalidateQueries({ queryKey: ['/api/maintenance'] });
            queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
            
            toast({
                title: "Statut mis à jour",
                description: newStatus === "in_progress" && updateProperty ? 
                    "Le statut de la demande et de la propriété ont été mis à jour." :
                    "Le statut de la demande a été mis à jour."
            });

            if (newStatus === "completed" && request.totalCost) {
                setSelectedMaintenance(request);
                setTransactionDescription(`Maintenance - ${request.title}${request.description ? ': ' + request.description : ''}`);
                setPaymentMethod("bank_transfer");
                
                // Initialiser avec tous les documents sélectionnés par défaut
                if (request.documentIds && request.documentIds.length > 0) {
                    setSelectedDocumentsForTransaction(request.documentIds);
                } else if (request.documentId) {
                    setSelectedDocumentsForTransaction([request.documentId]);
                } else {
                    setSelectedDocumentsForTransaction([]);
                }
                
                setShowTransactionDialog(true);
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible de mettre à jour le statut de la demande."
            });
        }
    };

    const handleCreateTransaction = () => {
        if (!selectedMaintenance) return;

        createTransactionMutation.mutate({
            amount: parseFloat(selectedMaintenance.totalCost),
            type: "expense",
            category: "maintenance",
            description: transactionDescription,
            propertyId: selectedMaintenance.propertyId,
            date: new Date().toISOString(),
            status: "completed",
            paymentMethod: paymentMethod,
            documentIds: selectedDocumentsForTransaction.length > 0 ? selectedDocumentsForTransaction : undefined
        });
    };
    
    // Fonction pour gérer la prévisualisation des documents
    const handlePreviewDocument = (documentId: number | null, documentIds?: number[]) => {
        // Cas 1: Pas de document
        if (!documentId && (!documentIds || documentIds.length === 0)) {
            toast({
                title: "Information",
                description: "Aucun document disponible pour cette demande de maintenance",
                variant: "default",
            });
            return;
        }
        
        // Cas 2: Plusieurs documents
        if (documentIds && documentIds.length > 0) {
            setSelectedDocIds(documentIds);
            setCurrentDocumentIndex(0);
            setSelectedDocumentId(documentIds[0]);
        } 
        // Cas 3: Document unique
        else if (documentId) {
            setSelectedDocumentId(documentId);
            setSelectedDocIds([documentId]);
            setCurrentDocumentIndex(0);
        }
        
        setShowPreview(true);
    };

    const handleDeleteClick = (request: any) => {
        setMaintenanceToDelete(request);
        setDeleteWithDocument(false);
        setDeleteTransaction(false);
        setConfirmDeleteChecked(false);
        setShowDeleteAlert(true);
    };

    const handleDelete = async () => {
        if (!maintenanceToDelete) return;

        try {
            setIsDeleting(true);
            // Gestion de la suppression des documents
            if (deleteWithDocument) {
                // Cas 1: Utiliser documentIds si disponible (plusieurs documents)
                if (maintenanceToDelete.documentIds && maintenanceToDelete.documentIds.length > 0) {
                    // Supprimer chaque document 
                    for (const docId of maintenanceToDelete.documentIds) {
                        await fetch(`/api/documents/${docId}`, {
                            method: 'DELETE',
                            credentials: 'include'
                        });
                    }
                }
                // Cas 2: Utiliser documentId unique si disponible et pas de documentIds
                else if (maintenanceToDelete.documentId) {
                    await fetch(`/api/documents/${maintenanceToDelete.documentId}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });
                }
            }

            // Gestion de la suppression de la transaction
            if (maintenanceToDelete.status === "completed" && deleteTransaction) {
                try {
                    // Rechercher la transaction avec la description exacte
                    const description = `Maintenance - ${maintenanceToDelete.title}`;
                    console.log("Searching for transaction with description:", description);

                    const searchResponse = await fetch(`/api/transactions?category=maintenance&description=${encodeURIComponent(description)}`, {
                        credentials: 'include'
                    });

                    if (!searchResponse.ok) {
                        throw new Error('Erreur lors de la recherche de la transaction');
                    }

                    const transactions = await searchResponse.json();
                    console.log("Found transactions:", transactions);

                    if (transactions && transactions.length > 0) {
                        console.log("Found transaction to delete:", transactions[0]);

                        const deleteResponse = await fetch(`/api/transactions/${transactions[0].id}`, {
                            method: 'DELETE',
                            credentials: 'include'
                        });

                        if (!deleteResponse.ok) {
                            throw new Error('Erreur lors de la suppression de la transaction');
                        }

                        console.log("Transaction deleted successfully");

                        // Invalider le cache des transactions immédiatement
                        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
                    } else {
                        console.log("No matching transaction found");
                    }
                } catch (error) {
                    console.error("Error handling transaction deletion:", error);
                    toast({
                        variant: "destructive",
                        title: "Erreur",
                        description: "Impossible de supprimer la transaction associée."
                    });
                }
            }

            // Suppression de la maintenance
            const response = await fetch(`/api/maintenance/${maintenanceToDelete.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Erreur lors de la suppression');

            // Mettre à jour les caches
            queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
            queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });

            toast({
                title: "✨ Suppression réussie !",
                description: (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2"
                    >
                        <Check className="h-5 w-5 text-green-500" />
                        <span>La demande a été supprimée avec succès</span>
                    </motion.div>
                ),
                className: "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20",
            });

            setShowDeleteAlert(false);
            setMaintenanceToDelete(null);
            setDeleteWithDocument(false);
            setDeleteTransaction(false);
            setIsDeleting(false);
        } catch (error) {
            console.error("Error during deletion:", error);
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible de supprimer la demande de maintenance."
            });
        }
    };

    const renderPrioritySection = (requests: any[], priority: 'high' | 'medium' | 'low') => {
        const filteredRequests = requests.filter(r => r.priority === priority);
        if (filteredRequests.length === 0) return null;

        const priorityTitles = {
            high: "Priorité haute",
            medium: "Priorité moyenne",
            low: "Priorité basse"
        };

        const priorityIcons = {
            high: <AlertTriangle className="h-5 w-5 text-red-500" />,
            medium: <Clock className="h-5 w-5 text-yellow-500" />,
            low: <Wrench className="h-5 w-5 text-green-500" />
        };

        const displayedRequests = showAll ? filteredRequests : filteredRequests.slice(0, displayCounts[priority]);

        return (
            <div className="mb-8">
                <div className={`p-4 mb-4 rounded-lg bg-white border ${priorityColors[priority].border} shadow-sm`}>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        {priorityIcons[priority]}
                        {priorityTitles[priority]} ({filteredRequests.length})
                    </h3>
                </div>

                <Card className="border border-gray-200 shadow-sm overflow-hidden bg-white dark:bg-card">
                    <CardContent className="p-0">
                <Table>
                            <TableHeader className="bg-gray-50/50 dark:bg-muted/20">
                                <TableRow className="hover:bg-gray-50/80 dark:hover:bg-muted/30">
                            <TableHead className="text-gray-700 dark:text-muted-foreground">Date</TableHead>
                            <TableHead className="text-gray-700 dark:text-muted-foreground">Signalé par</TableHead>
                            <TableHead className="text-gray-700 dark:text-muted-foreground">Propriété</TableHead>
                                    <TableHead className="min-w-[300px] text-gray-700 dark:text-muted-foreground">Problème</TableHead>
                            <TableHead className="text-gray-700 dark:text-muted-foreground">Statut</TableHead>
                            <TableHead className="text-gray-700 dark:text-muted-foreground">Coût</TableHead>
                            <TableHead className="text-right text-gray-700 dark:text-muted-foreground">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayedRequests.map((request) => (
                                    <TableRow key={request.id} className="hover:bg-gray-50/60 transition-colors">
                                        <TableCell className="font-medium">{format(new Date(request.createdAt), 'd MMM yyyy', { locale: fr })}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                                                    <User className="h-3 w-3 text-blue-500" />
                                                </div>
                                                <span>{request.reportedBy || 'N/A'}</span>
                                            </div>
                                        </TableCell>
                                <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                                                    <Wrench className="h-4 w-4 text-red-500" />
                                                </div>
                                                <span>{request.property?.name || 'N/A'}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-orange-300">{request.title}</p>
                                                <div className="flex items-start gap-1">
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                                                        {request.description?.length > 60 
                                                            ? `${request.description.substring(0, 60)}...` 
                                                            : request.description}
                                                    </p>
                                                    {request.description?.length > 60 && (
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-5 w-5 -mt-1.5 hover:bg-red-100/50 rounded-full p-0"
                                                                    title="Voir la description complète"
                                                                >
                                                                    <EyeIcon className="h-3.5 w-3.5 text-red-500" />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent 
                                                                className="w-[300px] p-4 bg-white border border-red-100 shadow-md dark:bg-card dark:border-border" 
                                                                side="right" 
                                                                align="start" 
                                                                sideOffset={5}
                                                            >
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-2 pb-2 border-b border-red-100 dark:border-border">
                                                                        <Wrench className="h-4 w-4 text-red-500" />
                                                                        <h4 className="font-medium text-sm text-gray-900 dark:text-foreground">{request.title}</h4>
                                                </div>
                                                                    <p className="text-sm leading-relaxed text-gray-700 dark:text-muted-foreground whitespace-pre-wrap max-h-[300px] overflow-y-auto overflow-wrap-break-word hyphens-auto">
                                                                        {request.description}
                                                                    </p>
                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    )}
                                                </div>
                                                </div>
                                </TableCell>
                                <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className={`px-2 py-1 h-auto w-[110px] flex items-center justify-center gap-1.5 rounded ${statusColors[request.status as keyof typeof statusColors]}`}>
                                                        {statusIcons[request.status as keyof typeof statusIcons]}
                                                        <span>{statusLabels[request.status as keyof typeof statusLabels]}</span>
                                                        <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" />
                                            </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="center" className="w-[150px]">
                                                    <DropdownMenuItem 
                                                        onClick={() => handleStatusChange(request, "open")}
                                                        className={`flex items-center gap-2 ${request.status === "open" ? "bg-yellow-50 text-yellow-800" : ""}`}
                                                        disabled={request.status === "open"}
                                                    >
                                                        <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                                                        <span>Ouvert</span>
                                                        {request.status === "open" && <Check className="h-3.5 w-3.5 ml-auto text-yellow-500" />}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        onClick={() => handleStatusChange(request, "in_progress")}
                                                        className={`flex items-center gap-2 ${request.status === "in_progress" ? "bg-blue-50 text-blue-800" : ""}`}
                                                        disabled={request.status === "in_progress"}
                                                    >
                                                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                                                        <span>En cours</span>
                                                        {request.status === "in_progress" && <Check className="h-3.5 w-3.5 ml-auto text-blue-500" />}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        onClick={() => handleStatusChange(request, "completed")}
                                                        className={`flex items-center gap-2 ${request.status === "completed" ? "bg-green-50 text-green-800" : ""}`}
                                                        disabled={request.status === "completed"}
                                                    >
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                                        <span>Terminé</span>
                                                        {request.status === "completed" && <Check className="h-3.5 w-3.5 ml-auto text-green-500" />}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {request.totalCost ? 
                                                <div className="flex items-center gap-1.5">
                                                    <EuroIcon className="h-3.5 w-3.5 text-emerald-500" />
                                                    <span className="text-emerald-700 font-medium">{Number(request.totalCost).toLocaleString('fr-FR')}</span>
                                                </div> : 
                                                <span className="text-gray-400">N/A</span>
                                            }
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-2">
                                        {/* Vérifier si nous avons des documentIds (plusieurs documents) ou un documentId unique */}
                                        {((request.documentIds && request.documentIds.length > 0) || request.documentId) && (
                                            <Button
                                                        variant="outline"
                                                size="icon"
                                                onClick={() => {
                                                    // Si nous avons des documentIds (tableau), on passe le tableau entier
                                                    if (request.documentIds && request.documentIds.length > 0) {
                                                        handlePreviewDocument(request.documentIds[0], request.documentIds);
                                                    } 
                                                    // Sinon, on passe le documentId unique
                                                    else if (request.documentId) {
                                                        handlePreviewDocument(request.documentId);
                                                    }
                                                }}
                                                        className="relative h-8 w-8 border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 transition-colors"
                                                title={request.documentIds && request.documentIds.length > 1 
                                                    ? `Voir les documents (${request.documentIds.length})` 
                                                    : "Voir le document"}
                                            >
                                                        <FileText className="h-4 w-4 text-blue-600" />
                                                {/* Afficher un badge avec le nombre de documents si > 1 */}
                                                {request.documentIds && request.documentIds.length > 1 && (
                                                            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center shadow-sm">
                                                        {request.documentIds.length}
                                                    </span>
                                                )}
                                            </Button>
                                        )}

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 border-gray-200 hover:bg-gray-100/80"
                                                        >
                                                            <ChevronDown className="h-4 w-4 text-gray-500" />
                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild>
                                                            <EditMaintenanceDialog request={request}>
                                                                <div className="flex items-center px-2 py-1.5 cursor-pointer hover:bg-blue-50 rounded-sm transition-colors">
                                                                    <Pencil className="h-4 w-4 mr-2 text-blue-500" />
                                                                    <span className="text-blue-700">Modifier la maintenance</span>
                                                                </div>
                                                            </EditMaintenanceDialog>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleDeleteClick(request)}
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 focus:bg-red-50 rounded-sm"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                                                            <span className="font-medium">Supprimer la maintenance</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                    </CardContent>
                </Card>

                {!showAll && filteredRequests.length > displayCounts[priority] && (
                    <div className="mt-4 flex justify-center">
                        <Button
                            variant="outline"
                            onClick={() => setDisplayCounts({
                                ...displayCounts,
                                [priority]: displayCounts[priority] + ITEMS_PER_PAGE
                            })}
                            className={`border-${priorityColors[priority].border.split('-')[1]} hover:bg-${priorityColors[priority].bg.split('-')[1]} ${priorityColors[priority].text} transition-colors shadow-sm`}
                        >
                            <Plus className={`h-4 w-4 mr-2 ${priorityColors[priority].text}`} />
                            Afficher plus
                        </Button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div>
            {['high', 'medium', 'low'].map((priority) =>
                renderPrioritySection(requests, priority as 'high' | 'medium' | 'low')
            )}
            
            {/* Dialog de confirmation de changement de statut */}
            <AlertDialog open={showStatusConfirmDialog} onOpenChange={setShowStatusConfirmDialog}>
                <AlertDialogContent className="max-w-md bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 from-white to-blue-50/50 border dark:border-blue-900/50 border-blue-100">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl text-blue-600 dark:text-blue-400 flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Mise en maintenance
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-700 dark:text-gray-300">
                            <p className="mb-4">
                                Vous êtes sur le point de passer cette demande en statut "En cours".
                            </p>
                            
                            <div className="p-3 border border-blue-200 dark:border-blue-900/50 rounded-md bg-blue-50/50 dark:bg-blue-900/20 mb-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="updateProperty"
                                        checked={statusChangeData.updateProperty}
                                        onCheckedChange={(checked) => setStatusChangeData({
                                            ...statusChangeData,
                                            updateProperty: checked as boolean
                                        })}
                                        className="border-blue-400 text-blue-600 dark:border-blue-600 dark:text-blue-500"
                                    />
                                    <label
                                        htmlFor="updateProperty"
                                        className="text-sm font-medium leading-none text-blue-800 dark:text-blue-400 cursor-pointer select-none"
                                    >
                                        Déplacer la propriété dans l'onglet "Maintenance"
                                    </label>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 pl-6">
                                    La propriété sera affichée dans l'onglet "Maintenance" jusqu'à ce que toutes les demandes en cours soient terminées.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-100 dark:border-blue-900/50"
                        >
                            Annuler
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                const { request, newStatus, updateProperty } = statusChangeData;
                                setShowStatusConfirmDialog(false);
                                handleStatusUpdate(request, newStatus, updateProperty);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
                        >
                            Confirmer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* Document Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-4xl h-[90vh]">
                    <DialogHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <DialogTitle>
                                {selectedDocIds.length > 1 
                                    ? `Document ${currentDocumentIndex + 1}/${selectedDocIds.length}` 
                                    : "Document de maintenance"}
                            </DialogTitle>
                            {selectedDocIds.length > 1 && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-600">
                                    {selectedDocIds.length} documents
                                </Badge>
                            )}
                        </div>
                        
                        {selectedDocIds.length > 1 && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentDocumentIndex === 0}
                                    onClick={() => {
                                        if (currentDocumentIndex > 0) {
                                            setCurrentDocumentIndex(currentDocumentIndex - 1);
                                            setSelectedDocumentId(selectedDocIds[currentDocumentIndex - 1]);
                                        }
                                    }}
                                    className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m15 18-6-6 6-6" />
                                    </svg>
                                </Button>
                                <span className="text-sm text-gray-500">
                                    {currentDocumentIndex + 1} / {selectedDocIds.length}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentDocumentIndex === selectedDocIds.length - 1}
                                    onClick={() => {
                                        if (currentDocumentIndex < selectedDocIds.length - 1) {
                                            setCurrentDocumentIndex(currentDocumentIndex + 1);
                                            setSelectedDocumentId(selectedDocIds[currentDocumentIndex + 1]);
                                        }
                                    }}
                                    className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m9 18 6-6-6-6" />
                                    </svg>
                                </Button>
                            </div>
                        )}
                    </DialogHeader>
                    <div className="flex-1 w-full h-full min-h-[600px] mt-4">
                        {selectedDocumentId && (
                            <iframe
                                src={`/api/documents/${selectedDocumentId}/preview`}
                                className="w-full h-full border-0 rounded-md"
                                title={`Document Preview ${currentDocumentIndex + 1}`}
                                key={selectedDocumentId}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent className="max-w-md bg-gradient-to-br from-white via-white to-red-50 border border-red-100">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            Supprimer la maintenance
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-700">
                            <p className="mb-2">
                                Vous êtes sur le point de supprimer définitivement cette demande de maintenance.
                            </p>
                            
                            <div className="flex items-center gap-2 mb-2 p-2 bg-red-50 rounded-md">
                                <FileText className="h-4 w-4 text-blue-500" />
                                <p className="text-sm text-gray-700">
                                    Par défaut, les documents liés à cette maintenance resteront accessibles dans la médiathèque mais ne seront plus associés à cette demande.
                                </p>
                            </div>
                            
                            <div className="p-3 border border-red-200 rounded-md bg-red-50 mb-2">
                                {(maintenanceToDelete?.documentId || (maintenanceToDelete?.documentIds && maintenanceToDelete.documentIds.length > 0)) && (
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="deleteDocument"
                                            checked={deleteWithDocument}
                                            onCheckedChange={(checked) => setDeleteWithDocument(checked as boolean)}
                                            className="border-red-400 text-red-600"
                                        />
                                        <label
                                            htmlFor="deleteDocument"
                                            className="text-sm font-medium leading-none text-red-800 cursor-pointer select-none"
                                        >
                                            {maintenanceToDelete?.documentIds && maintenanceToDelete.documentIds.length > 1 
                                              ? `Je souhaite également supprimer définitivement les ${maintenanceToDelete.documentIds.length} documents liés`
                                              : "Je souhaite également supprimer définitivement le document lié"}
                                        </label>
                                    </div>
                                )}
                                {deleteWithDocument && (
                                    <div className="mt-2 text-xs text-red-600 pl-6">
                                        <p>⚠️ Attention : Les documents seront supprimés définitivement de la médiathèque et ne pourront pas être récupérés.</p>
                                    </div>
                                )}
                            </div>
                            
                                {maintenanceToDelete?.status === "completed" && (
                                <div className="p-3 border border-red-200 rounded-md bg-red-50 mb-2">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="deleteTransaction"
                                            checked={deleteTransaction}
                                            onCheckedChange={(checked) => setDeleteTransaction(checked as boolean)}
                                            className="border-red-400 text-red-600"
                                        />
                                        <label
                                            htmlFor="deleteTransaction"
                                            className="text-sm font-medium leading-none text-red-800 cursor-pointer select-none"
                                        >
                                            Je souhaite également supprimer la transaction financière associée
                                        </label>
                                    </div>
                                    {deleteTransaction && (
                                        <div className="mt-2 text-xs text-red-600 pl-6">
                                            <p>⚠️ Attention : La transaction financière sera supprimée définitivement.</p>
                                    </div>
                                )}
                            </div>
                            )}
                            
                            <div className="p-3 border border-red-200 rounded-md bg-red-50 mb-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="confirm-maintenance-delete" 
                                        checked={confirmDeleteChecked} 
                                        onCheckedChange={(checked) => setConfirmDeleteChecked(!!checked)}
                                        className="border-red-400 text-red-600"
                                    />
                                    <label 
                                        htmlFor="confirm-maintenance-delete" 
                                        className="text-sm font-medium leading-none text-red-800 cursor-pointer select-none"
                                    >
                                        Je confirme vouloir supprimer définitivement cette maintenance
                                    </label>
                                </div>
                            </div>
                            
                            <p className="text-red-600 font-semibold mb-4">
                                Cette action est irréversible et ne peut pas être annulée !
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            disabled={isDeleting}
                            className="hover:bg-red-50 border-red-100"
                        >
                            Annuler
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting || !confirmDeleteChecked}
                            className={cn(
                                "text-white",
                                confirmDeleteChecked 
                                    ? "bg-red-600 hover:bg-red-700" 
                                    : "bg-red-300 cursor-not-allowed hover:bg-red-300"
                            )}
                        >
                            {isDeleting ? (
                                <div className="flex items-center">
                                    <span className="mr-2">Suppression en cours</span>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                            ) : (
                                "Supprimer définitivement"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
                <DialogContent className="bg-gradient-to-br from-background via-background to-red-500/5 border-red-500/10">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-red-500 to-rose-500 bg-clip-text text-transparent">
                            Créer une transaction
                        </DialogTitle>
                        <DialogDescription>
                            La maintenance est terminée. Veuillez compléter les informations pour créer une transaction de {selectedMaintenance?.totalCost}€.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label className="font-medium text-foreground/90 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-red-500" />
                                Description
                            </Label>
                            <Textarea 
                                value={transactionDescription}
                                onChange={(e) => setTransactionDescription(e.target.value)}
                                placeholder="Description de la transaction"
                                className="resize-none min-h-[100px] bg-background hover:bg-background transition-colors focus-within:border-red-300"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label className="font-medium text-foreground/90 flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-red-500" />
                                Méthode de paiement
                            </Label>
                            <Select
                                value={paymentMethod}
                                onValueChange={(value) => setPaymentMethod(value)}
                            >
                                <SelectTrigger className="bg-background hover:bg-background transition-colors focus:border-red-300">
                                    <SelectValue placeholder="Sélectionner une méthode de paiement" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Espèces</SelectItem>
                                    <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                                    <SelectItem value="check">Chèque</SelectItem>
                                    <SelectItem value="card">Carte bancaire</SelectItem>
                                    <SelectItem value="stripe">Stripe</SelectItem>
                                    <SelectItem value="paypal">PayPal</SelectItem>
                                    <SelectItem value="sepa">SEPA</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Section pour les documents liés */}
                        {(selectedMaintenance?.documentIds?.length > 0 || selectedMaintenance?.documentId) && (
                            <div className="space-y-2">
                                <Label className="font-medium text-foreground/90 flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-red-500" />
                                    Documents liés
                                </Label>
                                
                                <div className="border rounded-md p-3 bg-red-50/20 space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Checkbox 
                                            id="select-all-docs"
                                            checked={
                                                selectedMaintenance.documentIds 
                                                    ? selectedMaintenance.documentIds.length === selectedDocumentsForTransaction.length
                                                    : selectedMaintenance.documentId && selectedDocumentsForTransaction.includes(selectedMaintenance.documentId)
                                            }
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    // Sélectionner tous les documents
                                                    if (selectedMaintenance.documentIds) {
                                                        setSelectedDocumentsForTransaction(selectedMaintenance.documentIds);
                                                    } else if (selectedMaintenance.documentId) {
                                                        setSelectedDocumentsForTransaction([selectedMaintenance.documentId]);
                                                    }
                                                } else {
                                                    // Désélectionner tous les documents
                                                    setSelectedDocumentsForTransaction([]);
                                                }
                                            }}
                                        />
                                        <Label htmlFor="select-all-docs" className="text-sm font-medium cursor-pointer">
                                            Associer les documents de la maintenance à la transaction
                                        </Label>
                                    </div>
                                    
                                    <div className="pl-6 space-y-1.5 max-h-[150px] overflow-y-auto">
                                        {selectedMaintenance.documentIds ? (
                                            selectedMaintenance.documentIds.map((docId: number) => (
                                                <div key={docId} className="flex items-center gap-2">
                                                    <Checkbox 
                                                        id={`doc-${docId}`}
                                                        checked={selectedDocumentsForTransaction.includes(docId)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedDocumentsForTransaction(prev => [...prev, docId]);
                                                            } else {
                                                                setSelectedDocumentsForTransaction(prev => 
                                                                    prev.filter(id => id !== docId));
                                                            }
                                                        }}
                                                    />
                                                    <Label htmlFor={`doc-${docId}`} className="flex items-center gap-1.5 text-xs cursor-pointer">
                                                        <FileText className="h-3 w-3 text-blue-500" />
                                                        Document #{docId}
                                                    </Label>
                                                </div>
                                            ))
                                        ) : selectedMaintenance.documentId ? (
                                            <div className="flex items-center gap-2">
                                                <Checkbox 
                                                    id={`doc-${selectedMaintenance.documentId}`}
                                                    checked={selectedDocumentsForTransaction.includes(selectedMaintenance.documentId)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedDocumentsForTransaction([selectedMaintenance.documentId]);
                                                        } else {
                                                            setSelectedDocumentsForTransaction([]);
                                                        }
                                                    }}
                                                />
                                                <Label htmlFor={`doc-${selectedMaintenance.documentId}`} className="flex items-center gap-1.5 text-xs cursor-pointer">
                                                    <FileText className="h-3 w-3 text-blue-500" />
                                                    Document #{selectedMaintenance.documentId}
                                                </Label>
                                            </div>
                                        ) : null}
                                    </div>
                                    
                                    <p className="text-xs text-muted-foreground pl-6 mt-1">
                                        Ces documents seront également accessibles dans la section finances.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <DialogFooter className="mt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowTransactionDialog(false);
                                setSelectedMaintenance(null);
                            }}
                            className="hover:bg-red-500/10"
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={handleCreateTransaction}
                            disabled={createTransactionMutation.isPending}
                            className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600"
                        >
                            {createTransactionMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Création...
                                </>
                            ) : (
                                "Créer la transaction"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const Maintenance = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [showAll, setShowAll] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"open" | "in_progress" | "completed">("open");
    
    // États pour les filtres avancés
    const [filterPeriod, setFilterPeriod] = useState("all");
    const [filterProperty, setFilterProperty] = useState("all");
    const [filterPriority, setFilterPriority] = useState("all");
    const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(undefined);
    const [filterMinCost, setFilterMinCost] = useState<string>("");
    const [filterMaxCost, setFilterMaxCost] = useState<string>("");

    const { data: rawRequests = [], isLoading } = useQuery<any[]>({
        queryKey: ["/api/maintenance"],
    });

    // Transformer les données pour qu'elles correspondent à ce que le composant attend
    const requests = rawRequests.map(item => ({
        ...item,
        // Transformer propertyId en property_id si le frontend l'attend sous cette forme
        property_id: item.propertyId,
        tenant_id: item.tenantId,
        // Mapper les champs de document et coût
        totalCost: item.total_cost || item.totalCost || 0,
        documentId: item.document_id || item.documentId,
        // S'assurer que documentIds est un tableau
        documentIds: getDocumentIds(item.document_ids || item.documentIds),
        // Gérer le champ reportedBy
        reportedBy: item.reported_by || item.reportedBy || "N/A",
        // Assurer que les status correspondent aux valeurs attendues
        status: mapStatus(item.status),
        // Ajouter un priority par défaut si nécessaire
        priority: item.priority || "medium",
        // Assurer que property contient un nom
        property: {
            name: item.property_name || "Propriété inconnue",
            address: item.property_address || ""
        }
    }));
    
    // Fonction pour s'assurer que documentIds est bien un tableau
    function getDocumentIds(docs: any): number[] {
        if (!docs) return [];
        if (Array.isArray(docs)) return docs;
        
        // Si c'est une chaîne JSON, la parser
        if (typeof docs === 'string') {
            try {
                const parsed = JSON.parse(docs);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                return [];
            }
        }
        
        return [];
    }

    // Fonction pour mapper les statuts de la BDD aux statuts attendus par le frontend
    function mapStatus(status: string): "open" | "in_progress" | "completed" {
        if (status === "pending") return "open";
        if (status === "in_progress") return "in_progress";
        if (status === "completed") return "completed";
        return "open"; // valeur par défaut
    }

    const { data: properties = [] } = useQuery<any[]>({
        queryKey: ["/api/properties"],
    });

    if (isLoading) {
        return (
            <div className="container mx-auto py-6 space-y-6">
                {/* Squelette de l'en-tête */}
                <div className="p-6 rounded-xl border border-gray-200">
                    <div className="flex justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                                <div className="h-10 w-64 bg-gray-200 animate-pulse rounded-lg"></div>
                            </div>
                            <div className="h-5 w-80 bg-gray-200 animate-pulse rounded-lg ml-[52px]"></div>
                        </div>
                        <div className="w-40 h-10 bg-gray-200 animate-pulse rounded-lg"></div>
                    </div>
                </div>
                
                {/* Squelette des stats */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="grid grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((_, index) => (
                            <div key={index} className="h-32 bg-gray-200 animate-pulse rounded-lg"></div>
                        ))}
                    </div>
                </div>
                
                {/* Squelette de la barre de recherche */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 h-10 bg-gray-200 animate-pulse rounded-lg"></div>
                    <div className="flex gap-2">
                        {[1, 2, 3].map((_, index) => (
                            <div key={index} className="w-24 h-10 bg-gray-200 animate-pulse rounded-lg"></div>
                        ))}
                    </div>
                </div>
                
                {/* Squelette du tableau */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="space-y-4">
                        <div className="h-10 bg-gray-200 animate-pulse rounded-lg w-full"></div>
                        {[1, 2, 3, 4, 5].map((_, index) => (
                            <div key={index} className="h-16 bg-gray-200 animate-pulse rounded-lg w-full"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Calcul des statistiques pour les widgets
    const urgentRequests = requests.filter(r => r.priority === "high" && r.status !== "completed").length;
    const mediumRequests = requests.filter(r => r.priority === "medium" && r.status !== "completed").length;
    const lowRequests = requests.filter(r => r.priority === "low" && r.status !== "completed").length;

    const openRequests = requests.filter(r => r.status === "open").length;
    const inProgressRequests = requests.filter(r => r.status === "in_progress").length;
    const completedRequests = requests.filter(r => r.status === "completed").length;

    const openCost = requests.reduce((sum, r) => {
        const cost = (r.status !== "completed" && r.totalCost) ? Number(r.totalCost) : 0;
        return sum + cost;
    }, 0);

    const completedCost = requests.reduce((sum, r) => {
        const cost = (r.status === "completed" && r.totalCost) ? Number(r.totalCost) : 0;
        return sum + cost;
    }, 0);

    // Statistiques supplémentaires
    const totalRequests = requests.length;
    const efficiency = Math.round((completedRequests / Math.max(totalRequests, 1)) * 100);
    const avgResolutionTime = 3; // Placeholder pour un calcul réel

    // Préparation des données de stats
    const statsData = {
        urgentRequests,
        mediumRequests,
        lowRequests,
        openRequests,
        inProgressRequests,
        completedRequests,
        totalRequests,
        openCost,
        completedCost,
        efficiency,
        avgResolutionTime
    };

    // Fonction pour appliquer tous les filtres
    const applyAllFilters = (requests: any[]) => {
        return requests.filter(request => {
            // Filtre par texte de recherche
            const textMatch = 
                searchTerm === "" || 
                request.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                request.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                request.property?.name?.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (!textMatch) return false;
            
            // Filtre par propriété
            const propertyMatch = 
                filterProperty === "all" || 
                request.propertyId?.toString() === filterProperty;
            
            if (!propertyMatch) return false;
            
            // Filtre par priorité
            const priorityMatch = 
                filterPriority === "all" || 
                request.priority === filterPriority;
            
            if (!priorityMatch) return false;
            
            // Filtre par période prédéfinie
            if (filterPeriod !== "all") {
                const today = new Date();
                const requestDate = new Date(request.createdAt);
                
                switch (filterPeriod) {
                    case "today":
                        const isToday = 
                            requestDate.getDate() === today.getDate() &&
                            requestDate.getMonth() === today.getMonth() &&
                            requestDate.getFullYear() === today.getFullYear();
                        if (!isToday) return false;
                        break;
                        
                    case "thisWeek":
                        const oneWeekAgo = new Date();
                        oneWeekAgo.setDate(today.getDate() - 7);
                        if (requestDate < oneWeekAgo) return false;
                        break;
                        
                    case "thisMonth":
                        const isThisMonth = 
                            requestDate.getMonth() === today.getMonth() &&
                            requestDate.getFullYear() === today.getFullYear();
                        if (!isThisMonth) return false;
                        break;
                        
                    case "thisYear":
                        const isThisYear = requestDate.getFullYear() === today.getFullYear();
                        if (!isThisYear) return false;
                        break;
                }
            }
            
            // Filtre par plage de dates personnalisée
            if (filterDateRange?.from && filterDateRange?.to) {
                const requestDate = new Date(request.createdAt);
                const startDate = new Date(filterDateRange.from);
                const endDate = new Date(filterDateRange.to);
                
                // Ajuster les dates pour une comparaison correcte
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                
                if (requestDate < startDate || requestDate > endDate) {
                    return false;
                }
            }
            
            // Filtre par plage de coût
            if (filterMinCost && !isNaN(Number(filterMinCost))) {
                const minCost = Number(filterMinCost);
                if (!request.totalCost || Number(request.totalCost) < minCost) {
                    return false;
                }
            }
            
            if (filterMaxCost && !isNaN(Number(filterMaxCost))) {
                const maxCost = Number(filterMaxCost);
                if (!request.totalCost || Number(request.totalCost) > maxCost) {
                    return false;
                }
            }
            
            return true;
        });
    };

    // Appliquer tous les filtres
    const filteredRequests = applyAllFilters(requests);

    const openFilteredRequests = filteredRequests.filter(r => r.status === "open");
    const inProgressFilteredRequests = filteredRequests.filter(r => r.status === "in_progress");
    const completedFilteredRequests = filteredRequests.filter(r => r.status === "completed");

    const resetFilters = () => {
        setSearchTerm("");
        setFilterPeriod("all");
        setFilterProperty("all");
        setFilterPriority("all");
        setFilterDateRange(undefined);
        setFilterMinCost("");
        setFilterMaxCost("");
    };

    const applyFilters = () => {
        // Les filtres sont déjà appliqués en temps réel
        setPopoverOpen(false); // Fermer le popover après application
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl border border-gray-200">
                <div>
                    <motion.div
                        className="flex items-center gap-3 mb-2"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Wrench className="h-10 w-10 text-red-500" />
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 via-rose-500 to-red-600 bg-clip-text text-transparent animate-gradient">
                            Maintenance
                        </h1>
                    </motion.div>
                    <motion.p
                        className="text-muted-foreground text-lg ml-[52px]"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        Gérez vos demandes de maintenance et réparations
                    </motion.p>
                </div>
                <div className="flex items-center gap-4">
                    <AddMaintenanceDialog />
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-lg p-4 border border-gray-200 mb-8"
            >
                <MaintenanceStats stats={statsData} />
            </motion.div>

            <div className="flex items-center justify-between gap-4 my-8">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-10"
                        placeholder="Rechercher une demande..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <Dialog open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <DialogTrigger asChild>
                        <Button 
                            variant="outline" 
                            size="icon"
                            className="border-red-500/20 hover:bg-red-500/10 hover:text-red-500"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[600px] sm:max-w-[600px] bg-gradient-to-br from-white via-white to-red-50/30 border-red-200/50">
                        <DialogHeader>
                            <div className="flex justify-between items-center">
                                <DialogTitle className="text-xl text-gray-800 flex items-center gap-2">
                                    <SlidersHorizontal className="h-5 w-5 text-red-500" />
                                    Filtres avancés
                                </DialogTitle>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 hover:bg-red-100 text-red-600 border-red-200 flex items-center gap-1 transition-all duration-200"
                                    onClick={resetFilters}
                                >
                                    <RefreshCw className="h-3.5 w-3.5" /> 
                                    <span className="text-xs">Réinitialiser</span>
                                </Button>
                            </div>
                        </DialogHeader>
                        
                        <Separator className="bg-red-100 my-4" />
                        
                        <div className="space-y-5 my-4">
                            {/* Filtre par propriété */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-2 text-gray-700">
                                    <Wrench className="h-4 w-4 text-red-500" />
                                    Propriété
                                </Label>
                                <Combobox
                                    options={[
                                        { value: "all", label: "Toutes les propriétés" },
                                        ...properties.map(property => ({
                                            value: property.id.toString(),
                                            label: property.name
                                        }))
                                    ]}
                                    value={filterProperty}
                                    onValueChange={(value) => setFilterProperty(value)}
                                    placeholder="Sélectionner une propriété"
                                    searchPlaceholder="Rechercher une propriété..."
                                    emptyText="Aucune propriété trouvée"
                                    className="border-red-200 text-red-700"
                                />
                            </div>
                            
                            {/* Filtre par coût */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-2 text-gray-700">
                                    <EuroIcon className="h-4 w-4 text-red-500" />
                                    Plage de coût
                                </Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            type="number"
                                            placeholder="Min"
                                            value={filterMinCost}
                                            onChange={(e) => setFilterMinCost(e.target.value)}
                                            className="border-red-200 bg-red-50/30 pl-8 focus-visible:ring-red-500"
                                        />
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-400">€</span>
                                    </div>
                                    <div className="relative flex-1">
                                        <Input
                                            type="number"
                                            placeholder="Max"
                                            value={filterMaxCost}
                                            onChange={(e) => setFilterMaxCost(e.target.value)}
                                            className="border-red-200 bg-red-50/30 pl-8 focus-visible:ring-red-500"
                                        />
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-400">€</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Filtre par priorité */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-2 text-gray-700">
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                    Priorité
                                </Label>
                                <Select 
                                    value={filterPriority}
                                    onValueChange={(value) => setFilterPriority(value)}
                                >
                                    <SelectTrigger className="border-red-200 bg-red-50/50 text-red-700">
                                        <SelectValue placeholder="Toutes les priorités" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Toutes les priorités</SelectItem>
                                        <SelectItem value="high">Haute</SelectItem>
                                        <SelectItem value="medium">Moyenne</SelectItem>
                                        <SelectItem value="low">Basse</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            {/* Filtre par date */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-2 text-gray-700">
                                    <CalendarIcon className="h-4 w-4 text-red-500" />
                                    Plage de dates
                                </Label>
                                <div className="flex flex-col gap-2">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-full justify-start text-left font-normal border-red-200 hover:bg-red-50 hover:text-red-600"
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4 text-red-500" />
                                                {filterDateRange?.from ? (
                                                    filterDateRange.to ? (
                                                        <>
                                                            {format(filterDateRange.from, "dd/MM/yyyy", { locale: fr })} -{" "}
                                                            {format(filterDateRange.to, "dd/MM/yyyy", { locale: fr })}
                                                        </>
                                                    ) : (
                                                        format(filterDateRange.from, "dd/MM/yyyy", { locale: fr })
                                                    )
                                                ) : (
                                                    <span className="text-muted-foreground">Choisir une période</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                initialFocus
                                                mode="range"
                                                defaultMonth={filterDateRange?.from}
                                                selected={filterDateRange}
                                                onSelect={setFilterDateRange}
                                                locale={fr}
                                                numberOfMonths={2}
                                                className="border rounded-md"
                                            />
                                        </PopoverContent>
                                    </Popover>

                                    <Select 
                                        value={filterPeriod}
                                        onValueChange={(value) => {
                                            setFilterPeriod(value);
                                            if (value !== "all") {
                                                setFilterDateRange(undefined);
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="border-red-200 bg-red-50/50 text-red-700">
                                            <SelectValue placeholder="Toutes les périodes" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Toutes les périodes</SelectItem>
                                            <SelectItem value="today">Aujourd'hui</SelectItem>
                                            <SelectItem value="thisWeek">Cette semaine</SelectItem>
                                            <SelectItem value="thisMonth">Ce mois</SelectItem>
                                            <SelectItem value="thisYear">Cette année</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        
                        <Separator className="bg-red-100 my-4" />
                        
                        <DialogFooter>
                            <Button 
                                className="bg-red-500 hover:bg-red-600 text-white"
                                onClick={applyFilters}
                            >
                                Appliquer les filtres
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                
                <ExportMenu
                    type="maintenance"
                    allowImport={true}
                    currentFilters={{
                        search: searchTerm,
                        priority: filterPriority !== "all" ? filterPriority : undefined,
                        property: filterProperty !== "all" ? filterProperty : undefined,
                        status: activeTab // Passer l'onglet actif comme filtre de statut
                    }}
                    data={
                        activeTab === "open" 
                            ? openFilteredRequests 
                            : activeTab === "in_progress" 
                                ? inProgressFilteredRequests 
                                : completedFilteredRequests
                    }
                />
            </div>

            <div className="mt-8">
                <Tabs defaultValue="open" value={activeTab} onValueChange={(value) => setActiveTab(value as "open" | "in_progress" | "completed")}>
                    <TabsList className="grid w-full grid-cols-3 mb-8">
                        <TabsTrigger value="open" className="data-[state=active]:ring-2 data-[state=active]:ring-red-500">
                            Demandes ouvertes ({openFilteredRequests.length})
                        </TabsTrigger>
                        <TabsTrigger value="in_progress" className="data-[state=active]:ring-2 data-[state=active]:ring-red-500">
                            En cours ({inProgressFilteredRequests.length})
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="data-[state=active]:ring-2 data-[state=active]:ring-red-500">
                            Terminées ({completedFilteredRequests.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="open">
                        <MaintenanceTable
                            requests={openFilteredRequests}
                            showAll={showAll}
                            queryClient={queryClient}
                            toast={toast}
                        />
                    </TabsContent>

                    <TabsContent value="in_progress">
                        <MaintenanceTable
                            requests={inProgressFilteredRequests}
                            showAll={showAll}
                            queryClient={queryClient}
                            toast={toast}
                        />
                    </TabsContent>

                    <TabsContent value="completed">
                        <MaintenanceTable
                            requests={completedFilteredRequests}
                            showAll={showAll}
                            queryClient={queryClient}
                            toast={toast}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default Maintenance;