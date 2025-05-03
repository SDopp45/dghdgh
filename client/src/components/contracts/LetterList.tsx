import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LetterDialog } from "./LetterDialog";
import { LetterType } from "@/types/letters";
import { 
  Search, 
  Filter, 
  FileText, 
  Edit, 
  Trash2, 
  MoreVertical, 
  Download, 
  Copy, 
  Eye, 
  Mail, 
  Archive, 
  FileCheck, 
  FileMinus,
  Printer,
  Check,
  SortAsc,
  SortDesc
} from "lucide-react";

interface Letter {
  id: string;
  type: LetterType;
  title: string;
  recipient: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "sent" | "archived";
}

interface LetterListProps {
  initialLetters?: Letter[];
  onLetterSelect?: (letter: Letter) => void;
  onLetterCreate?: () => void;
  onLetterEdit?: (letter: Letter) => void;
  onLetterDelete?: (id: string) => void;
  onLetterStatusChange?: (id: string, status: "draft" | "sent" | "archived") => void;
}

export function LetterList({
  initialLetters = [],
  onLetterSelect,
  onLetterCreate,
  onLetterEdit,
  onLetterDelete,
  onLetterStatusChange
}: LetterListProps) {
  const [letters, setLetters] = useState<Letter[]>(initialLetters);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortField, setSortField] = useState<"createdAt" | "updatedAt" | "title">("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [letterToDelete, setLetterToDelete] = useState<string | null>(null);

  // Filtrer les lettres en fonction de la recherche et du filtre
  const filteredLetters = letters.filter(letter => {
    const matchesSearch = letter.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          letter.recipient.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || letter.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Trier les lettres
  const sortedLetters = [...filteredLetters].sort((a, b) => {
    let comparison = 0;
    
    if (sortField === "title") {
      comparison = a.title.localeCompare(b.title);
    } else {
      const dateA = new Date(a[sortField]).getTime();
      const dateB = new Date(b[sortField]).getTime();
      comparison = dateA - dateB;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const handleSaveLetter = (content: string) => {
    if (selectedLetter) {
      // Mettre à jour une lettre existante
      const updatedLetters = letters.map(letter => 
        letter.id === selectedLetter.id 
          ? { 
              ...letter, 
              content,
              updatedAt: new Date().toISOString() 
            } 
          : letter
      );
      setLetters(updatedLetters);
      onLetterEdit?.(updatedLetters.find(l => l.id === selectedLetter.id)!);
    } else {
      // Créer une nouvelle lettre
      const newLetter: Letter = {
        id: Date.now().toString(),
        type: "mise_en_demeure_loyer",
        title: "Nouveau courrier",
        recipient: "",
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "draft",
      };
      setLetters([...letters, newLetter]);
      onLetterSelect?.(newLetter);
    }
    setSelectedLetter(null);
    setIsDialogOpen(false);
  };

  const handleEditLetter = (letter: Letter) => {
    setSelectedLetter(letter);
    onLetterEdit?.(letter);
  };

  const handleDeleteLetter = (id: string) => {
    setLetterToDelete(id);
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (letterToDelete) {
      setLetters(letters.filter(letter => letter.id !== letterToDelete));
      onLetterDelete?.(letterToDelete);
      setLetterToDelete(null);
      setConfirmDeleteOpen(false);
      
      // Supprimer également de la sélection si nécessaire
      if (selectedIds.includes(letterToDelete)) {
        setSelectedIds(selectedIds.filter(id => id !== letterToDelete));
      }
    }
  };

  const handleChangeStatus = (id: string, status: "draft" | "sent" | "archived") => {
    const updatedLetters = letters.map(letter => 
      letter.id === id 
        ? { ...letter, status, updatedAt: new Date().toISOString() } 
        : letter
    );
    setLetters(updatedLetters);
    onLetterStatusChange?.(id, status);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length > 0) {
      setLetters(letters.filter(letter => !selectedIds.includes(letter.id)));
      selectedIds.forEach(id => onLetterDelete?.(id));
      setSelectedIds([]);
    }
  };

  const handleBulkChangeStatus = (status: "draft" | "sent" | "archived") => {
    if (selectedIds.length > 0) {
      const updatedLetters = letters.map(letter => 
        selectedIds.includes(letter.id) 
          ? { ...letter, status, updatedAt: new Date().toISOString() } 
          : letter
      );
      setLetters(updatedLetters);
      selectedIds.forEach(id => onLetterStatusChange?.(id, status));
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLetters.length) {
      // Désélectionner tout
      setSelectedIds([]);
    } else {
      // Sélectionner tout
      setSelectedIds(filteredLetters.map(letter => letter.id));
    }
  };

  const toggleSelectLetter = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Brouillon</Badge>;
      case "sent":
        return <Badge variant="success">Envoyé</Badge>;
      case "archived":
        return <Badge variant="secondary">Archivé</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const toggleSort = (field: "createdAt" | "updatedAt" | "title") => {
    if (sortField === field) {
      // Inverser la direction si le même champ est cliqué
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Nouveau champ, par défaut en ordre décroissant
      setSortField(field);
      setSortDirection("desc");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select 
            value={filterStatus} 
            onValueChange={setFilterStatus}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="draft">Brouillons</SelectItem>
              <SelectItem value="sent">Envoyés</SelectItem>
              <SelectItem value="archived">Archivés</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex space-x-2 w-full sm:w-auto justify-end">
          {selectedIds.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Actions ({selectedIds.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleBulkChangeStatus("sent")}>
                  <FileCheck className="mr-2 h-4 w-4" />
                  Marquer comme envoyés
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkChangeStatus("archived")}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archiver
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBulkDelete} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button onClick={() => {
            setSelectedLetter(null);
            setIsDialogOpen(true);
            onLetterCreate?.();
          }}>
            Nouveau courrier
        </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="px-4 py-3">
          <div className="flex items-center">
            <Checkbox 
              checked={selectedIds.length > 0 && selectedIds.length === filteredLetters.length} 
              onCheckedChange={toggleSelectAll}
              className="mr-3"
            />
            <div className="grid grid-cols-12 gap-4 w-full text-sm font-medium text-gray-500">
              <div className="col-span-6 flex items-center cursor-pointer" onClick={() => toggleSort("title")}>
                Titre
                {sortField === "title" && (sortDirection === "asc" ? <SortAsc className="ml-1 h-3 w-3" /> : <SortDesc className="ml-1 h-3 w-3" />)}
              </div>
              <div className="col-span-2">Statut</div>
              <div 
                className="col-span-2 cursor-pointer flex items-center"
                onClick={() => toggleSort("createdAt")}
              >
                Date
                {sortField === "createdAt" && (sortDirection === "asc" ? <SortAsc className="ml-1 h-3 w-3" /> : <SortDesc className="ml-1 h-3 w-3" />)}
              </div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            {sortedLetters.length > 0 ? (
              <div className="divide-y">
                {sortedLetters.map((letter) => (
                  <div key={letter.id} className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center">
                      <Checkbox 
                        checked={selectedIds.includes(letter.id)} 
                        onCheckedChange={() => toggleSelectLetter(letter.id)}
                        className="mr-3"
                      />
                      <div className="grid grid-cols-12 gap-4 w-full items-center">
                        <div className="col-span-6 flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div className="truncate">
                            <div className="font-medium cursor-pointer hover:text-blue-600" onClick={() => onLetterSelect?.(letter)}>
                              {letter.title}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {letter.recipient ? `Destinataire: ${letter.recipient}` : "Sans destinataire"}
                            </div>
                          </div>
                        </div>
                        <div className="col-span-2">
                          {getStatusBadge(letter.status)}
                        </div>
                        <div className="col-span-2 text-sm text-gray-500">
                          {new Date(letter.createdAt).toLocaleDateString()}
                        </div>
                        <div className="col-span-2 flex justify-end space-x-1">
                  <Button
                            variant="ghost" 
                    size="sm"
                    onClick={() => handleEditLetter(letter)}
                  >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                  </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onLetterSelect?.(letter)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Afficher
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {}}>
                                <Download className="mr-2 h-4 w-4" />
                                Télécharger
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {}}>
                                <Printer className="mr-2 h-4 w-4" />
                                Imprimer
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {}}>
                                <Copy className="mr-2 h-4 w-4" />
                                Dupliquer
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {}}>
                                <Mail className="mr-2 h-4 w-4" />
                                Envoyer par email
                              </DropdownMenuItem>
                              
                              {letter.status !== "sent" && (
                                <DropdownMenuItem onClick={() => handleChangeStatus(letter.id, "sent")}>
                                  <Check className="mr-2 h-4 w-4" />
                                  Marquer comme envoyé
                                </DropdownMenuItem>
                              )}
                              
                              {letter.status !== "archived" && (
                                <DropdownMenuItem onClick={() => handleChangeStatus(letter.id, "archived")}>
                                  <Archive className="mr-2 h-4 w-4" />
                                  Archiver
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDeleteLetter(letter.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="font-medium text-gray-900">Aucun courrier trouvé</h3>
                <p className="text-gray-500 mt-1">
                  {searchQuery || filterStatus !== "all" 
                    ? "Essayez de modifier vos filtres de recherche" 
                    : "Créez votre premier courrier en cliquant sur \"Nouveau courrier\""}
                </p>
                {(searchQuery || filterStatus !== "all") && (
                  <Button
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterStatus("all");
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                )}
                </div>
            )}
          </ScrollArea>
            </CardContent>
        {sortedLetters.length > 0 && (
          <CardFooter className="px-4 py-3 border-t flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {selectedIds.length > 0 
                ? `${selectedIds.length} sélectionné${selectedIds.length > 1 ? 's' : ''}` 
                : `${sortedLetters.length} courrier${sortedLetters.length > 1 ? 's' : ''}`}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => {}}>
                Exporter la liste
              </Button>
          </div>
          </CardFooter>
        )}
      </Card>

      <LetterDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveLetter}
        initialType={selectedLetter?.type}
        initialFields={{}}
      />

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p>Êtes-vous sûr de vouloir supprimer ce courrier ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 