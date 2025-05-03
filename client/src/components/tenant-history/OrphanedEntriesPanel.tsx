import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";

export interface OrphanedEntriesResult {
  message: string;
  processed: number;
  markedAsOrphaned: number[];
  autoReassigned: {
    id: number;
    tenantFullName: string;
    reassignedTo: string;
  }[];
}

export function OrphanedEntriesPanel() {
  const [autoReassign, setAutoReassign] = useState(true);
  const [processStatus, setProcessStatus] = useState<OrphanedEntriesResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const detectOrphanedMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/tenant-history/detect-orphaned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoReassign })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Une erreur est survenue lors de la détection des entrées orphelines');
      }

      return await response.json() as OrphanedEntriesResult;
    },
    onSuccess: (data) => {
      setProcessStatus(data);
      setError(null);
      
      toast({
        title: 'Détection terminée',
        description: data.message,
        variant: 'default',
        className: 'bg-green-500/10 border-green-500/20',
      });

      // Invalidate tenant history queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['tenantHistory'] });
      queryClient.invalidateQueries({ queryKey: ['tenantHistoryStats'] });
    },
    onError: (error) => {
      setError(error.message);
      setProcessStatus(null);
      
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleDetect = () => {
    setProcessStatus(null);
    setError(null);
    detectOrphanedMutation.mutate();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gestion des entrées orphelines</CardTitle>
        <CardDescription>
          Détecter et gérer les entrées d'historique qui ne sont plus associées à un locataire.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="autoReassign" 
            checked={autoReassign} 
            onCheckedChange={(checked) => setAutoReassign(checked === true)}
          />
          <label
            htmlFor="autoReassign"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Réassigner automatiquement quand possible
          </label>
        </div>
        
        <p className="text-sm text-gray-500">
          Le système tentera de trouver des correspondances de noms entre les entrées orphelines et les locataires existants.
        </p>
        
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {processStatus && (
          <div className="mt-4 space-y-4">
            <Alert variant={processStatus.processed > 0 ? "default" : "warning"} className="bg-blue-500/10 border-blue-500/20">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Résultat du traitement</AlertTitle>
              <AlertDescription>{processStatus.message}</AlertDescription>
            </Alert>
            
            {processStatus.autoReassigned && processStatus.autoReassigned.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Entrées réassignées automatiquement:</h4>
                <ul className="space-y-2">
                  {processStatus.autoReassigned.map((item) => (
                    <li key={item.id} className="text-sm flex items-center space-x-2">
                      <span className="text-gray-700">{item.tenantFullName}</span>
                      <ArrowRight className="h-3 w-3 text-gray-400" />
                      <span className="font-medium">{item.reassignedTo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={handleDetect}
          disabled={detectOrphanedMutation.isPending}
          className="w-full"
        >
          {detectOrphanedMutation.isPending ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Détection en cours...
            </>
          ) : (
            'Détecter les entrées orphelines'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 