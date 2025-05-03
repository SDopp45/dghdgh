import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LetterEditor } from "@/components/contracts/LetterEditor";
import { LETTER_TEMPLATES, LetterType } from "@/types/letters";
import { 
  FileText, 
  RefreshCw, 
  Download, 
  Save,
  Trash2,
  Search,
  Filter,
  Plus,
  History,
  Settings,
  FileSignature,
  Check,
  ArrowLeft,
  ArrowRight,
  Edit,
  Pencil,
  Mail,
  ChevronRight,
  ChevronLeft,
  Archive,
  Copy,
  MoreVertical,
  Printer,
  FileCode,
  FileType,
  FileArchive
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

interface CompanyInfo {
  name: string;
  address: string;
  siret?: string;
  logo?: string;
  signatureImage?: string;
}

interface LetterHistory {
  id: string;
  type: LetterType;
  title: string;
  date: string;
  recipient: string;
  status: "draft" | "sent" | "archived";
  content?: string;
  fields?: Record<string, string>;
  template?: string;
}

interface SignatureInfo {
  date: string;
  location: string;
  text: string;
  font: string;
  position: "left" | "center" | "right";
  useImage: boolean;
}

export default function LettersPage() {
  const { tenantId } = useParams();
  const { toast } = useToast();
  const letterRef = useRef<HTMLDivElement>(null);
  
  // Constantes d'animation pour les statistiques
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };
  
  // Style global pour assurer que les éditeurs aient un texte noir
  const editorGlobalStyle = `
    /* Style pour l'éditeur qui s'adapte au mode nuit */
    .ql-editor, .ql-container {
      color: var(--foreground) !important;
      background-color: transparent !important;
    }
    
    /* Styles pour l'aperçu de lettre qui doit rester en noir sur blanc */
    .letter-preview, .letter-preview-container, 
    .letter-preview-container * {
      color: black !important;
      background-color: white !important;
    }
    
    /* Force la couleur du texte pour le contenu de la lettre dans l'aperçu */
    .letter-content p,
    .letter-content div,
    .letter-content span,
    .letter-content h1,
    .letter-content h2,
    .letter-content h3,
    .letter-content h4,
    .letter-content h5,
    .letter-content h6,
    .letter-content li,
    .company-info,
    .signature-block {
      color: black !important;
    }
  `;
  
  const [selectedType, setSelectedType] = useState<LetterType>("mise_en_demeure_loyer");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [letterContent, setLetterContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "docx" | "txt">("pdf");
  const [civility, setCivility] = useState<"Monsieur" | "Madame">("Monsieur");
  const [showCompanyInfo, setShowCompanyInfo] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "",
    address: "",
    siret: "",
    logo: "",
    signatureImage: ""
  });
  const [selectedTemplate, setSelectedTemplate] = useState<string>("standard");
  const [activeTab, setActiveTab] = useState<string>("editor");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const [signatureInfo, setSignatureInfo] = useState<SignatureInfo>({
    date: new Date().toISOString().split('T')[0],
    location: "",
    text: "Signature",
    font: "font-signature",
    position: "right",
    useImage: false
  });
  const [letterHistory, setLetterHistory] = useState<LetterHistory[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const template = LETTER_TEMPLATES[selectedType];

  // Charger les données depuis localStorage au démarrage de l'application
  useEffect(() => {
    // Charger l'historique des lettres
    try {
      const savedHistory = localStorage.getItem('letterHistory');
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) {
          console.log("Historique chargé:", parsedHistory.length, "lettres");
          setLetterHistory(parsedHistory);
        } else {
          console.error("Historique invalide:", parsedHistory);
        }
      } else {
        console.log("Aucun historique trouvé dans localStorage");
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'historique:", error);
    }
    
    // Charger les infos de société depuis le localStorage
    try {
      const savedCompanyInfo = localStorage.getItem('companyInfo');
      if (savedCompanyInfo) {
        setCompanyInfo(JSON.parse(savedCompanyInfo));
      }
    } catch (error) {
      console.error("Erreur lors du chargement des infos de société:", error);
    }
    
    setIsDataLoaded(true);
  }, []);

  // Sauvegarder l'historique dans localStorage quand il change
  // mais seulement après le chargement initial
  useEffect(() => {
    if (isDataLoaded) {
      try {
        console.log("Sauvegarde de l'historique:", letterHistory.length, "lettres");
        localStorage.setItem('letterHistory', JSON.stringify(letterHistory));
      } catch (error) {
        console.error("Erreur lors de la sauvegarde de l'historique:", error);
        // Afficher une notification d'erreur
        toast({
          title: "Erreur de sauvegarde",
          description: "Impossible de sauvegarder l'historique des lettres"
        });
      }
    }
  }, [letterHistory, isDataLoaded, toast]);

  // Filtrer l'historique des lettres en fonction de la recherche et du filtre
  const filteredHistory = letterHistory.filter(letter => {
    const matchesSearch = letter.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         letter.recipient.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || letter.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleFieldChange = (field: string, value: string) => {
    setFields(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCompanyInfoChange = (field: keyof CompanyInfo, value: string) => {
    const updatedInfo = {
      ...companyInfo,
      [field]: value
    };
    setCompanyInfo(updatedInfo);
    
    // Sauvegarder dans localStorage
    localStorage.setItem('companyInfo', JSON.stringify(updatedInfo));
  };

  const handleSignatureInfoChange = (field: keyof SignatureInfo, value: string | boolean) => {
    setSignatureInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Fonction pour gérer l'upload du logo
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        handleCompanyInfoChange("logo", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fonction pour gérer l'upload de l'image de signature
  const handleSignatureImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        handleCompanyInfoChange("signatureImage", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // Ajout d'une fonction pour réinitialiser les informations société
  const resetCompanyInfo = () => {
    const emptyInfo: CompanyInfo = {
      name: "",
      address: "",
      siret: "",
      logo: "",
      signatureImage: ""
    };
    setCompanyInfo(emptyInfo);
    localStorage.removeItem('companyInfo');
    toast({
      title: "Informations réinitialisées",
      description: "Les informations de la société ont été effacées"
    });
  };

  // Fonction pour générer le contenu HTML complet avec les infos de société et signature
  const generateFullLetterContent = (content: string, forPdfExport: boolean = false) => {
    if (forPdfExport) {
      // Version pour PDF - structure simple et claire
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
            body {
              font-family: 'Roboto', Arial, sans-serif;
              font-size: 11pt;
              line-height: 1.5;
              color: #000000;
              margin: 0;
              padding: 0;
            }
            .page {
              padding: 20mm;
              position: relative;
            }
            .header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 15mm;
              border-bottom: 1px solid #eaeaea;
              padding-bottom: 5mm;
            }
            .company-info {
              max-width: 60%;
            }
            .company-name {
              font-weight: bold;
              margin-bottom: 3mm;
            }
            .company-details {
              white-space: pre-line;
              font-size: 10pt;
            }
            .company-logo {
              max-height: 20mm;
              max-width: 40mm;
              align-self: flex-start;
            }
            .recipient-block {
              text-align: right;
              margin-bottom: 10mm;
              margin-top: 5mm;
            }
            .recipient-name {
              font-weight: bold;
            }
            .recipient-address {
              white-space: pre-line;
            }
            .date-block {
              text-align: right;
              margin-bottom: 8mm;
            }
            .subject {
              font-weight: bold;
              margin-bottom: 10mm;
            }
            .letter-body {
              margin-bottom: 15mm;
              text-align: justify;
              white-space: pre-line; /* Préserver les espaces et retours à la ligne */
            }
            .letter-body p {
              margin-bottom: 10px;
              white-space: pre-line;
            }
            .letter-footer {
              margin-top: 15mm;
            }
            .signature-date {
              margin-bottom: 10mm;
              white-space: pre-line;
            }
            .signature-block-left {
              text-align: left;
            }
            .signature-block-center {
              text-align: center;
            }
            .signature-block-right {
              text-align: right;
            }
            .signature-image {
              max-height: 15mm;
              max-width: 40mm;
            }
          </style>
        </head>
        <body>
          <div class="page">
            ${showCompanyInfo ? `
              <div class="header">
                <div class="company-info">
                  ${companyInfo.name ? `<div class="company-name">${companyInfo.name}</div>` : ''}
                  ${companyInfo.address ? `<div class="company-details">${companyInfo.address}</div>` : ''}
                  ${companyInfo.siret ? `<div class="company-details">SIRET: ${companyInfo.siret}</div>` : ''}
                </div>
                ${companyInfo.logo ? `<img src="${companyInfo.logo}" class="company-logo" alt="Logo" />` : ''}
              </div>
            ` : ''}
            
            <div class="recipient-block">
              <div class="recipient-name">${fields.locataire_nom || fields.destinataire_nom || ""}</div>
              <div class="recipient-address">${fields.adresse || ""}</div>
            </div>
            
            <div class="date-block">
              Le ${new Date().toLocaleDateString('fr-FR')}
            </div>
            
            <div class="letter-body">
              ${content}
            </div>
            
            <div class="letter-footer">
              <div class="signature-date">
                Fait à ${signatureInfo.location || "_________"}, 
                le ${signatureInfo.date ? new Date(signatureInfo.date).toLocaleDateString('fr-FR') : "_________"}
              </div>
              
              <div class="signature-block-${signatureInfo.position}">
                ${signatureInfo.useImage && companyInfo.signatureImage ?
                  `<img src="${companyInfo.signatureImage}" class="signature-image" alt="Signature" />` :
                  `<div class="${signatureInfo.font}" style="font-size: 14pt;">${signatureInfo.text}</div>`
                }
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      // Version standard pour l'aperçu (inchangée)
      let standardContent = content;

      // Ajout des informations de la société
      if (showCompanyInfo && (companyInfo.name || companyInfo.address)) {
        const companyHeader = `
          <div class="company-info" style="margin-bottom: 30px; font-family: Arial, sans-serif; position: relative;">
            <div style="font-weight: bold; font-size: 16px;">${companyInfo.name}</div>
            <div style="font-size: 14px; white-space: pre-line;">${companyInfo.address}</div>
            ${companyInfo.siret ? `<div style="font-size: 14px;">SIRET: ${companyInfo.siret}</div>` : ''}
            ${companyInfo.logo ? `<div style="position: absolute; top: 0; right: 0;"><img src="${companyInfo.logo}" style="max-height: 80px; max-width: 200px;" /></div>` : ''}
          </div>
        `;
        standardContent = companyHeader + standardContent;
      }

      // Ajout des informations de date et lieu
      if (signatureInfo.date || signatureInfo.location) {
        const dateLocationBlock = `
          <div class="date-location-block" style="margin-top: 40px; font-family: Arial, sans-serif;">
            <p style="margin-bottom: 20px;">
              Fait à ${signatureInfo.location || "_________"}, 
              le ${signatureInfo.date ? new Date(signatureInfo.date).toLocaleDateString('fr-FR') : "_________"}
            </p>
          </div>
        `;
        standardContent = standardContent + dateLocationBlock;
      }

      // Ajout de la signature (séparée des informations de date et lieu)
      const signaturePositionStyle = {
        left: "text-align: left;",
        center: "text-align: center;",
        right: "text-align: right;"
      }[signatureInfo.position];

      // Déterminer le contenu de la signature (texte ou image)
      let signatureContent = '';
      if (signatureInfo.useImage && companyInfo.signatureImage) {
        signatureContent = `<img src="${companyInfo.signatureImage}" style="max-height: 60px; max-width: 200px;" />`;
      } else {
        signatureContent = `<div class="${signatureInfo.font}" style="font-size: 24px;">${signatureInfo.text}</div>`;
      }

      const signatureBlock = `
        <div class="signature-block" style="margin-top: 10px; font-family: Arial, sans-serif; ${signaturePositionStyle}">
          ${signatureContent}
        </div>
      `;
      standardContent = standardContent + signatureBlock;
      
      return standardContent;
    }
  };

  const generateLetter = async () => {
    try {
      setIsGenerating(true);
      setGenerationProgress(0);

      // Simulation de la progression
      const interval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const template = LETTER_TEMPLATES[selectedType];
      let content = template.templates[selectedTemplate].content;
      
      // Remplacer la civilité
      content = content.replace(/{civility}/g, civility);
      
      // Remplacer les variables dans le contenu
      Object.entries(fields).forEach(([key, value]) => {
        const regex = new RegExp(`{${key}}`, "g");
        content = content.replace(regex, value || "");
      });

      // Ajouter la date du jour si nécessaire
      const today = new Date().toLocaleDateString('fr-FR');
      content = content.replace(/{date_jour}/g, today);

      setLetterContent(content);
      setGenerationProgress(100);
      setIsGenerating(false);
      setActiveTab("editor");

      toast({
        title: "Succès",
        description: "La lettre a été générée avec succès",
      });
    } catch (error) {
      console.error("Erreur lors de la génération de la lettre:", error);
      setIsGenerating(false);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la génération de la lettre",
      });
    }
  };

  const downloadLetter = () => {
    switch (selectedFormat) {
      case "pdf":
        exportToPdf();
        break;
      case "docx":
        exportToDocx();
        break;
      case "txt":
        exportToTxt();
        break;
    }
  };

  const handleDownload = (format: "pdf" | "docx" | "txt") => {
    setSelectedFormat(format);
    // Appeler directement la fonction d'export correspondante au lieu de passer par downloadLetter
    if (format === "pdf") {
      exportToPdf();
    } else if (format === "docx") {
      exportToDocx();
    } else if (format === "txt") {
      exportToTxt();
    }
  };

  const exportToTxt = () => {
    // Convertir le HTML en texte brut
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = generateFullLetterContent(letterContent);
    
    // Extraction du texte
    const text = tempDiv.textContent || tempDiv.innerText || "";
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `lettre_${selectedType}_${new Date().toISOString().slice(0, 10)}.txt`);
  };

  const exportToPdf = async () => {
    try {
      // Informer l'utilisateur que l'export est en cours
      toast({
        title: "Export en cours",
        description: "Création du PDF en cours..."
      });

      // Créer une iframe cachée pour le rendu du PDF
      const iframe = document.createElement('iframe');
      iframe.style.visibility = 'hidden';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '210mm';
      iframe.style.height = '297mm';
      document.body.appendChild(iframe);

      // Écrire le contenu HTML complet dans l'iframe
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error("Impossible de créer le document PDF");

      // Traitez le contenu pour préserver les espaces
      const formattedContent = letterContent.replace(/\n/g, '<br>');
      
      // Générer le contenu HTML pour le PDF avec la nouvelle structure
      const htmlContent = generateFullLetterContent(formattedContent, true);
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // Attendre que tout le contenu soit chargé (surtout les polices et images)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Capturer le contenu de l'iframe avec html2canvas
      const contentElement = iframeDoc.body;
      
      const canvas = await html2canvas(contentElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: contentElement.scrollWidth,
        windowHeight: contentElement.scrollHeight
      });

      // Calculer les dimensions pour le PDF A4
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Dimensions d'une page A4
      const pdfWidth = 210;
      const pdfHeight = 297;

      // Calculer les dimensions proportionnelles de l'image
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight) * 0.95; // 5% de marge
      
      // Ajouter l'image au PDF
      pdf.addImage(
        imgData, 
        'JPEG', 
        (pdfWidth - imgWidth * ratio) / 2, // centrer horizontalement
        10, // marge supérieure de 10mm
        imgWidth * ratio, 
        imgHeight * ratio
      );

      // Gérer les pages multiples si le contenu est trop long
      if (imgHeight * ratio > pdfHeight - 20) { // 20mm pour les marges
        let currentPosition = pdfHeight - 10; // Position initiale (en tenant compte des marges)
        const contentHeight = imgHeight * ratio;
        
        while (currentPosition < contentHeight) {
          pdf.addPage();
          
          // Afficher la suite du contenu
          pdf.addImage(
            imgData, 
            'JPEG', 
            (pdfWidth - imgWidth * ratio) / 2, // centrer horizontalement
            10 - currentPosition, // décaler vers le haut pour afficher la partie suivante
            imgWidth * ratio, 
            imgHeight * ratio
          );
          
          currentPosition += pdfHeight - 20; // Passer à la position suivante
        }
      }

      // Nettoyer l'iframe
      document.body.removeChild(iframe);

      // Générer un nom de fichier descriptif
      const recipientName = fields.locataire_nom || fields.destinataire_nom || "";
      const fileName = recipientName 
        ? `${LETTER_TEMPLATES[selectedType].title}_${recipientName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`
        : `lettre_${selectedType}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`;

      // Sauvegarder le PDF
      pdf.save(fileName);
      
      toast({
        title: "PDF généré avec succès",
        description: `Le document a été sauvegardé sous le nom "${fileName}"`
      });
    } catch (error) {
      console.error("Erreur lors de l'export en PDF:", error);
      toast({
        title: "Erreur d'export",
        description: "Une erreur est survenue lors de la création du PDF"
      });
    }
  };

  const exportToDocx = async () => {
    try {
      // Convertir le contenu en texte brut pour une approche simplifiée
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = generateFullLetterContent(letterContent);
      const textContent = tempDiv.textContent || tempDiv.innerText;
      
      // Utiliser l'export texte au lieu de docx
      const blob = new Blob([textContent], { type: 'text/plain' });
      saveAs(blob, `lettre_${selectedType}_${new Date().toISOString().slice(0, 10)}.txt`);
      
      toast({
        title: "Export texte réussi",
        description: "Votre lettre a été exportée au format texte"
      });
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'export"
      });
    }
  };

  const saveToHistory = () => {
    // Vérifier si une lettre a été générée
    if (!letterContent) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord générer un courrier"
      });
      return;
    }
    
    // Générer un ID unique
    const newId = Date.now().toString();
    
    // Déterminer le titre et le destinataire à partir des champs
    const recipient = fields.locataire_nom || fields.destinataire_nom || "Destinataire";
    const title = `${LETTER_TEMPLATES[selectedType].title} - ${recipient}`;
    
    // Créer une nouvelle entrée d'historique
    const newHistoryEntry: LetterHistory = {
      id: newId,
      type: selectedType,
      title: title,
      date: new Date().toISOString().slice(0, 10),
      recipient: recipient,
      status: "draft",
      content: letterContent,
      fields: { ...fields },
      template: selectedTemplate
    };
    
    // Ajouter à l'historique et forcer la sauvegarde
    const updatedHistory = [...letterHistory, newHistoryEntry];
    setLetterHistory(updatedHistory);
    
    try {
      localStorage.setItem('letterHistory', JSON.stringify(updatedHistory));
      console.log("Lettre sauvegardée dans l'historique et dans localStorage");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de la lettre:", error);
    }
      
      toast({
        title: "Succès",
      description: "Le courrier a été sauvegardé dans l'historique"
    });
    
    // Basculer vers l'onglet historique
    setActiveTab("history");
  };

  const handleDeleteLetter = (id: string) => {
    setSelectedLetter(id);
    setShowDeleteConfirm(true);
  };

  const handleEditLetter = (letter: LetterHistory) => {
    // Définir le type de lettre
    setSelectedType(letter.type);
    
    // Sélectionner le template utilisé pour la lettre ou le premier disponible
    setSelectedTemplate(letter.template || Object.keys(LETTER_TEMPLATES[letter.type].templates)[0]);
    
    // Restaurer les champs s'ils existent
    if (letter.fields) {
      setFields(letter.fields);
    } else {
      // Sinon, réinitialiser les champs et préserver uniquement le destinataire
      setFields({
        locataire_nom: letter.recipient,
        destinataire_nom: letter.recipient
      });
    }
    
    // Restaurer le contenu s'il existe
    if (letter.content) {
      setLetterContent(letter.content);
    } else {
      // Sinon, générer le contenu à partir du template
      generateLetter();
    }
    
    // Activer l'onglet d'édition
    setActiveTab("editor");
    
    toast({
      title: "Édition en cours",
      description: `Vous éditez maintenant : ${letter.title}`
    });
  };

  const confirmDeleteLetter = () => {
    if (selectedLetter) {
      // Supprimer la lettre et mettre à jour le localStorage
      const updatedHistory = letterHistory.filter(letter => letter.id !== selectedLetter);
      setLetterHistory(updatedHistory);
      
      try {
        localStorage.setItem('letterHistory', JSON.stringify(updatedHistory));
        console.log("Lettre supprimée de l'historique et du localStorage");
      } catch (error) {
        console.error("Erreur lors de la suppression de la lettre:", error);
      }
      
      setShowDeleteConfirm(false);
      setSelectedLetter(null);
      toast({
        title: "Suppression réussie",
        description: "La lettre a été supprimée avec succès"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Brouillon</Badge>;
      case "sent":
        return <Badge variant="success">Envoyée</Badge>;
      case "archived":
        return <Badge variant="secondary">Archivée</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const toggleEditPreview = () => {
    setIsEditingPreview(!isEditingPreview);
  };

  // Fonction pour personnaliser et formater l'affichage du courrier
  const getFormattedLetterContent = () => {
    if (!letterContent) return null;
    
    if (isEditingPreview) {
  return (
        <div className={isEditingPreview ? "bg-transparent" : "bg-white"}>
          <LetterEditor 
            letterType={selectedType}
            letterContent={letterContent}
            onContentChange={setLetterContent}
            companyInfo={showCompanyInfo ? companyInfo : undefined}
            civility={civility}
            signatureInfo={signatureInfo}
            onSave={() => {
              setIsEditingPreview(false);
              toast({
                title: "Succès",
                description: "Le courrier a été édité avec succès"
              });
            }}
          />
            </div>
      );
    }
    
    return (
      <div className="whitespace-pre-line text-black" style={{ color: 'black', backgroundColor: isEditingPreview ? 'transparent' : 'white' }}>
        {/* Afficher les informations de la société */}
        {showCompanyInfo && (
          <div className="company-info mb-6 font-sans relative" style={{ color: 'black' }}>
            <div>
              {companyInfo.name && <div className="font-bold text-lg text-black">{companyInfo.name}</div>}
              {companyInfo.address && <div className="whitespace-pre-line text-black">{companyInfo.address}</div>}
              {companyInfo.siret && <div className="text-black">SIRET: {companyInfo.siret}</div>}
            </div>
            {companyInfo.logo && (
              <div className="absolute top-0 right-0">
                <img src={companyInfo.logo} alt="Logo" className="max-h-20 max-w-[200px]" />
          </div>
            )}
          </div>
        )}
        
        {/* Contenu principal de la lettre */}
        <div className="letter-content text-black" style={{ color: 'black' }}>
          {letterContent}
        </div>
        
        {/* Bloc de date et lieu (séparé de la signature) */}
        <div className="date-location-block mt-8 text-black" style={{ color: 'black' }}>
          <p>
            Fait à {signatureInfo.location || "_________"}, 
            le {signatureInfo.date ? new Date(signatureInfo.date).toLocaleDateString('fr-FR') : "_________"}
          </p>
        </div>
        
        {/* Bloc de signature - utiliser style inline pour la position */}
        <div className="signature-block mt-4 text-black" style={{ 
          color: 'black', 
          textAlign: signatureInfo.position as "left" | "center" | "right" 
        }}>
          {signatureInfo.useImage && companyInfo.signatureImage ? (
            <img src={companyInfo.signatureImage} alt="Signature" className="max-h-16 inline-block" />
          ) : (
            <div className={`${signatureInfo.font} text-xl`}>
              {signatureInfo.text}
          </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <style>{editorGlobalStyle}</style>
      
      {/* En-tête stylisé comme Finance (avec couleur marron) */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-lg border border-border bg-card text-card-foreground shadow-sm p-6 mb-4"
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-100/60 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300 flex items-center justify-center">
              <Mail className="h-6 w-6" />
                </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Courriers</h1>
              <p className="text-muted-foreground mt-1">
                Créez, gérez et suivez vos courriers professionnels
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Select 
              value={selectedType} 
              onValueChange={(value) => {
                setSelectedType(value as LetterType);
                setActiveTab("editor");
              }}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Sélectionner un type de courrier" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LETTER_TEMPLATES).map(([key, templateItem]) => (
                  <SelectItem key={key} value={key}>
                    {templateItem.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
                    </div>
          </div>
      </motion.div>

      {/* Barre d'onglets déplacée sous l'en-tête */}
      <div className="mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full border-b pb-0">
            <TabsTrigger value="editor" className="flex-1 flex items-center justify-center gap-2 data-[state=active]:bg-transparent data-[state=active]:text-amber-900 rounded-none data-[state=active]:border data-[state=active]:border-amber-900 py-2 px-4">
              <FileText className="h-4 w-4" />
              Éditeur
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 flex items-center justify-center gap-2 data-[state=active]:bg-transparent data-[state=active]:text-amber-900 rounded-none data-[state=active]:border data-[state=active]:border-amber-900 py-2 px-4">
              <History className="h-4 w-4" />
              Historique
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 flex items-center justify-center gap-2 data-[state=active]:bg-transparent data-[state=active]:text-amber-900 rounded-none data-[state=active]:border data-[state=active]:border-amber-900 py-2 px-4">
              <Settings className="h-4 w-4" />
              Paramètres
            </TabsTrigger>
          </TabsList>
        </Tabs>
                            </div>

      {/* Contenu principal avec animation */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-6"
      >
        {activeTab === "editor" && (
          <Card className="border border-border">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="template">Modèle</Label>
                    <Select 
                          value={selectedTemplate}
                      onValueChange={setSelectedTemplate}
                    >
                      <SelectTrigger id="template">
                        <SelectValue placeholder="Sélectionner un modèle" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(template.templates).map(([key, templateItem]) => (
                          <SelectItem key={key} value={key}>
                            {templateItem.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                      </div>

                  <div>
                    <Label htmlFor="civility">Civilité</Label>
                        <RadioGroup
                          value={civility}
                      onValueChange={(value) => setCivility(value as "Monsieur" | "Madame")}
                          className="flex space-x-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Monsieur" id="monsieur" />
                            <Label htmlFor="monsieur">Monsieur</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Madame" id="madame" />
                            <Label htmlFor="madame">Madame</Label>
                          </div>
                        </RadioGroup>
                      </div>

                  <Separator className="my-4" />

                      <div className="space-y-4">
                        {template.fields.map((field) => (
                      <div key={field.name}>
                        <Label htmlFor={field.name}>{field.label}</Label>
                        <Input
                          id={field.name}
                          placeholder={field.placeholder}
                                value={fields[field.name] || ""}
                                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>

                  <Separator className="my-4" />
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Informations de date et lieu</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="signature-date">Fait le</Label>
                              <Input
                          id="signature-date"
                          type="date"
                          value={signatureInfo.date}
                          onChange={(e) => handleSignatureInfoChange("date", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="signature-location">à</Label>
                        <Input
                          id="signature-location"
                          placeholder="Ville"
                          value={signatureInfo.location}
                          onChange={(e) => handleSignatureInfoChange("location", e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <Separator className="my-2" />

                    <h3 className="text-sm font-medium">Paramètres de signature</h3>
                    <div className="flex items-center space-x-2 mb-4">
                      <Label htmlFor="use-signature-image">Utiliser l'image de signature</Label>
                      <Switch
                        id="use-signature-image"
                        checked={signatureInfo.useImage}
                        onCheckedChange={(checked) => handleSignatureInfoChange("useImage", checked)}
                      />
                    </div>

                    {!signatureInfo.useImage && (
                      <>
                        <div>
                          <Label htmlFor="signature-text">Texte de signature</Label>
                          <Input
                            id="signature-text"
                            placeholder="Signature"
                            value={signatureInfo.text}
                            onChange={(e) => handleSignatureInfoChange("text", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="signature-font">Style de signature</Label>
                          <Select 
                            value={signatureInfo.font} 
                            onValueChange={(value) => handleSignatureInfoChange("font", value)}
                          >
                            <SelectTrigger id="signature-font">
                              <SelectValue placeholder="Choisir un style" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="font-signature">Dancing Script</SelectItem>
                              <SelectItem value="font-signature-alt">Great Vibes</SelectItem>
                              <SelectItem value="font-signature-elegant">Parisienne</SelectItem>
                              <SelectItem value="font-signature-casual">Sacramento</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    <div>
                      <Label htmlFor="signature-position">Position de la signature</Label>
                      <Select 
                        value={signatureInfo.position} 
                        onValueChange={(value) => handleSignatureInfoChange("position", value as "left" | "center" | "right")}
                      >
                        <SelectTrigger id="signature-position">
                          <SelectValue placeholder="Choisir la position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Gauche</SelectItem>
                          <SelectItem value="center">Milieu</SelectItem>
                          <SelectItem value="right">Droite</SelectItem>
                        </SelectContent>
                      </Select>
                          </div>
                      </div>

                      <Button
                        onClick={generateLetter}
                    disabled={isGenerating} 
                    className="mt-4 w-full bg-amber-800 hover:bg-amber-900 text-white"
                      >
                        {isGenerating ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Génération...
                      </>
                        ) : (
                          <>
                        <FileText className="mr-2 h-4 w-4" />
                        Générer le courrier
                          </>
                        )}
                      </Button>

                      {isGenerating && (
                    <Progress value={generationProgress} className="h-2 mt-2" />
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Aperçu du courrier</Label>
                    {letterContent && (
                      <Button variant="ghost" size="sm" onClick={toggleEditPreview}>
                        {isEditingPreview ? "Quitter l'édition" : "Éditer"}
                        <Pencil className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                          </div>
                  <div 
                    ref={letterRef}
                    className="p-4 border rounded-md mt-2 min-h-[500px] max-h-[600px] overflow-y-auto"
                    style={{ 
                      backgroundColor: isEditingPreview ? 'transparent' : 'white',
                      color: isEditingPreview ? 'var(--foreground)' : 'black'
                    }}
                  >
                    {letterContent ? (
                      getFormattedLetterContent()
                    ) : (
                      <div className="text-center text-muted-foreground pt-8">
                        Générez un courrier pour afficher l'aperçu ici
                      </div>
                    )}
                  </div>
                  
                  {letterContent && (
                    <div className="flex mt-4 space-x-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="flex-1 bg-amber-800 hover:bg-amber-900 text-white">
                            <Download className="mr-2 h-4 w-4" />
                            Exporter
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              onClick={() => handleDownload("pdf")}
                            >
                              <Printer className="mr-2 h-4 w-4" />
                              Exporter en PDF
                          </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDownload("txt")}
                            >
                              <FileType className="mr-2 h-4 w-4" />
                              Exporter en TXT
                          </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                            <Button 
                        onClick={saveToHistory} 
                        className="flex-1 bg-amber-800 hover:bg-amber-900 text-white"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Enregistrer
                            </Button>
                          </div>
                  )}
                  </div>
                      </div>
                    </CardContent>
                  </Card>
        )}

        {activeTab === "history" && (
          <Card className="border border-border">
            <CardContent className="pt-6">
              {/* Statistiques rapides */}
              <motion.div 
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
              >
                <motion.div variants={item}>
                  <Card className="border-amber-200 dark:border-amber-800/30 overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100/80 dark:from-amber-900/20 dark:to-amber-800/10">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">Total des courriers</CardTitle>
                      <div className="bg-gradient-to-br from-amber-400/20 to-amber-500/20 dark:from-amber-700/30 dark:to-amber-600/40 p-2 rounded-full">
                        <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                  </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold text-amber-700 dark:text-amber-500">
                          {letterHistory.length}
                        </span>
                        <span className="text-xs text-amber-600/80 dark:text-amber-400/70 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                          {letterHistory.length === 0 ? 'Aucun' : letterHistory.length === 1 ? '1 lettre' : `${letterHistory.length} lettres`}
                        </span>
                                </div>
                      <div className="mt-4 space-y-2">
                        <div className="h-2 w-full rounded-full bg-amber-100 dark:bg-amber-950/20">
                          <motion.div 
                            className="h-full bg-amber-500 dark:bg-amber-600 rounded-full transition-all"
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 0.5 }}
                          />
                              </div>
                        <div className="text-xs font-medium text-amber-600 dark:text-amber-400/80">
                          Tous vos documents
                            </div>
                          </div>
                  </CardContent>
                </Card>
                </motion.div>

                <motion.div variants={item}>
                  <Card className="border-amber-200 dark:border-amber-800/30 overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100/80 dark:from-amber-900/20 dark:to-amber-800/10">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">Courriers envoyés</CardTitle>
                      <div className="bg-gradient-to-br from-amber-400/20 to-amber-500/20 dark:from-amber-700/30 dark:to-amber-600/40 p-2 rounded-full">
                        <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                    <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold text-amber-700 dark:text-amber-500">
                          {letterHistory.filter(l => l.status === "sent").length}
                        </span>
                        <span className="text-xs text-amber-600/80 dark:text-amber-400/70 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                          {letterHistory.filter(l => l.status === "sent").length === 0 ? 'Aucun' : `${Math.round(letterHistory.filter(l => l.status === "sent").length / Math.max(letterHistory.length, 1) * 100)}%`}
                        </span>
                    </div>
                      <div className="mt-4 space-y-2">
                        <div className="h-2 w-full rounded-full bg-amber-100 dark:bg-amber-950/20">
                          <motion.div 
                            className="h-full bg-amber-500 dark:bg-amber-600 rounded-full transition-all"
                            initial={{ width: 0 }}
                            animate={{ width: `${(letterHistory.filter(l => l.status === "sent").length / Math.max(letterHistory.length, 1)) * 100}%` }}
                            transition={{ duration: 0.5 }}
                          />
                              </div>
                        <div className="text-xs font-medium text-amber-600 dark:text-amber-400/80">
                          Courriers finalisés et envoyés
                      </div>
                    </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={item}>
                  <Card className="border-amber-200 dark:border-amber-800/30 overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100/80 dark:from-amber-900/20 dark:to-amber-800/10">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">Brouillons</CardTitle>
                      <div className="bg-gradient-to-br from-amber-400/20 to-amber-500/20 dark:from-amber-700/30 dark:to-amber-600/40 p-2 rounded-full">
                        <Pencil className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold text-amber-700 dark:text-amber-500">
                          {letterHistory.filter(l => l.status === "draft").length}
                        </span>
                        <span className="text-xs text-amber-600/80 dark:text-amber-400/70 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                          {letterHistory.filter(l => l.status === "draft").length === 0 ? 'Aucun' : `${Math.round(letterHistory.filter(l => l.status === "draft").length / Math.max(letterHistory.length, 1) * 100)}%`}
                        </span>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="h-2 w-full rounded-full bg-amber-100 dark:bg-amber-950/20">
                          <motion.div 
                            className="h-full bg-amber-500 dark:bg-amber-600 rounded-full transition-all"
                            initial={{ width: 0 }}
                            animate={{ width: `${(letterHistory.filter(l => l.status === "draft").length / Math.max(letterHistory.length, 1)) * 100}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <div className="text-xs font-medium text-amber-600 dark:text-amber-400/80">
                          Courriers en cours de rédaction
                              </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              {/* Actions et filtres améliorés */}
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                <div className="relative flex-1 max-w-xs w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                    placeholder="Rechercher un courrier..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-9 w-full"
                  />
                    </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <Select 
                    value={filterStatus} 
                    onValueChange={setFilterStatus}
                      >
                    <SelectTrigger className="w-[150px] h-9">
                      <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="draft">Brouillons</SelectItem>
                      <SelectItem value="sent">Envoyés</SelectItem>
                      <SelectItem value="archived">Archivés</SelectItem>
                        </SelectContent>
                      </Select>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9">
                        <Filter className="h-4 w-4 mr-1" /> Tri
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        // Tri par date (plus récent)
                        setLetterHistory([...letterHistory].sort((a, b) => 
                          new Date(b.date).getTime() - new Date(a.date).getTime()
                        ));
                      }}>
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Date (plus récent)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        // Tri par date (plus ancien)
                        setLetterHistory([...letterHistory].sort((a, b) => 
                          new Date(a.date).getTime() - new Date(b.date).getTime()
                        ));
                      }}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                        Date (plus ancien)
                                    </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                        // Tri par titre
                        setLetterHistory([...letterHistory].sort((a, b) => 
                          a.title.localeCompare(b.title)
                        ));
                      }}>
                        <FileText className="mr-2 h-4 w-4" />
                        Titre (A-Z)
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                          </div>

              {/* Historique des lettres - Version compacte */}
              <ScrollArea className="h-[450px] border rounded-md">
                {filteredHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-muted-foreground">Aucun courrier n'a été trouvé</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Créez votre premier courrier ou modifiez vos filtres
                    </p>
                  <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => setActiveTab("editor")}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Créer un courrier
                  </Button>
                      </div>
                    ) : (
                  <Table className="border">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="py-2">Titre</TableHead>
                        <TableHead className="py-2">Date</TableHead>
                        <TableHead className="py-2">Statut</TableHead>
                        <TableHead className="py-2 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.map((letter, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium py-2">{letter.title}</TableCell>
                          <TableCell className="py-2">{new Date(letter.date).toLocaleDateString('fr-FR')}</TableCell>
                          <TableCell className="py-2">
                            {getStatusBadge(letter.status)}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <div className="flex justify-end gap-1">
                  <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => handleEditLetter(letter)}
                                className="h-7 w-7"
                              >
                                <Edit className="h-3.5 w-3.5" />
                      </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => handleDeleteLetter(letter.id)}
                                className="h-7 w-7 text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-7 w-7">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    // Copier
                                    const newLetter = {
                                      ...letter,
                                      id: Date.now().toString(),
                                      status: "draft" as "draft" | "sent" | "archived",
                                      title: `Copie de ${letter.title}`,
                                      date: new Date().toISOString().slice(0, 10)
                                    };
                                    setLetterHistory([...letterHistory, newLetter]);
                                    toast({
                                      title: "Lettre copiée",
                                      description: "Une copie a été créée dans vos brouillons"
                                    });
                                  }}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Dupliquer
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    // Exporter en PDF
                                    setLetterContent(letter.content || "");
                                    exportToPdf();
                                  }}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Exporter en PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    // Exporter en TXT
                                    setLetterContent(letter.content || "");
                                    exportToTxt();
                                  }}>
                                    <FileType className="mr-2 h-4 w-4" />
                                    Exporter en TXT
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                        </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
                  </CardContent>
                </Card>
            )}

        {activeTab === "settings" && (
          <Card className="border border-border">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">Paramètres des courriers</h2>
              
              {/* Informations de la société */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Informations de l'expéditeur</h3>
                    <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Switch
                        id="show-company-info"
                        checked={showCompanyInfo}
                        onCheckedChange={setShowCompanyInfo}
                      />
                      <Label htmlFor="show-company-info">Afficher les informations de l'expéditeur</Label>
                    </div>

                    {showCompanyInfo && (
                      <div className="space-y-4 pl-8 border-l-2 border-amber-200 dark:border-amber-900/50">
                        <div>
                          <Label htmlFor="company-name">Nom de l'entreprise / Expéditeur</Label>
                        <Input
                            id="company-name"
                          value={companyInfo.name}
                            onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                            placeholder="Nom de votre entreprise"
                        />
                      </div>
                      
                        <div>
                          <Label htmlFor="company-address">Adresse</Label>
                          <Textarea
                            id="company-address"
                          value={companyInfo.address}
                            onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                            placeholder="Adresse complète"
                            className="min-h-[100px]"
                        />
                      </div>
                      
                        <div>
                          <Label htmlFor="company-siret">SIRET (optionnel)</Label>
                        <Input
                            id="company-siret"
                          value={companyInfo.siret || ""}
                            onChange={(e) => setCompanyInfo({ ...companyInfo, siret: e.target.value })}
                            placeholder="Numéro SIRET"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="company-logo">Logo (optionnel)</Label>
                          <div className="flex items-center gap-4 mt-2">
                            {companyInfo.logo && (
                              <div className="border rounded-md p-2">
                                <img src={companyInfo.logo} alt="Logo" className="max-h-16" />
                              </div>
                            )}
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                              onClick={() => {
                                // Simuler un clic sur l'input file
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (e) => {
                                      if (e.target?.result) {
                                        setCompanyInfo({ 
                                          ...companyInfo, 
                                          logo: e.target.result.toString() 
                                        });
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                };
                                input.click();
                              }}
                            >
                              Choisir un logo
                            </Button>
                            {companyInfo.logo && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setCompanyInfo({ ...companyInfo, logo: "" })}
                                >
                                  Supprimer
                                </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                      </div>
                    </div>

                    <Separator />

                {/* Paramètres de signature */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Paramètres de signature</h3>
                    <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Switch 
                        id="use-image-signature"
                        checked={signatureInfo.useImage}
                        onCheckedChange={(checked) => handleSignatureInfoChange("useImage", checked)}
                      />
                      <Label htmlFor="use-image-signature">Utiliser une image pour la signature</Label>
                    </div>
                    
                    {signatureInfo.useImage ? (
                      <div className="space-y-4 pl-8 border-l-2 border-amber-200 dark:border-amber-900/50">
                        <div>
                          <Label htmlFor="signature-image">Image de signature</Label>
                          <div className="flex items-center gap-4 mt-2">
                            {companyInfo.signatureImage && (
                              <div className="border rounded-md p-2 bg-white">
                                <img src={companyInfo.signatureImage} alt="Signature" className="max-h-16" />
                              </div>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // Simuler un clic sur l'input file
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (e) => {
                                      if (e.target?.result) {
                                        setCompanyInfo({ 
                                          ...companyInfo, 
                                          signatureImage: e.target.result.toString() 
                                        });
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                };
                                input.click();
                              }}
                            >
                              Choisir une image
                            </Button>
                            {companyInfo.signatureImage && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setCompanyInfo({ ...companyInfo, signatureImage: "" })}
                              >
                                Supprimer
                              </Button>
                            )}
                    </div>
                        </div>
                      </div>
                    ) : null}
                      </div>
                    </div>

                <Separator />
                
                {/* Bouton pour enregistrer les paramètres */}
                  <Button 
                    onClick={() => {
                    // Enregistrer les paramètres dans localStorage
                    localStorage.setItem('companyInfo', JSON.stringify(companyInfo));
                    
                      toast({
                      title: "Paramètres enregistrés",
                      description: "Vos paramètres ont été sauvegardés"
                      });
                    }} 
                  className="w-full bg-amber-800 hover:bg-amber-900 text-white"
                  >
                        <Save className="mr-2 h-4 w-4" />
                  Enregistrer les paramètres
                      </Button>
                    </div>
                  </CardContent>
                </Card>
            )}
      </motion.div>

      {/* Confirmation de suppression */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmation de suppression</DialogTitle>
          </DialogHeader>
          <p>Êtes-vous sûr de vouloir supprimer ce courrier ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Annuler</Button>
            <Button variant="destructive" onClick={confirmDeleteLetter}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 