import { useState } from "react";
import { Check, ChevronDown, Folder, FolderPlus } from "lucide-react";
import { Button } from "./button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "./command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Input } from "./input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface FolderSelectProps {
  value?: number | null;
  onValueChange: (value: number | null) => void;
  className?: string;
}

export function FolderSelect({ value, onValueChange, className }: FolderSelectProps) {
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: folders = [], isLoading } = useQuery({
    queryKey: ["/api/folders"],
  });

  const selectedFolder = folders.find((folder: any) => folder.id === value);

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Erreur lors de la création du dossier");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      onValueChange(data.id);
      setCreateDialogOpen(false);
      setNewFolderName("");
      toast({
        title: "✨ Dossier créé",
        description: "Le dossier a été créé avec succès",
        className: "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    },
  });

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du dossier est requis",
        variant: "destructive",
      });
      return;
    }
    createFolderMutation.mutate(newFolderName);
  };

  if (isLoading) {
    return (
      <Button variant="outline" className={className} disabled>
        Chargement des dossiers...
      </Button>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={`w-full justify-between ${className}`}
          >
            {value && selectedFolder ? (
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                <span>{selectedFolder.name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Sélectionner un dossier</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Rechercher un dossier..." />
            <CommandEmpty>Aucun dossier trouvé.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setCreateDialogOpen(true);
                  setOpen(false);
                }}
                className="text-sm"
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Créer un nouveau dossier
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  onValueChange(null);
                  setOpen(false);
                }}
                className="text-sm"
              >
                <Check className={`mr-2 h-4 w-4 ${!value ? 'opacity-100' : 'opacity-0'}`} />
                Aucun dossier
              </CommandItem>
              {folders.map((folder: any) => (
                <CommandItem
                  key={folder.id}
                  onSelect={() => {
                    onValueChange(folder.id);
                    setOpen(false);
                  }}
                  className="text-sm"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Folder className="h-4 w-4" />
                    {folder.name}
                  </div>
                  {value === folder.id && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau dossier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nom du dossier"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateFolder();
                }
              }}
            />
            <Button
              onClick={handleCreateFolder}
              className="w-full"
              disabled={createFolderMutation.isPending}
            >
              {createFolderMutation.isPending ? "Création..." : "Créer le dossier"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}