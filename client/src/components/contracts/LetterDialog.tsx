import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LetterTemplate, LetterType, LETTER_TEMPLATES } from "@/types/letters";

interface SignatureInfo {
  date: string;
  location: string;
  text: string;
  font: string;
}

interface LetterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (data: {
    title: string;
    recipient: string;
    type: LetterType;
    template: string;
    includeHeader: boolean;
    includeFooter: boolean;
    signatureInfo: SignatureInfo;
  }) => void;
}

const FONT_OPTIONS = [
  { name: "Dancing Script", value: "font-signature" },
  { name: "Great Vibes", value: "font-signature-alt" },
  { name: "Parisienne", value: "font-signature-elegant" },
  { name: "Sacramento", value: "font-signature-casual" }
];

export function LetterDialog({ 
  open, 
  onOpenChange, 
  onGenerate 
}: LetterDialogProps) {
  const [title, setTitle] = useState("");
  const [recipient, setRecipient] = useState("");
  const [type, setType] = useState<LetterType>("mise_en_demeure_loyer");
  const [template, setTemplate] = useState("standard");
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeFooter, setIncludeFooter] = useState(true);
  const [activeTab, setActiveTab] = useState("general");
  const [signatureInfo, setSignatureInfo] = useState<SignatureInfo>({
    date: new Date().toISOString().split('T')[0],
    location: "",
    text: "Signature",
    font: "font-signature"
  });
  
  // Obtenir le template sélectionné
  const selectedLetterTemplate = LETTER_TEMPLATES[type];
  const availableTemplates = selectedLetterTemplate ? Object.entries(selectedLetterTemplate.templates) : [];

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle("");
      setRecipient("");
      setType("mise_en_demeure_loyer");
      setTemplate("standard");
      setIncludeHeader(true);
      setIncludeFooter(true);
      setActiveTab("general");
      setSignatureInfo({
        date: new Date().toISOString().split('T')[0],
        location: "",
        text: "Signature",
        font: "font-signature"
      });
    }
  }, [open]);

  // Get letter types from templates
  const letterTypes = Object.keys(LETTER_TEMPLATES) as LetterType[];

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !recipient || !type || !template) {
      return;
    }

    onGenerate({
      title,
      recipient,
      type,
      template,
      includeHeader,
      includeFooter,
      signatureInfo
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Générer un nouveau courrier</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="signature">Signature</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre du courrier</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Mise en demeure - Locataire M. Dupont"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient">Destinataire</Label>
                <Input
                  id="recipient"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Nom du destinataire"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type de courrier</Label>
                <Select
                  value={type}
                  onValueChange={(value: LetterType) => {
                    setType(value);
                    setTemplate("standard");
                  }}
                  required
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {letterTypes.map((letterType) => (
                      <SelectItem key={letterType} value={letterType}>
                        {LETTER_TEMPLATES[letterType].title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template">Modèle</Label>
                <Select
                  value={template}
                  onValueChange={setTemplate}
                  required
                  disabled={!type}
                >
                  <SelectTrigger id="template">
                    <SelectValue placeholder="Sélectionner un modèle" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTemplates.map(([key, templateItem]) => (
                      <SelectItem key={key} value={key}>
                        {templateItem.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeHeader"
                  checked={includeHeader}
                  onCheckedChange={(checked) => setIncludeHeader(!!checked)}
                />
                <Label htmlFor="includeHeader">Inclure l'en-tête</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeFooter"
                  checked={includeFooter}
                  onCheckedChange={(checked) => setIncludeFooter(!!checked)}
                />
                <Label htmlFor="includeFooter">Inclure le pied de page</Label>
              </div>
            </TabsContent>

            <TabsContent value="signature" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="signatureDate">Date de signature</Label>
                <Input
                  id="signatureDate"
                  type="date"
                  value={signatureInfo.date}
                  onChange={(e) => setSignatureInfo({...signatureInfo, date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signatureLocation">Lieu de signature</Label>
                <Input
                  id="signatureLocation"
                  value={signatureInfo.location}
                  onChange={(e) => setSignatureInfo({...signatureInfo, location: e.target.value})}
                  placeholder="Ex: Paris"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signatureText">Texte de signature</Label>
              <Input
                  id="signatureText"
                  value={signatureInfo.text}
                  onChange={(e) => setSignatureInfo({...signatureInfo, text: e.target.value})}
                  placeholder="Ex: Signature"
              />
            </div>

              <div className="space-y-2">
                <Label htmlFor="signatureFont">Police de signature</Label>
                <Select
                  value={signatureInfo.font}
                  onValueChange={(value) => setSignatureInfo({...signatureInfo, font: value})}
                >
                  <SelectTrigger id="signatureFont">
                    <SelectValue placeholder="Choisir une police" />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span className={font.value}>{font.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 border rounded-md mt-4">
                <h3 className="text-sm font-medium mb-2">Aperçu de la signature</h3>
                <div className="bg-white p-4 rounded border">
                  <p className="text-sm">
                    Fait à {signatureInfo.location || "_________"}, 
                    le {signatureInfo.date ? new Date(signatureInfo.date).toLocaleDateString('fr-FR') : "_________"}
                  </p>
                  <div className={`${signatureInfo.font} text-xl mt-4`}>
                    {signatureInfo.text}
                  </div>
                </div>
        </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
            <Button type="submit">Générer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 