import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { FileUp, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PdfUploadProps {
  onFileSelected: (file: File | File[]) => void;
  label?: string;
  className?: string;
  maxSizeMB?: number;
  showPreview?: boolean;
  currentDocumentId?: number | null;
  folderId?: string | number;
  multiple?: boolean;
  maxFiles?: number;
  initialFiles?: File[];
}

export function PdfUpload({ 
  onFileSelected, 
  label = "Télécharger un PDF", 
  className = "",
  maxSizeMB = 10,
  showPreview = false,
  currentDocumentId = null,
  folderId,
  multiple = false,
  maxFiles = 5,
  initialFiles = []
}: PdfUploadProps) {
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [error, setError] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (initialFiles) {
      // Vérifier si les fichiers sont différents avant de mettre à jour
      const areFilesDifferent = files.length !== initialFiles.length || 
        files.some((file, index) => file !== initialFiles[index]);
      
      if (areFilesDifferent) {
        setFiles(initialFiles);
        
        if (initialFiles.length === 0) {
          setError("");
        }
      }
    }
  }, [initialFiles]);

  const onDrop = (acceptedFiles: File[]) => {
    console.log('PdfUpload onDrop called with', acceptedFiles.length, 'files. Multiple mode:', multiple);
    
    if (acceptedFiles.length > 0) {
      if (multiple) {
        // Multi-file mode
        console.log('Processing in multiple files mode');
        const validFiles = acceptedFiles.filter(file => {
          const isValidType = file.type === "application/pdf";
          const isValidSize = file.size <= maxSizeMB * 1024 * 1024;
          console.log(`File ${file.name} validation: type=${isValidType}, size=${isValidSize}`);
          return isValidType && isValidSize;
        });

        if (validFiles.length !== acceptedFiles.length) {
          setError("Certains fichiers ont été ignorés (format invalide ou taille excessive)");
        } else {
          setError("");
        }

        // S'assurer que nous ne dépassons pas la limite maximale configurée
        const totalFiles = [...files, ...validFiles];
        // Si nous dépassons la limite, n'ajouter que ce qui est possible
        if (totalFiles.length > maxFiles) {
          const remainingSlots = Math.max(0, maxFiles - files.length);
          const newValidFiles = validFiles.slice(0, remainingSlots);
          
          // Avertir l'utilisateur s'il a essayé d'ajouter plus de fichiers que possible
          if (remainingSlots < validFiles.length) {
            setError(`Vous ne pouvez pas ajouter plus de ${maxFiles} fichiers au total`);
          }
          
          const newFiles = [...files, ...newValidFiles];
          console.log(`Limited to ${maxFiles} files: adding ${newValidFiles.length} files to existing ${files.length} files.`);
          setFiles(newFiles);
          onFileSelected(newFiles);
        } else {
          // Pas de dépassement de limite, ajouter tous les fichiers
          console.log('Setting new files array with', totalFiles.length, 'files');
          setFiles(totalFiles);
          onFileSelected(totalFiles);
        }
      } else {
        // Mode fichier unique - pas de changement nécessaire
        console.log('Processing in single file mode');
        const selectedFile = acceptedFiles[0];

        if (selectedFile.type !== "application/pdf") {
          setError("Seuls les fichiers PDF sont acceptés");
          return;
        }

        if (selectedFile.size > maxSizeMB * 1024 * 1024) {
          setError(`La taille du fichier dépasse ${maxSizeMB}MB`);
          return;
        }

        setFiles([selectedFile]);
        setError("");
        onFileSelected(selectedFile);
      }
    }
  };

  const removeFile = (indexToRemove: number) => {
    const newFiles = files.filter((_, index) => index !== indexToRemove);
    setFiles(newFiles);
    onFileSelected(multiple ? newFiles : newFiles[0]);
  };

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: multiple ? maxFiles : 1,
    maxSize: maxSizeMB * 1024 * 1024,
    multiple: multiple,
    noDrag: false,
    noClick: false,
    noKeyboard: false
  });

  useEffect(() => {
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      if (rejection.errors[0].code === 'file-too-large') {
        setError(`La taille du fichier dépasse ${maxSizeMB}MB`);
      } else if (rejection.errors[0].code === 'file-invalid-type') {
        setError("Seuls les fichiers PDF sont acceptés");
      } else if (rejection.errors[0].code === 'too-many-files') {
        setError(`Vous ne pouvez pas télécharger plus de ${maxFiles} fichiers à la fois`);
      } else {
        setError(rejection.errors[0].message);
      }
    }
  }, [fileRejections, maxSizeMB, maxFiles]);

  return (
    <div className={`w-full ${className}`}>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
          ${error ? 'border-red-500 bg-red-50 dark:bg-red-950/10' : ''}
        `}
      >
        <input {...getInputProps()} />
        {files.length > 0 && !multiple ? (
          <div className="flex items-center justify-center gap-2 flex-col">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <FileUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Fichier sélectionné
              </p>
              <p className="text-xs text-muted-foreground">
                {files[0].name} ({Math.round(files[0].size / 1024)} Ko)
              </p>
            </div>
          </div>
        ) : files.length > 0 && multiple ? (
          <div className="flex flex-col items-center justify-center">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-1">
              <FileUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              {files.length} {files.length === 1 ? 'fichier' : 'fichiers'} sélectionné{files.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              Cliquez ou glissez pour ajouter d'autres fichiers (max {maxFiles})
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 flex-col">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <FileUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">
                {multiple 
                  ? `Glissez et déposez jusqu'à ${maxFiles} fichiers PDF ou cliquez pour parcourir` 
                  : "Glissez et déposez un fichier PDF ou cliquez pour parcourir"
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Taille maximale: {maxSizeMB}MB par fichier
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}

export const PDFUpload = PdfUpload;