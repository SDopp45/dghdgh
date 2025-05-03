import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { RefreshCw, Save } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import 'react-quill/dist/quill.snow.css';

// Styles pour l'éditeur et la prévisualisation
const editorStyles = `
  .letter-editor {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .letter-editor textarea {
    font-family: inherit;
    font-size: 16px;
    line-height: 1.8;
    min-height: 500px;
    padding: 1.5rem;
    white-space: pre-wrap;
  }
  .letter-preview {
    font-family: inherit;
    font-size: 16px;
    line-height: 1.8;
    white-space: pre-wrap;
    padding: 2rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    min-height: 500px;
    background-color: white;
  }
  .signature-preview {
    margin-top: 1.5rem;
    padding: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    background-color: #f8fafc;
  }
  .signature-content {
    padding: 1rem;
    background-color: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
  }
  .company-info {
    margin-top: 1rem;
    padding: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    background-color: #f8fafc;
  }
  .company-content {
    padding: 1rem;
    background-color: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
  }
`;

interface CompanyInfo {
  name: string;
  address: string;
  siret?: string;
  signatureImage?: string;
}

interface SignatureInfo {
  date: string;
  location: string;
  text: string;
  font: string;
  position?: "left" | "center" | "right";
  useImage?: boolean;
}

interface LetterEditorProps {
  letterType: string;
  letterContent: string;
  onContentChange: (content: string) => void;
  logo?: string;
  companyInfo?: CompanyInfo;
  civility?: "Monsieur" | "Madame";
  signatureInfo?: SignatureInfo;
  onSave?: () => void;
  variables?: Record<string, string>;
}

export function LetterEditor({ 
  letterType, 
  letterContent, 
  onContentChange, 
  logo,
  companyInfo,
  civility = "Monsieur",
  signatureInfo = {
    date: new Date().toISOString().split('T')[0],
    location: "",
    text: "Signature",
    font: "font-signature",
    position: "right",
    useImage: false
  },
  onSave,
  variables = {}
}: LetterEditorProps) {
  const { toast } = useToast();
  const [content, setContent] = useState<string>(letterContent || "");
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [editorMode, setEditorMode] = useState<"text" | "preview">("text");

  // Remplacer les variables dans le contenu
  const replaceVariables = (text: string) => {
    let result = text;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      result = result.replace(regex, value);
    });
    return result;
  };

  // Initialiser ou réinitialiser le contenu
  const initializeContent = () => {
    if (letterContent) {
      setContent(letterContent);
      setUnsavedChanges(false);
    }
  };

  // Mise à jour du contenu au chargement
  useEffect(() => {
    initializeContent();
  }, [letterContent]);

  // Gestionnaire pour l'éditeur texte
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    onContentChange(newContent);
    setUnsavedChanges(true);
  };

  // Réinitialiser le contenu
  const handleReset = () => {
    initializeContent();
    toast({
      title: "Réinitialisation",
      description: "Le contenu a été réinitialisé",
    });
  };

  // Sauvegarder le contenu
  const handleSave = () => {
    onContentChange(content);
    setUnsavedChanges(false);
    
    if (onSave) {
      onSave();
    }
    
    toast({
      title: "Succès",
      description: "Courrier sauvegardé avec succès"
    });
  };

  // Préparer le contenu pour l'aperçu avec variables remplacées
  const getPreviewContent = () => {
    return replaceVariables(content);
  };

  return (
    <div className="letter-editor">
      <style>{editorStyles}</style>
      
      <Tabs 
        value={editorMode} 
        onValueChange={(value) => setEditorMode(value as "text" | "preview")}
        className="w-full"
      >
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="text">Texte</TabsTrigger>
            <TabsTrigger value="preview">Aperçu</TabsTrigger>
          </TabsList>
          
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleReset} disabled={!unsavedChanges}>
              <RefreshCw className="mr-2 h-4 w-4" />
                  Réinitialiser
                </Button>
                <Button size="sm" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
                  Sauvegarder
                </Button>
              </div>
            </div>
      </Tabs>

      {editorMode === "text" && (
        <Textarea
          value={content}
          onChange={handleTextChange}
          className="font-inherit text-base min-h-[500px]"
          placeholder="Rédigez votre courrier ici..."
        />
      )}

      {editorMode === "preview" && (
        <div className="letter-preview">
          {getPreviewContent()}
          
          {signatureInfo && (
            <div style={{ marginTop: '2rem' }}>
              <p>
                Fait à {signatureInfo.location || "_________"}, 
                le {signatureInfo.date ? new Date(signatureInfo.date).toLocaleDateString('fr-FR') : "_________"}
              </p>
              
              <div style={{ marginTop: '1rem', textAlign: signatureInfo.position || "right" }}>
                {signatureInfo.useImage && companyInfo?.signatureImage ? (
                  <img src={companyInfo.signatureImage} alt="Signature" className="max-h-16 inline-block" />
                ) : (
                  <div className={`${signatureInfo.font} text-xl`}>
                    {signatureInfo.text}
                </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Aperçu de la signature */}
      {signatureInfo && editorMode !== "preview" && (
        <div className="signature-preview">
          <h3 className="font-medium mb-2">Aperçu de la signature</h3>
          <div className="signature-content">
            <p className="mb-2">
              Fait à {signatureInfo.location || "_________"}, 
              le {signatureInfo.date ? new Date(signatureInfo.date).toLocaleDateString('fr-FR') : "_________"}
            </p>
            <div style={{ textAlign: signatureInfo.position || "right" }}>
              {signatureInfo.useImage && companyInfo?.signatureImage ? (
                <img src={companyInfo.signatureImage} alt="Signature" className="max-h-16 inline-block" />
              ) : (
                <div className={`${signatureInfo.font} text-xl mt-4`}>
                  {signatureInfo.text}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Aperçu des informations société */}
      {companyInfo && (companyInfo.name || companyInfo.address) && (
        <div className="company-info">
          <h3 className="font-medium mb-2">Informations société</h3>
          <div className="company-content">
            {companyInfo.name && <div className="font-bold">{companyInfo.name}</div>}
            {companyInfo.address && <div style={{ whiteSpace: 'pre-line' }}>{companyInfo.address}</div>}
            {companyInfo.siret && <div className="text-sm text-gray-600">SIRET: {companyInfo.siret}</div>}
          </div>
        </div>
      )}
    </div>
  );
} 