import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Database, HardDrive, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

type StorageTier = "basic" | "tier1" | "tier2" | "tier3" | "tier4";

interface StorageInfo {
  userId: number;
  username: string;
  storageUsed: number;
  storageLimit: number;
  storageTier: StorageTier;
  usagePercentage: number;
  formattedUsed: string;
  formattedLimit: string;
  nextTier: {
    tier: StorageTier;
    limit: number;
    price: number;
  } | null;
  hasReachedLimit: boolean;
}

export function StorageUsageBar({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetching storage info
  const { data: storageInfo, isLoading, error } = useQuery<StorageInfo>({
    queryKey: ["storageInfo"],
    queryFn: async () => {
      const response = await fetch("/api/storage/info");
      if (!response.ok) {
        throw new Error("Failed to fetch storage info");
      }
      return response.json();
    },
  });

  // Mutation for upgrading storage tier
  const upgradeMutation = useMutation({
    mutationFn: async (tier: StorageTier) => {
      const response = await fetch("/api/storage/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tier }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upgrade storage");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storageInfo"] });
      toast({
        title: "Stockage mis à niveau",
        description: "Votre espace de stockage a été augmenté avec succès.",
        variant: "default",
      });
      setShowUpgradeDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la mise à niveau du stockage.",
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = (tier: StorageTier) => {
    upgradeMutation.mutate(tier);
  };

  // Get the color for the progress bar based on usage percentage
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-orange-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  // Define tier details for the upgrade dialog
  const tierDetails = [
    { tier: "tier1", name: "Standard", storage: "10 GB", price: "4,99 €" },
    { tier: "tier2", name: "Pro", storage: "20 GB", price: "9,99 €" },
    { tier: "tier3", name: "Business", storage: "50 GB", price: "19,99 €" },
    { tier: "tier4", name: "Entreprise", storage: "100 GB", price: "39,99 €" },
  ];

  if (isLoading) {
    return (
      <div className={`px-2 py-3 flex ${isCollapsed ? "justify-center" : "justify-between"} items-center`}>
        <Progress value={0} className="h-2" />
      </div>
    );
  }

  if (error || !storageInfo) {
    return null;
  }

  const { usagePercentage, formattedUsed, formattedLimit, hasReachedLimit } = storageInfo;
  const progressColor = getProgressColor(usagePercentage);

  // Render collapsed version
  if (isCollapsed) {
    return (
      <div className="px-2 py-3 flex flex-col items-center">
        <Progress 
          value={usagePercentage} 
          className={`h-1.5 w-10 ${progressColor}`} 
        />
        
        <div className="mt-1">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Render expanded version
  return (
    <div className="px-4 py-3 border-b border-[hsl(var(--sidebar-border))]">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Stockage</span>
        </div>
        <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 ml-1" 
              title="Augmenter l'espace de stockage"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Augmenter votre espace de stockage</DialogTitle>
              <DialogDescription>
                Choisissez parmi les formules suivantes pour augmenter votre espace de stockage
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              {tierDetails.map((tier) => {
                const isCurrentTier = storageInfo.storageTier === tier.tier;
                const isDisabled = isCurrentTier || 
                  tierDetails.findIndex(t => t.tier === tier.tier) <= 
                  tierDetails.findIndex(t => t.tier === storageInfo.storageTier);
                
                return (
                  <Card key={tier.tier} className={isDisabled ? "opacity-60" : ""}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md">{tier.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{tier.storage}</p>
                      <p className="text-sm text-muted-foreground">Espace de stockage</p>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <p className="font-medium">{tier.price}</p>
                      <Button 
                        size="sm" 
                        disabled={isDisabled || upgradeMutation.isPending}
                        onClick={() => handleUpgrade(tier.tier as StorageTier)}
                      >
                        {isCurrentTier ? "Actuel" : "Choisir"}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
            <DialogFooter className="sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowUpgradeDialog(false)}
              >
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Progress 
        value={usagePercentage} 
        className={`h-1.5 ${progressColor}`} 
      />
      
      <div className="flex justify-between mt-1">
        <span className="text-xs text-muted-foreground">
          {formattedUsed}
        </span>
        <span className="text-xs text-muted-foreground">
          {formattedLimit}
        </span>
      </div>
    </div>
  );
} 