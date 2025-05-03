import { useState } from "react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Archive, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface AutoArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  pastVisitsCount: number;
}

export function AutoArchiveDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  pastVisitsCount 
}: AutoArchiveDialogProps) {
  const [isArchiving, setIsArchiving] = useState(false);
  const { toast } = useToast();

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur lors de l'archivage:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'archivage automatique",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3 text-xl">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1.1 }}
              transition={{ repeat: Infinity, repeatType: "reverse", duration: 1 }}
            >
              <Archive className="h-6 w-6 text-[#70C7BA]" />
            </motion.div>
            <span className="bg-gradient-to-r from-[#70C7BA] to-[#49EACB] bg-clip-text text-transparent">
              Visites passées en attente
            </span>
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-[#70C7BA]/10 to-[#49EACB]/10 border border-[#70C7BA]/20 shadow-inner">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-800 mb-1">Vous êtes sur le point d'archiver les visites passées en attente.</p>
                  <p className="text-sm text-gray-600">
                    Cette action archivera <span className="font-semibold text-[#70C7BA]">{pastVisitsCount} visite{pastVisitsCount > 1 ? 's' : ''}</span> antérieure{pastVisitsCount > 1 ? 's' : ''} à aujourd'hui.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-2 text-sm">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2"
              >
                <div className="h-6 w-6 rounded-full bg-[#70C7BA]/20 text-[#70C7BA] flex items-center justify-center text-xs font-bold">1</div>
                <p>Les visites archivées ne seront plus affichées dans la vue principale.</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-2"
              >
                <div className="h-6 w-6 rounded-full bg-[#70C7BA]/20 text-[#70C7BA] flex items-center justify-center text-xs font-bold">2</div>
                <p>Vous pourrez toujours les consulter dans l'onglet "Archivées".</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-2"
              >
                <div className="h-6 w-6 rounded-full bg-[#70C7BA]/20 text-[#70C7BA] flex items-center justify-center text-xs font-bold">3</div>
                <p>Cette action est réversible en désarchivant manuellement les visites.</p>
              </motion.div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-[#70C7BA]/20 text-[#70C7BA] hover:bg-[#70C7BA]/5"
            >
              Annuler
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="default"
              onClick={handleArchive}
              disabled={isArchiving}
              className="bg-gradient-to-r from-[#70C7BA] to-[#49EACB] hover:from-[#49EACB] hover:to-[#70C7BA] text-white shadow-md hover:shadow-lg transition-all duration-300"
            >
              {isArchiving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Archivage en cours...
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Archiver {pastVisitsCount} visite{pastVisitsCount > 1 ? 's' : ''} passée{pastVisitsCount > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}