import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Percent, Loader2, Check, ChevronDown, ChevronUp, Landmark, Home, FileText, Banknote, Receipt, Tags, Save, Trash2, FolderOpen, ChevronRight, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Transaction } from "@/types";
import { TRANSACTION_CATEGORIES, TRANSACTION_CATEGORY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { format, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PropertyData {
  monthlyRent: number;
  monthlyExpenses: number;
  purchasePrice: number;
}

interface MaintenanceData {
  totalCosts: number;
}

interface TransactionSummary {
  rent: number;
  maintenance: number;
  insurance: number;
  tax: number;
  utility: number;
  other: number;
  repairs: number;
  renovation: number;
  propertyManagement: number;
  pendingRent: number;
  completedRent: number;
}

interface RoiMetrics {
  cashFlow: number;
  monthlyFlow: number;
  cashOnCash: string;
  capRate: string;
  totalROI: string;
  netOperatingIncome: number;
  expenseBreakdown: {
    maintenance: number;
    renovation: number;
    insurance: number;
    propertyManagement: number;
    utilities: number;
    tax: number;
    other: number;
  };
}

interface AnalysisTemplate {
  id: string;
  name: string;
  data: {
    monthlyRent: number;
    monthlyExpenses: number;
    purchasePrice: number;
    propertyTaxRate: number;
    maintenanceReserve: number;
    vacancyRate: number;
    mortgageRate: number;
    downPayment: number;
    loanTerm: number;
    insuranceCost: number;
    propertyManagementFee: number;
    utilityExpenses: number;
    otherCharges: number;
    maintenanceCosts: number;
    repairBudget: number;
    renovationBudget: number;
    taxCosts: number;
  };
  analysisConfig: {
    periodType: 'months' | 'quarters' | 'years';
    periodValue: number;
  };
  createdAt: string;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  adjustments: {
    monthlyRent: number;
    vacancyRate: number;
    maintenanceReserve: number;
    utilityExpenses: number;
  };
}

interface ROICalculatorProps {
  propertyId: number;
  initialData?: {
    monthlyRent: number;
    monthlyExpenses: number;
    purchasePrice: number;
    propertyTaxRate?: number;
    maintenanceReserve?: number;
    vacancyRate?: number;
    mortgageRate?: number;
    downPayment?: number;
    loanTerm?: number;
    insuranceCost?: number;
    propertyManagementFee?: number;
    utilityExpenses?: number;
    otherCharges?: number;
    maintenanceCosts?: number;
    repairBudget?: number;
    renovationBudget?: number;
    taxCosts?: number;
  };
  buttonProps?: ButtonProps;
}

const defaultScenarios: Scenario[] = [
  {
    id: "optimistic",
    name: "Optimiste",
    description: "Meilleur scénario avec occupation maximale et charges minimales",
    adjustments: {
      monthlyRent: 1.1, // +10%
      vacancyRate: 0.8, // -20%
      maintenanceReserve: 0.8, // -20%
      utilityExpenses: 0.9, // -10%
    },
  },
  {
    id: "realistic",
    name: "Réaliste",
    description: "Scénario basé sur les moyennes du marché",
    adjustments: {
      monthlyRent: 1,
      vacancyRate: 1,
      maintenanceReserve: 1,
      utilityExpenses: 1,
    },
  },
  {
    id: "pessimistic",
    name: "Pessimiste",
    description: "Pire scénario avec vacances et charges élevées",
    adjustments: {
      monthlyRent: 0.9, // -10%
      vacancyRate: 1.2, // +20%
      maintenanceReserve: 1.2, // +20%
      utilityExpenses: 1.1, // +10%
    },
  },
];

export function ROICalculator({ propertyId, initialData, buttonProps }: ROICalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dateRange, setDateRange] = useState<number>(12); // Nombre de mois à analyser
  const [analysisConfig, setAnalysisConfig] = useState({
    periodType: 'months' as 'months' | 'quarters' | 'years',
    periodValue: 12
  });
  const [templates, setTemplates] = useState<AnalysisTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummary>({
    rent: 0,
    maintenance: 0,
    insurance: 0,
    tax: 0,
    utility: 0,
    other: 0,
    repairs: 0,
    renovation: 0,
    propertyManagement: 0,
    pendingRent: 0,
    completedRent: 0
  });
  
  const [roiMetrics, setRoiMetrics] = useState<RoiMetrics>({
    cashFlow: 0,
    monthlyFlow: 0,
    cashOnCash: "0",
    capRate: "0",
    totalROI: "0",
    netOperatingIncome: 0,
    expenseBreakdown: {
      maintenance: 0,
      renovation: 0,
      insurance: 0,
      propertyManagement: 0,
      utilities: 0,
      tax: 0,
      other: 0
    }
  });

  const { data: maintenanceData = { totalCosts: 0 } } = useQuery<MaintenanceData>({
    queryKey: ["/api/maintenance", propertyId],
    enabled: !!propertyId,
  });

  const { data: propertyData = { monthlyRent: 0, monthlyExpenses: 0, purchasePrice: 0 } } = useQuery<PropertyData>({
    queryKey: ["/api/properties", propertyId],
    enabled: !initialData && !!propertyId,
  });

  // Récupérer les transactions liées à la propriété
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", propertyId],
    queryFn: async () => {
      const response = await fetch(`/api/transactions?propertyId=${propertyId}`);
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des transactions");
      }
      const data = await response.json();
      return Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
    },
    enabled: !!propertyId && isOpen,
  });

  // Charger les templates au démarrage
  useEffect(() => {
    const savedTemplates = localStorage.getItem(`roi-templates-${propertyId}`);
    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates));
    }
  }, [propertyId]);

  // Créer un template par défaut pour les mises à jour automatiques
  const defaultTemplate: AnalysisTemplate = {
    id: "default-template",
    name: "Template par défaut (Mises à jour automatiques)",
    data: {
      monthlyRent: 0,
      monthlyExpenses: 0,
      purchasePrice: 0,
      propertyTaxRate: 1.2,
      maintenanceReserve: 5,
      vacancyRate: 5,
      mortgageRate: 3.5,
      downPayment: 20,
      loanTerm: 25,
      insuranceCost: 0,
      propertyManagementFee: 0,
      utilityExpenses: 0,
      otherCharges: 0,
      maintenanceCosts: 0,
      repairBudget: 0,
      renovationBudget: 0,
      taxCosts: 0,
    },
    analysisConfig: {
      periodType: 'months',
      periodValue: 12
    },
    createdAt: new Date().toISOString(),
  };

  // Calculer la date de début en fonction du type de période sélectionné
  const calculateCutoffDate = () => {
    const now = new Date();
    switch (analysisConfig.periodType) {
      case 'quarters':
        return subMonths(now, analysisConfig.periodValue * 3);
      case 'years':
        return subMonths(now, analysisConfig.periodValue * 12);
      case 'months':
      default:
        return subMonths(now, analysisConfig.periodValue);
    }
  };
  
  // Analyser les transactions pour calculer les montants par catégorie
  useEffect(() => {
    if (transactions.length > 0) {
      const cutoffDate = calculateCutoffDate();
      
      // Filtrer les transactions pour la période sélectionnée et uniquement celles complétées
      const filteredTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        // N'inclure que les transactions complétées
        return transactionDate >= cutoffDate && transaction.status === 'completed';
      });

      // Calculer les montants par catégorie
      const summary: TransactionSummary = {
        rent: 0,
        maintenance: 0,
        insurance: 0,
        tax: 0,
        utility: 0,
        other: 0,
        repairs: 0,
        renovation: 0,
        propertyManagement: 0,
        pendingRent: 0,
        completedRent: 0
      };

      // Grouper les transactions par type et catégorie pour l'analyse
      filteredTransactions.forEach(transaction => {
        const amount = parseFloat(String(transaction.amount));
        if (isNaN(amount)) return;

        // Revenus de loyer
        if (transaction.type === 'income' && transaction.category === TRANSACTION_CATEGORIES.RENT) {
          // Ajouter au total des loyers par catégorie
          summary.rent += amount;
          summary.completedRent += amount;
          return;
        }

        // Dépenses
        if (transaction.type === 'expense') {
          const category = transaction.category.toLowerCase();
          
          // Catégories standards définies dans TRANSACTION_CATEGORIES
          if (category === TRANSACTION_CATEGORIES.MAINTENANCE) {
            summary.maintenance += Math.abs(amount);
          } else if (category === TRANSACTION_CATEGORIES.INSURANCE) {
            summary.insurance += Math.abs(amount);
          } else if (category === TRANSACTION_CATEGORIES.TAX) {
            summary.tax += Math.abs(amount);
          } else if (category === TRANSACTION_CATEGORIES.UTILITY) {
            summary.utility += Math.abs(amount);
          } else if (category === 'repairs') {
            summary.repairs += Math.abs(amount);
          } else if (category === 'renovation') {
            summary.renovation += Math.abs(amount);
          } else if (category === 'property_management' || category === 'management') {
            summary.propertyManagement += Math.abs(amount);
          } else {
            summary.other += Math.abs(amount);
          }
        }
      });

      // Calculer les moyennes mensuelles - ajuster pour la période correcte
      const divider = analysisConfig.periodType === 'quarters' 
        ? analysisConfig.periodValue * 3 
        : analysisConfig.periodType === 'years' 
          ? analysisConfig.periodValue * 12 
          : analysisConfig.periodValue;
          
      Object.keys(summary).forEach(key => {
        summary[key as keyof TransactionSummary] = summary[key as keyof TransactionSummary] / divider;
      });

      setTransactionSummary(summary);
      console.log(`Résumé des transactions complétées sur ${divider} mois:`, summary);
    }
  }, [transactions, analysisConfig]);

  const [data, setData] = useState({
    monthlyRent: initialData?.monthlyRent ?? propertyData.monthlyRent,
    monthlyExpenses: initialData?.monthlyExpenses ?? propertyData.monthlyExpenses,
    purchasePrice: initialData?.purchasePrice ?? propertyData.purchasePrice,
    propertyTaxRate: initialData?.propertyTaxRate || 1.2,
    maintenanceReserve: initialData?.maintenanceReserve || 5,
    vacancyRate: initialData?.vacancyRate || 5,
    mortgageRate: initialData?.mortgageRate || 3.5,
    downPayment: initialData?.downPayment || 20,
    loanTerm: initialData?.loanTerm || 25,
    insuranceCost: initialData?.insuranceCost || 0,
    propertyManagementFee: initialData?.propertyManagementFee || 0,
    utilityExpenses: initialData?.utilityExpenses || 0,
    otherCharges: initialData?.otherCharges || 0,
    maintenanceCosts: initialData?.maintenanceCosts ?? maintenanceData.totalCosts,
    repairBudget: initialData?.repairBudget || 0,
    renovationBudget: initialData?.renovationBudget || 0,
    taxCosts: initialData?.taxCosts || 0,
  });

  // Mettre à jour les valeurs par défaut avec les données des transactions
  useEffect(() => {
    if (isOpen && transactions.length > 0) {
      // Ne mettre à jour automatiquement que si aucun template n'est sélectionné
      if (!selectedTemplate) {
        // Calculer le total des dépenses mensuelles
        const totalMonthlyExpenses = 
          (transactionSummary.insurance || 0) +
          (transactionSummary.propertyManagement || 0) +
          (transactionSummary.utility || 0) +
          (transactionSummary.maintenance || 0) +
          (transactionSummary.repairs || 0) +
          (transactionSummary.renovation || 0) +
          (transactionSummary.tax || 0) +
          (transactionSummary.other || 0);

        setData(prevData => ({
          ...prevData,
          // Revenus
          monthlyRent: transactionSummary.completedRent || prevData.monthlyRent,
          monthlyExpenses: totalMonthlyExpenses || prevData.monthlyExpenses,
          
          // Charges mensuelles
          insuranceCost: transactionSummary.insurance || prevData.insuranceCost,
          propertyManagementFee: transactionSummary.propertyManagement > 0 && transactionSummary.completedRent > 0
            ? (transactionSummary.propertyManagement / transactionSummary.completedRent) * 100 
            : prevData.propertyManagementFee,
          utilityExpenses: transactionSummary.utility || prevData.utilityExpenses,
          otherCharges: transactionSummary.other || prevData.otherCharges,
          
          // Maintenance et réparations
          maintenanceCosts: transactionSummary.maintenance || prevData.maintenanceCosts,
          repairBudget: transactionSummary.repairs || prevData.repairBudget,
          renovationBudget: transactionSummary.renovation || prevData.renovationBudget,
          
          // Taxes
          taxCosts: transactionSummary.tax || prevData.taxCosts,
          propertyTaxRate: transactionSummary.tax > 0 && prevData.purchasePrice > 0
            ? (transactionSummary.tax * 12 / prevData.purchasePrice) * 100
            : prevData.propertyTaxRate,
          
          // Réserves (calculées en pourcentage)
          vacancyRate: prevData.vacancyRate, // Garder la valeur par défaut car c'est un pourcentage
          maintenanceReserve: prevData.maintenanceReserve, // Garder la valeur par défaut car c'est un pourcentage
          
          // Paramètres du prêt (garder les valeurs par défaut car non liés aux transactions)
          mortgageRate: prevData.mortgageRate,
          downPayment: prevData.downPayment,
          loanTerm: prevData.loanTerm
        }));
      }
    }
  }, [isOpen, transactions, transactionSummary, selectedTemplate]);

  // Fonction pour calculer les métriques ROI avec les données actuelles
  useEffect(() => {
    const metrics = calculateROI();
    setRoiMetrics(metrics);
  }, [data]);

  const calculateROI = () => {
    const annualRent = data.monthlyRent * 12;

    const annualCharges = {
      maintenance: (data.maintenanceCosts || 0) + (data.repairBudget || 0),
      renovation: data.renovationBudget || 0,
      insurance: data.insuranceCost * 12,
      propertyManagement: (data.monthlyRent * (data.propertyManagementFee / 100)) * 12,
      utilities: data.utilityExpenses * 12,
      tax: data.taxCosts * 12,
      other: data.otherCharges * 12,
    };

    const totalAnnualExpenses = Object.values(annualCharges).reduce((a, b) => a + b, 0);

    const vacancyReserve = (annualRent * data.vacancyRate) / 100;
    const maintenanceReserve = (annualRent * data.maintenanceReserve) / 100;
    const propertyTax = (data.purchasePrice * data.propertyTaxRate) / 100;

    const loanAmount = data.purchasePrice * (1 - data.downPayment / 100);
    const monthlyRate = data.mortgageRate / 12 / 100;
    const numberOfPayments = data.loanTerm * 12;
    const monthlyMortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    const annualMortgage = monthlyMortgage * 12;

    const totalInvestment = data.purchasePrice + annualCharges.renovation;

    const netOperatingIncome = annualRent - totalAnnualExpenses - vacancyReserve - maintenanceReserve - propertyTax;
    const cashFlow = netOperatingIncome - annualMortgage;

    const cashOnCash = ((cashFlow / (totalInvestment * data.downPayment / 100)) * 100);
    const capRate = ((netOperatingIncome / totalInvestment) * 100);
    const totalROI = ((netOperatingIncome / totalInvestment) * 100);

    return {
      cashFlow,
      monthlyFlow: cashFlow / 12,
      cashOnCash: cashOnCash.toFixed(2),
      capRate: capRate.toFixed(2),
      totalROI: totalROI.toFixed(2),
      netOperatingIncome,
      expenseBreakdown: annualCharges,
    };
  };

  // Formater le montant en euros
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Charger un template
  const loadTemplate = (templateId: string) => {
    try {
      // Si c'est le template par défaut, activer les mises à jour automatiques
      if (templateId === "default-template") {
        // Ne pas réinitialiser les données, juste activer les mises à jour automatiques
        setSelectedTemplate(null); // Réinitialiser pour activer les mises à jour automatiques
        
        toast({
          title: "Template par défaut chargé",
          description: "Les mises à jour automatiques sont activées",
          className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
        });
        return;
      }
      
      const template = templates.find(t => t.id === templateId);
      if (template) {
        // Créer une copie profonde des données pour éviter les problèmes de référence
        const templateData = JSON.parse(JSON.stringify(template.data));
        const templateConfig = JSON.parse(JSON.stringify(template.analysisConfig));
        
        // Mettre à jour les données de manière sécurisée
        setData(templateData);
        setAnalysisConfig(templateConfig);
        setSelectedTemplate(templateId);
        
        toast({
          title: "Template chargé",
          description: `Le template "${template.name}" a été chargé`,
          className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement du template:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le template. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  // Sauvegarder un template
  const saveTemplate = () => {
    if (!templateName) {
      toast({
        title: "Erreur",
        description: "Veuillez donner un nom à votre template",
        variant: "destructive",
      });
      return;
    }

    try {
      // Créer une copie profonde des données pour éviter les problèmes de référence
      const templateData = JSON.parse(JSON.stringify(data));
      const templateConfig = JSON.parse(JSON.stringify(analysisConfig));
      
      const newTemplate: AnalysisTemplate = {
        id: crypto.randomUUID(),
        name: templateName,
        data: templateData,
        analysisConfig: templateConfig,
        createdAt: new Date().toISOString(),
      };

      const updatedTemplates = [...templates, newTemplate];
      setTemplates(updatedTemplates);
      localStorage.setItem(`roi-templates-${propertyId}`, JSON.stringify(updatedTemplates));
      
      setTemplateName("");
      setShowSaveDialog(false);
      
      toast({
        title: "Template sauvegardé",
        description: "Votre template a été sauvegardé avec succès",
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du template:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le template. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  // Supprimer un template
  const deleteTemplate = (templateId: string) => {
    try {
      const updatedTemplates = templates.filter(t => t.id !== templateId);
      setTemplates(updatedTemplates);
      localStorage.setItem(`roi-templates-${propertyId}`, JSON.stringify(updatedTemplates));
      
      if (selectedTemplate === templateId) {
        setSelectedTemplate(null);
      }
      
      toast({
        title: "Template supprimé",
        description: "Le template a été supprimé avec succès",
        className: "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20",
      });
    } catch (error) {
      console.error("Erreur lors de la suppression du template:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le template. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  // Ajouter un useEffect pour réinitialiser l'état lors de l'ouverture/fermeture du dialogue
  useEffect(() => {
    if (!isOpen) {
      // Réinitialiser l'état lorsque le dialogue est fermé
      setSelectedTemplate(null);
    }
  }, [isOpen]);

  const [selectedScenario, setSelectedScenario] = useState<string>("realistic");
  const [scenarios, setScenarios] = useState<Scenario[]>(defaultScenarios);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<string>("general");
  const [activeMetricsTab, setActiveMetricsTab] = useState<string>("indicators");
  const itemsPerPage = 3; // Nombre d'éléments par page

  const calculateScenarioMetrics = (scenario: Scenario) => {
    // Créer une copie des données avec les ajustements du scénario
    const adjustedData = {
      ...data,
      monthlyRent: data.monthlyRent * scenario.adjustments.monthlyRent,
      vacancyRate: data.vacancyRate * scenario.adjustments.vacancyRate,
      maintenanceReserve: data.maintenanceReserve * scenario.adjustments.maintenanceReserve,
      utilityExpenses: data.utilityExpenses * scenario.adjustments.utilityExpenses,
    };

    // Calculer le ROI avec les données ajustées
    const annualRent = adjustedData.monthlyRent * 12;

    const annualCharges = {
      maintenance: (adjustedData.maintenanceCosts || 0) + (adjustedData.repairBudget || 0),
      renovation: adjustedData.renovationBudget || 0,
      insurance: adjustedData.insuranceCost * 12,
      propertyManagement: (adjustedData.monthlyRent * (adjustedData.propertyManagementFee / 100)) * 12,
      utilities: adjustedData.utilityExpenses * 12,
      tax: adjustedData.taxCosts * 12,
      other: adjustedData.otherCharges * 12,
    };

    const totalAnnualExpenses = Object.values(annualCharges).reduce((a, b) => a + b, 0);

    const vacancyReserve = (annualRent * adjustedData.vacancyRate) / 100;
    const maintenanceReserve = (annualRent * adjustedData.maintenanceReserve) / 100;
    const propertyTax = (adjustedData.purchasePrice * adjustedData.propertyTaxRate) / 100;

    const loanAmount = adjustedData.purchasePrice * (1 - adjustedData.downPayment / 100);
    const monthlyRate = adjustedData.mortgageRate / 12 / 100;
    const numberOfPayments = adjustedData.loanTerm * 12;
    const monthlyMortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    const annualMortgage = monthlyMortgage * 12;

    const totalInvestment = adjustedData.purchasePrice + annualCharges.renovation;

    const netOperatingIncome = annualRent - totalAnnualExpenses - vacancyReserve - maintenanceReserve - propertyTax;
    const cashFlow = netOperatingIncome - annualMortgage;

    const cashOnCash = ((cashFlow / (totalInvestment * adjustedData.downPayment / 100)) * 100);
    const capRate = ((netOperatingIncome / totalInvestment) * 100);
    const totalROI = ((netOperatingIncome / totalInvestment) * 100);

    return {
      cashFlow,
      monthlyFlow: cashFlow / 12,
      cashOnCash: cashOnCash.toFixed(2),
      capRate: capRate.toFixed(2),
      totalROI: totalROI.toFixed(2),
      netOperatingIncome,
      expenseBreakdown: annualCharges,
    };
  };

  // Calculer le nombre total de pages
  const totalPages = Math.ceil(scenarios.length / itemsPerPage);

  // Obtenir les scénarios pour la page actuelle
  const currentScenarios = scenarios.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button {...buttonProps}>
          <Calculator className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden max-h-[90vh] flex flex-col">
            <DialogHeader className="px-4 pt-4 pb-2 border-b">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-primary" />
                  Analyse ROI & Cash Flow
                </DialogTitle>
                <div className="flex items-center gap-2">
                  {selectedTemplate && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                      <FolderOpen className="h-3 w-3 mr-1" />
                      {templates.find(t => t.id === selectedTemplate)?.name}
                    </Badge>
                  )}
                  <Popover open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <Save className="h-3 w-3 mr-1" />
                        Sauvegarder
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-4">
                        <h4 className="font-medium">Sauvegarder un template</h4>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Nom du template"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                          />
                          <Button onClick={saveTemplate} disabled={!templateName}>
                            Sauvegarder
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <FolderOpen className="h-3 w-3 mr-1" />
                        Templates
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem 
                        onClick={() => loadTemplate("default-template")}
                        className="flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <Calculator className="h-3 w-3 text-primary" />
                          Template par défaut
                        </span>
                        {!selectedTemplate && (
                          <Check className="h-3 w-3 text-primary" />
                        )}
                      </DropdownMenuItem>
                      
                      {templates.length > 0 && <DropdownMenuSeparator />}
                      
                      {templates.length > 0 ? (
                        <>
                          {templates.map((template) => (
                            <DropdownMenuItem 
                              key={template.id}
                              onClick={() => loadTemplate(template.id)}
                              className="flex items-center justify-between"
                            >
                              <span>{template.name}</span>
                              <div className="flex items-center gap-1">
                                {selectedTemplate === template.id && (
                                  <Check className="h-3 w-3 text-primary" />
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTemplate(template.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </>
                      ) : (
                        <DropdownMenuItem disabled>
                          Aucun template personnalisé
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-background text-xs">
                    Propriété #{propertyId}
                  </Badge>
                  {transactions.length > 0 && (
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{transactions.length} transactions</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={analysisConfig.periodType}
                    onValueChange={(value: 'months' | 'quarters' | 'years') => 
                      setAnalysisConfig(prev => ({ ...prev, periodType: value }))
                    }
                  >
                    <SelectTrigger className="h-8 w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="months">Mois</SelectItem>
                      <SelectItem value="quarters">Trimestres</SelectItem>
                      <SelectItem value="years">Années</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={String(analysisConfig.periodValue)}
                    onValueChange={(value) => 
                      setAnalysisConfig(prev => ({ ...prev, periodValue: parseInt(value) }))
                    }
                  >
                    <SelectTrigger className="h-8 w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {analysisConfig.periodType === 'months' && (
                        <>
                          <SelectItem value="3">3 mois</SelectItem>
                          <SelectItem value="6">6 mois</SelectItem>
                          <SelectItem value="12">12 mois</SelectItem>
                          <SelectItem value="24">24 mois</SelectItem>
                          <SelectItem value="36">36 mois</SelectItem>
                        </>
                      )}
                      {analysisConfig.periodType === 'quarters' && (
                        <>
                          <SelectItem value="1">1 trim.</SelectItem>
                          <SelectItem value="2">2 trim.</SelectItem>
                          <SelectItem value="4">4 trim.</SelectItem>
                          <SelectItem value="8">8 trim.</SelectItem>
                        </>
                      )}
                      {analysisConfig.periodType === 'years' && (
                        <>
                          <SelectItem value="1">1 an</SelectItem>
                          <SelectItem value="2">2 ans</SelectItem>
                          <SelectItem value="3">3 ans</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DialogHeader>

            {isLoadingTransactions ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary/70" />
                <span className="ml-2 text-sm text-muted-foreground">Chargement des données...</span>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-3 p-4 overflow-y-auto flex-1">
                {/* Colonne de gauche - Métriques */}
                <div className="col-span-4 space-y-3">
                  {/* Métriques avec onglets */}
                  <Card className="overflow-hidden">
                    <CardHeader className="py-2 px-3 bg-muted/30">
                      <Tabs defaultValue="indicators" className="w-full" value={activeMetricsTab} onValueChange={setActiveMetricsTab}>
                        <TabsList className="w-full rounded-none border-b bg-muted/30 h-8">
                          <TabsTrigger value="indicators" className="flex-1 data-[state=active]:bg-background text-xs">Indicateurs ROI</TabsTrigger>
                          <TabsTrigger value="scenarios" className="flex-1 data-[state=active]:bg-background text-xs">Scénarios</TabsTrigger>
              </TabsList>

                        <div className="p-0">
                          <TabsContent value="indicators" className="mt-0">
                            <CardContent className="p-3">
                              <div className="space-y-3">
                                <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-3 text-center">
                                  <p className="text-xs text-muted-foreground mb-1">Cash Flow Mensuel</p>
                                  <p className={cn("text-xl font-bold", roiMetrics.monthlyFlow >= 0 ? "text-green-600" : "text-red-600")}>
                                    {formatCurrency(roiMetrics.monthlyFlow)}
                                  </p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="bg-muted rounded-lg p-2 text-center">
                                    <p className="text-xs text-muted-foreground mb-0.5">Cash on Cash</p>
                                    <p className="text-sm font-semibold flex items-center justify-center gap-1">
                                      {roiMetrics.cashOnCash}
                                      <Percent className="h-3 w-3" />
                                    </p>
                                  </div>
                                  <div className="bg-muted rounded-lg p-2 text-center">
                                    <p className="text-xs text-muted-foreground mb-0.5">Taux de Capitalisation</p>
                                    <p className="text-sm font-semibold flex items-center justify-center gap-1">
                                      {roiMetrics.capRate}
                                      <Percent className="h-3 w-3" />
                                    </p>
                                  </div>
                                </div>

                                <Accordion type="single" collapsible defaultValue="breakdown" className="text-xs">
                                  <AccordionItem value="breakdown" className="border-b-0">
                                    <AccordionTrigger className="py-1">
                                      <span className="text-xs font-medium">Revenus et dépenses</span>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-1 text-xs">
                                        <div className="flex justify-between py-0.5 border-b border-dashed">
                                          <span>Revenus annuels</span>
                                          <span className="font-medium text-green-600">{formatCurrency(data.monthlyRent * 12)}</span>
                                        </div>
                                        <div className="flex justify-between py-0.5 border-b border-dashed">
                                          <span>Charges annuelles</span>
                                          <span className="font-medium text-red-600">-{formatCurrency(Object.values(roiMetrics.expenseBreakdown).reduce((a, b) => a + b, 0))}</span>
                                        </div>
                                        <div className="flex justify-between py-0.5 border-b border-dashed">
                                          <span>Cash flow annuel</span>
                                          <span className={cn("font-medium", roiMetrics.cashFlow >= 0 ? "text-green-600" : "text-red-600")}>
                                            {formatCurrency(roiMetrics.cashFlow)}
                                          </span>
                                        </div>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              </div>
                            </CardContent>
                          </TabsContent>

                          <TabsContent value="scenarios" className="mt-0">
                            <CardContent className="p-3">
                              <div className="space-y-2">
                                {currentScenarios.map((scenario) => {
                                  const metrics = calculateScenarioMetrics(scenario);
                                  return (
                                    <div
                                      key={scenario.id}
                                      className={cn(
                                        "p-2 rounded-lg border transition-colors",
                                        selectedScenario === scenario.id
                                          ? "bg-primary/5 border-primary/20"
                                          : "bg-muted/50"
                                      )}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-sm font-medium">{scenario.name}</h4>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setSelectedScenario(scenario.id)}
                                          className={cn(
                                            "h-6 w-6 p-0",
                                            selectedScenario === scenario.id && "bg-primary/10"
                                          )}
                                        >
                                          {selectedScenario === scenario.id ? (
                                            <Check className="h-3 w-3" />
                                          ) : (
                                            <ChevronRight className="h-3 w-3" />
                                          )}
                                        </Button>
                                      </div>
                                      <p className="text-xs text-muted-foreground mb-2">
                                        {scenario.description}
                                      </p>
                                      <div className="grid grid-cols-2 gap-1 text-xs">
                  <div>
                                          <span className="text-muted-foreground">Cash Flow</span>
                                          <p className={cn(
                                            "font-medium",
                                            metrics.monthlyFlow >= 0 ? "text-green-600" : "text-red-600"
                                          )}>
                                            {formatCurrency(metrics.monthlyFlow)}/mois
                                          </p>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">ROI</span>
                                          <p className="font-medium">{metrics.totalROI}%</p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Pagination */}
                              {totalPages > 1 && (
                                <div className="flex items-center justify-center mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="h-6 w-6 p-0"
                                  >
                                    <ChevronLeft className="h-3 w-3" />
                                  </Button>
                                  <span className="mx-2 text-xs">
                                    Page {currentPage} sur {totalPages}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="h-6 w-6 p-0"
                                  >
                                    <ChevronRight className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </TabsContent>
                        </div>
                      </Tabs>
                    </CardHeader>
                  </Card>
                </div>

                {/* Partie droite - Formulaire */}
                <div className="col-span-8">
                  <Card className="overflow-hidden">
                    <CardHeader className="py-2 px-3 bg-muted/30">
                      <CardTitle className="text-sm flex items-center gap-1">
                        <Home className="h-4 w-4 text-primary" />
                        Paramètres de calcul
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Tabs defaultValue="general" className="w-full" value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="w-full rounded-none border-b bg-muted/30 h-10">
                          <TabsTrigger value="general" className="flex-1 data-[state=active]:bg-background text-xs">Général</TabsTrigger>
                          <TabsTrigger value="charges" className="flex-1 data-[state=active]:bg-background text-xs">Charges</TabsTrigger>
                          <TabsTrigger value="maintenance" className="flex-1 data-[state=active]:bg-background text-xs">Entretien & Taxes</TabsTrigger>
                        </TabsList>

                        <div className="p-3">
                          <TabsContent value="general" className="mt-0 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Loyer mensuel</Label>
                    <Input
                      type="number"
                      value={data.monthlyRent}
                      onChange={(e) => setData({ ...data, monthlyRent: parseFloat(e.target.value) || 0 })}
                                  className="mt-1 h-8 text-sm"
                                />
                                {!selectedTemplate && transactionSummary.rent > 0 && (
                                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    Basé sur les transactions: {formatCurrency(transactionSummary.rent)}/mois
                                  </p>
                                )}
                  </div>
                  <div>
                                <Label className="text-xs">Prix d'achat</Label>
                    <Input
                      type="number"
                      value={data.purchasePrice}
                      onChange={(e) => setData({ ...data, purchasePrice: parseFloat(e.target.value) || 0 })}
                                  className="mt-1 h-8 text-sm"
                    />
                  </div>
                </div>

                            <div className="grid grid-cols-3 gap-3">
                  <div>
                                <Label className="text-xs">Taux du prêt (%)</Label>
                    <Input
                      type="number"
                      value={data.mortgageRate}
                      onChange={(e) => setData({ ...data, mortgageRate: parseFloat(e.target.value) || 0 })}
                                  className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                                <Label className="text-xs">Apport initial (%)</Label>
                    <Input
                      type="number"
                      value={data.downPayment}
                      onChange={(e) => setData({ ...data, downPayment: parseFloat(e.target.value) || 0 })}
                                  className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                                <Label className="text-xs">Durée du prêt (années)</Label>
                    <Input
                      type="number"
                      value={data.loanTerm}
                      onChange={(e) => setData({ ...data, loanTerm: parseFloat(e.target.value) || 0 })}
                                  className="mt-1 h-8 text-sm"
                    />
                  </div>
                </div>
              </TabsContent>

                          <TabsContent value="charges" className="mt-0 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                  <div>
                                <Label className="text-xs">{TRANSACTION_CATEGORY_LABELS.insurance} mensuelle</Label>
                    <Input
                      type="number"
                      value={data.insuranceCost}
                      onChange={(e) => setData({ ...data, insuranceCost: parseFloat(e.target.value) || 0 })}
                                  className="mt-1 h-8 text-sm"
                                />
                                {!selectedTemplate && transactionSummary.insurance > 0 && (
                                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    Basé sur les transactions: {formatCurrency(transactionSummary.insurance)}/mois
                                  </p>
                                )}
                  </div>
                  <div>
                                <Label className="text-xs">Frais de gestion (%)</Label>
                    <Input
                      type="number"
                      value={data.propertyManagementFee}
                      onChange={(e) => setData({ ...data, propertyManagementFee: parseFloat(e.target.value) || 0 })}
                                  className="mt-1 h-8 text-sm"
                                />
                                {!selectedTemplate && transactionSummary.propertyManagement > 0 && (
                                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    Basé sur les transactions: {formatCurrency(transactionSummary.propertyManagement)}/mois
                                  </p>
                                )}
                  </div>
                </div>

                            <div className="grid grid-cols-2 gap-3">
                  <div>
                                <Label className="text-xs">{TRANSACTION_CATEGORY_LABELS.utility} mensuelles</Label>
                    <Input
                      type="number"
                      value={data.utilityExpenses}
                      onChange={(e) => setData({ ...data, utilityExpenses: parseFloat(e.target.value) || 0 })}
                                  className="mt-1 h-8 text-sm"
                                />
                                {!selectedTemplate && transactionSummary.utility > 0 && (
                                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    Basé sur les transactions: {formatCurrency(transactionSummary.utility)}/mois
                                  </p>
                                )}
                  </div>
                  <div>
                                <Label className="text-xs">Autres charges mensuelles</Label>
                    <Input
                      type="number"
                      value={data.otherCharges}
                      onChange={(e) => setData({ ...data, otherCharges: parseFloat(e.target.value) || 0 })}
                                  className="mt-1 h-8 text-sm"
                                />
                                {!selectedTemplate && transactionSummary.other > 0 && (
                                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    Basé sur les transactions: {formatCurrency(transactionSummary.other)}/mois
                                  </p>
                                )}
                  </div>
                </div>

                            <div className="grid grid-cols-3 gap-3">
                  <div>
                                <Label className="text-xs">Taux d'impôt foncier (%)</Label>
                    <Input
                      type="number"
                      value={data.propertyTaxRate}
                      onChange={(e) => setData({ ...data, propertyTaxRate: parseFloat(e.target.value) || 0 })}
                                  className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                                <Label className="text-xs">Réserve vacance (%)</Label>
                    <Input
                      type="number"
                      value={data.vacancyRate}
                      onChange={(e) => setData({ ...data, vacancyRate: parseFloat(e.target.value) || 0 })}
                                  className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                                <Label className="text-xs">Réserve maintenance (%)</Label>
                    <Input
                      type="number"
                      value={data.maintenanceReserve}
                      onChange={(e) => setData({ ...data, maintenanceReserve: parseFloat(e.target.value) || 0 })}
                                  className="mt-1 h-8 text-sm"
                    />
                  </div>
                </div>
              </TabsContent>

                          <TabsContent value="maintenance" className="mt-0 space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                  <div>
                                <Label className="text-xs">Coûts de {TRANSACTION_CATEGORY_LABELS.maintenance}</Label>
                    <Input
                      type="number"
                      value={data.maintenanceCosts}
                      onChange={(e) => setData({ ...data, maintenanceCosts: parseFloat(e.target.value) || 0 })}
                                  className="mt-1 h-8 text-sm"
                                />
                                {!selectedTemplate && transactionSummary.maintenance > 0 && (
                                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    Basé sur les transactions: {formatCurrency(transactionSummary.maintenance)}/mois
                                  </p>
                                )}
                  </div>
                  <div>
                                <Label className="text-xs">Budget réparations</Label>
                    <Input
                      type="number"
                      value={data.repairBudget}
                      onChange={(e) => setData({ ...data, repairBudget: parseFloat(e.target.value) || 0 })}
                                  className="mt-1 h-8 text-sm"
                                />
                                {!selectedTemplate && transactionSummary.repairs > 0 && (
                                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    Basé sur les transactions: {formatCurrency(transactionSummary.repairs)}/mois
                                  </p>
                                )}
                  </div>
                  <div>
                                <Label className="text-xs">Budget rénovation</Label>
                    <Input
                      type="number"
                      value={data.renovationBudget}
                      onChange={(e) => setData({ ...data, renovationBudget: parseFloat(e.target.value) || 0 })}
                                  className="mt-1 h-8 text-sm"
                                />
                                {!selectedTemplate && transactionSummary.renovation > 0 && (
                                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    Basé sur les transactions: {formatCurrency(transactionSummary.renovation)}/mois
                                  </p>
                                )}
                  </div>
                </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">{TRANSACTION_CATEGORY_LABELS.tax} mensuelles</Label>
                                <Input
                                  type="number"
                                  value={data.taxCosts}
                                  onChange={(e) => setData({ ...data, taxCosts: parseFloat(e.target.value) || 0 })}
                                  className="mt-1 h-8 text-sm"
                                />
                                {!selectedTemplate && transactionSummary.tax > 0 && (
                                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    Basé sur les transactions: {formatCurrency(transactionSummary.tax)}/mois
                                  </p>
                                )}
              </div>
              </div>
                          </TabsContent>
              </div>
                      </Tabs>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-3 bg-muted/20">
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const tabs = ["general", "charges", "maintenance"];
                            const currentIndex = tabs.indexOf(activeTab);
                            const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                            setActiveTab(tabs[prevIndex]);
                          }}
                          disabled={activeTab === "general"}
                          className="h-7 text-xs"
                        >
                          <ChevronLeft className="h-3 w-3 mr-1" />
                          Précédent
              </Button>
              <Button
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const tabs = ["general", "charges", "maintenance"];
                            const currentIndex = tabs.indexOf(activeTab);
                            const nextIndex = (currentIndex + 1) % tabs.length;
                            setActiveTab(tabs[nextIndex]);
                          }}
                          disabled={activeTab === "maintenance"}
                          className="h-7 text-xs"
                        >
                          Suivant
                          <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
                      <Button variant="outline" onClick={() => setIsOpen(false)} className="h-7 text-xs">
                        Fermer
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </div>
            )}
          </DialogContent>
        </motion.div>
      </AnimatePresence>
    </Dialog>
  );
}