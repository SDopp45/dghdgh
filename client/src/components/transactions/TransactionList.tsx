import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";

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

interface TransactionListProps {
  groupBy?: string;
  groupKey?: string;
}

export function TransactionList({ groupBy, groupKey }: TransactionListProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', page, pageSize, sortBy, sortOrder, category, type, status, search, groupBy, groupKey],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
        ...(category && { category }),
        ...(type && { type }),
        ...(status && { status }),
        ...(search && { search }),
        ...(groupBy && { groupBy }),
        ...(groupKey && { groupKey }),
      });

      const response = await fetch(`/api/transactions?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return response.json();
    },
  });

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;

  const { data: transactions, meta } = data;

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
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
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tous</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="completed">Complété</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Propriété</TableHead>
            <TableHead>Locataire</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Montant</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction: Transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: fr })}
              </TableCell>
              <TableCell>{transaction.description}</TableCell>
              <TableCell>{transaction.property?.name || '-'}</TableCell>
              <TableCell>{transaction.tenant?.name || '-'}</TableCell>
              <TableCell>{transaction.category}</TableCell>
              <TableCell>{transaction.type}</TableCell>
              <TableCell>
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'EUR'
                }).format(transaction.amount)}
              </TableCell>
              <TableCell>{transaction.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination
        currentPage={page}
        totalPages={meta.totalPages}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
} 