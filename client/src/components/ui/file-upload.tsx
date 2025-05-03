import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, File, Image as ImageIcon, FileText, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface FileUploadProps {
  value: File[] | string[] | (File | string)[];
  onChange: (files: (File | string)[]) => void;
  multiple?: boolean;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  previews?: string[];
  className?: string;
}

export function FileUpload({
  value = [],
  onChange,
  multiple = false,
  accept,
  maxSize = 5 * 1024 * 1024, // 5MB par défaut
  disabled = false,
  previews = [],
  className,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Gérer la création des URLs de prévisualisation
  useEffect(() => {
    // Combiner les previews fournis et les fichiers locaux
    const existingPreviews = [...previews];
    const localFiles = value.filter(file => file instanceof File) as File[];
    
    // Créer des URLs de prévisualisation pour les fichiers locaux
    const fileUrls = localFiles.map(file => URL.createObjectURL(file));
    
    setPreviewUrls([...existingPreviews, ...fileUrls]);
    
    // Nettoyage des URLs lors du démontage
    return () => {
      fileUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [value, previews]);

  const isImage = (file: File | string): boolean => {
    if (typeof file === 'string') {
      return /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
    }
    return file.type.startsWith('image/');
  };
  
  const getFileIcon = (file: File | string) => {
    if (isImage(file)) return <ImageIcon className="h-6 w-6 text-blue-500" />;
    if (typeof file === 'string') {
      if (file.endsWith('.pdf')) return <FileText className="h-6 w-6 text-red-500" />;
      if (file.endsWith('.doc') || file.endsWith('.docx')) return <FileText className="h-6 w-6 text-blue-500" />;
      return <File className="h-6 w-6 text-gray-500" />;
    }
    if (file.type.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
    if (file.type.includes('word')) return <FileText className="h-6 w-6 text-blue-500" />;
    return <File className="h-6 w-6 text-gray-500" />;
  };

  const getFileSize = (file: File | string): string => {
    if (typeof file === 'string') return '';
    
    const sizeInKB = file.size / 1024;
    if (sizeInKB < 1024) {
      return `${Math.round(sizeInKB)} KB`;
    }
    return `${(sizeInKB / 1024).toFixed(2)} MB`;
  };

  const getFileName = (file: File | string): string => {
    if (typeof file === 'string') {
      // Extraire le nom du fichier de l'URL ou du chemin
      const parts = file.split('/');
      return parts[parts.length - 1];
    }
    return file.name;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    const fileList = e.target.files;
    if (!fileList) return;
    
    const files = Array.from(fileList);
    
    // Validation des fichiers
    let hasError = false;
    files.forEach(file => {
      if (file.size > maxSize) {
        setError(`Le fichier ${file.name} dépasse la taille maximale de ${maxSize / (1024 * 1024)}MB`);
        hasError = true;
      }
    });
    
    if (hasError) return;
    setError(null);
    
    // Conserver les fichiers existants qui sont des URLs (strings)
    const existingUrls = value.filter(f => typeof f === 'string');
    onChange([...existingUrls, ...files]);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    
    // Validation des fichiers
    let hasError = false;
    files.forEach(file => {
      if (file.size > maxSize) {
        setError(`Le fichier ${file.name} dépasse la taille maximale de ${maxSize / (1024 * 1024)}MB`);
        hasError = true;
      }
    });
    
    if (hasError) return;
    setError(null);
    
    // Conserver les fichiers existants qui sont des URLs (strings)
    const existingUrls = value.filter(f => typeof f === 'string');
    onChange([...existingUrls, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    if (disabled) return;
    
    const newFiles = [...value];
    newFiles.splice(index, 1);
    onChange(newFiles);
  };

  const handleBrowseClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-colors",
          dragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50",
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <div className="flex flex-col items-center justify-center space-y-3 text-center">
          <Upload className="h-10 w-10 text-blue-500" />
          <div className="space-y-2">
            <h3 className="text-base font-medium">Déposez vos fichiers ici</h3>
            <p className="text-sm text-gray-500">
              ou <span className="text-blue-500 font-medium">cliquez pour parcourir</span>
            </p>
          </div>
          <p className="text-xs text-gray-400">
            {multiple ? "Plusieurs fichiers acceptés" : "Un seul fichier accepté"}
            {accept && ` • Types: ${accept.split(',').join(', ')}`}
            {` • Max: ${maxSize / (1024 * 1024)}MB`}
          </p>
        </div>
        <Input
          ref={inputRef}
          type="file"
          onChange={handleFileChange}
          multiple={multiple}
          accept={accept}
          disabled={disabled}
          className="hidden"
        />
      </div>

      {error && (
        <div className="text-red-500 text-sm p-2 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}

      {value.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Fichiers ({value.length})</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {value.map((file, index) => {
              const isImg = isImage(file);
              const previewUrl = previewUrls[index];
              
              return (
                <div
                  key={index}
                  className="relative flex items-center p-3 bg-white border rounded-md group"
                >
                  <div className="flex-shrink-0 mr-3">
                    {isImg && previewUrl ? (
                      <div className="w-12 h-12 rounded overflow-hidden bg-gray-100">
                        <img
                          src={previewUrl}
                          alt={getFileName(file)}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded">
                        {getFileIcon(file)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{getFileName(file)}</p>
                    <p className="text-xs text-gray-500">{getFileSize(file)}</p>
                  </div>
                  
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(index);
                      }}
                      className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 