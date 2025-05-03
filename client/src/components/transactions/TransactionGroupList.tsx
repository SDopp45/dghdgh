import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SimplePagination } from "@/components/ui/pagination";

interface Transaction {
  id: number;
  amount: number;
  type: 'income' | 'expense' | 'credit';
  category: string;
  description: string;
  date: string;
  propertyId: number;
  tenantId: number;
  status: 'pending' | 'completed' | 'cancelled';
  documentIds: string[];
  property?: {
    name: string;
  };
  tenant?: {
    name: string;
  };
}

interface TransactionGroup {
  key: string;
  count: number;
  totalAmount: number;
  firstDate: string;
  lastDate: string;
}

interface GroupingOption {
  value: string;
  label: string;
}

interface GroupTransactionsData {
  data: Transaction[];
  meta: {
    totalPages: number;
    total: number;
  };
}

// Composant pour le contenu d'un groupe déplié
function GroupContent({ 
  groupKey, 
  groupBy, 
  count, 
  groupPageSize 
}: { 
  groupKey: string; 
  groupBy: string; 
  count: number;
  groupPageSize: number;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [transactionsData, setTransactionsData] = useState<GroupTransactionsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Effet pour charger les transactions quand le groupe est déplié
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        console.log(`[DEBUG] Chargement des transactions pour le groupe: ${groupKey}, page: ${currentPage}`);
        setIsLoading(true);
        const params = new URLSearchParams({
          groupBy,
          page: currentPage.toString(),
          pageSize: groupPageSize.toString()
        });
        
        const response = await fetch(`/api/transactions/group/${encodeURIComponent(groupKey)}?${params}`, {
          // Ajouter un header Cache-Control pour éviter les requêtes inutiles
          headers: {
            'Cache-Control': 'max-age=3600'
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }
        
        const data = await response.json();
        console.log(`[DEBUG] ${data.data.length} transactions chargées pour le groupe: ${groupKey}`);
        setTransactionsData(data);
        setError(null);
      } catch (err) {
        console.error(`[DEBUG] Erreur de chargement pour le groupe: ${groupKey}`, err);
        setError(err instanceof Error ? err : new Error('An error occurred'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
    
    // Nettoyage quand le composant est démonté
    return () => {
      console.log(`[DEBUG] Nettoyage/démontage du groupe: ${groupKey}`);
    };
  }, [groupKey, groupBy, currentPage, groupPageSize]);

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="text-center py-4">
          Chargement des transactions...
        </TableCell>
      </TableRow>
    );
  }

  if (error) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="text-center py-4 text-red-500">
          Erreur: {error.message}
        </TableCell>
      </TableRow>
    );
  }

  if (!transactionsData || !transactionsData.data) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="text-center py-4">
          Aucune transaction trouvée
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {transactionsData.data.map((transaction: Transaction) => (
        <TableRow key={transaction.id} className="bg-gray-50">
          <TableCell></TableCell>
          <TableCell>
            {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: fr })}
            <br />
            <span className="text-sm text-gray-500">{transaction.description}</span>
          </TableCell>
          <TableCell>{transaction.property?.name || '-'}</TableCell>
          <TableCell>
            {new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR'
            }).format(transaction.amount)}
          </TableCell>
          <TableCell>{transaction.category}</TableCell>
          <TableCell>{transaction.status}</TableCell>
        </TableRow>
      ))}
      
      {/* Pagination à l'intérieur du groupe */}
      {transactionsData.meta && transactionsData.meta.totalPages > 1 && (
        <TableRow>
          <TableCell colSpan={6}>
            <SimplePagination 
              currentPage={currentPage} 
              totalPages={transactionsData.meta.totalPages} 
              onPageChange={setCurrentPage} 
            />
          </TableCell>
        </TableRow>
      )}
      
      {/* Indicateur de nombre limité */}
      {count > groupPageSize && transactionsData.meta && transactionsData.meta.totalPages > 1 && (
        <TableRow>
          <TableCell colSpan={6} className="text-center text-sm text-gray-500">
            Affichage de {groupPageSize} transactions sur {count} total
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function TransactionGroupList() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [groupBy, setGroupBy] = useState<string>('property_type_category');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const groupPageSize = 10; // Nombre fixe de transactions par page dans un groupe déplié

  // Requête pour récupérer UNIQUEMENT les groupes de transactions
  const { 
    data: groupsData, 
    isLoading: isLoadingGroups, 
    error: groupsError,
    refetch: refetchGroups
  } = useQuery({
    queryKey: ['transaction-groups', page, pageSize, groupBy, category, type, propertyId, startDate, endDate],
    queryFn: async () => {
      console.log('[DEBUG] Chargement des GROUPES de transactions');
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        groupBy,
        ...(category && { category }),
        ...(type && { type }),
        ...(propertyId && { propertyId }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const response = await fetch(`/api/transactions/groups?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transaction groups');
      }
      const data = await response.json();
      console.log(`[DEBUG] ${data.groups.length} groupes chargés`);
      return data;
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Gérer le clic sur un groupe pour le déplier/replier
  const toggleGroup = (groupKey: string) => {
    console.log(`[DEBUG] Groupe ${groupKey} ${expandedGroups[groupKey] ? 'replié' : 'déplié'}`);
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Recharger les groupes quand les filtres changent
  useEffect(() => {
    console.log('[DEBUG] Filtres changés, rechargement des groupes');
    refetchGroups();
  }, [groupBy, category, type, propertyId, startDate, endDate, refetchGroups]);

  if (isLoadingGroups) return <div>Chargement des groupes...</div>;
  if (groupsError) return <div>Erreur: {(groupsError as Error).message}</div>;

  const { groups, options, meta } = groupsData || { groups: [], options: [], meta: { totalPages: 1, total: 0 } };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <Select value={groupBy} onValueChange={setGroupBy}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Type de regroupement" />
          </SelectTrigger>
          <SelectContent>
            {options?.map((option: GroupingOption) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Toutes</SelectItem>
            <SelectItem value="rent">Loyer</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="utility">Charges</SelectItem>
          </SelectContent>
        </Select>

        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tous</SelectItem>
            <SelectItem value="income">Revenu</SelectItem>
            <SelectItem value="expense">Dépense</SelectItem>
            <SelectItem value="credit">Crédit</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          placeholder="Date de début"
        />

        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          placeholder="Date de fin"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Groupe</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Montant Total</TableHead>
            <TableHead>Première Transaction</TableHead>
            <TableHead>Dernière Transaction</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups?.map((group: TransactionGroup) => {
            const isExpanded = expandedGroups[group.key] || false;
            
            return (
              <React.Fragment key={group.key}>
                <TableRow className="cursor-pointer hover:bg-gray-100" onClick={() => toggleGroup(group.key)}>
                  <TableCell>
                    <Button variant="ghost" size="icon">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{group.key}</TableCell>
                  <TableCell>{group.count}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR'
                    }).format(group.totalAmount)}
                  </TableCell>
                  <TableCell>{group.firstDate}</TableCell>
                  <TableCell>{group.lastDate}</TableCell>
                </TableRow>
                
                {/* Charger les transactions uniquement quand le groupe est déplié */}
                {isExpanded ? (
                  <GroupContent 
                    groupKey={group.key} 
                    groupBy={groupBy} 
                    count={group.count}
                    groupPageSize={groupPageSize}
                  />
                ) : null}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {meta?.total} groupes trouvés
        </div>
        
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-500">Éléments par page:</span>
          <Select 
            value={pageSize.toString()} 
            onValueChange={(value) => {
              setPageSize(parseInt(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue placeholder="20" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          
          <SimplePagination
            currentPage={page}
            totalPages={meta?.totalPages || 1}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
} 