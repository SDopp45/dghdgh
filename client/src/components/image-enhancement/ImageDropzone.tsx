import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";

interface ImageDropzoneProps {
  onImageSelect: (file: File) => void;
}

export function ImageDropzone({ onImageSelect }: ImageDropzoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onImageSelect(acceptedFiles[0]);
    }
  }, [onImageSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    multiple: false
  });

  return (
    <div
      {...getRootProps()}
      className={`
        flex flex-col items-center justify-center h-64
        border-2 border-dashed rounded-lg
        ${isDragActive 
          ? "border-primary bg-primary/5" 
          : "border-gray-300 bg-gray-50"
        }
        cursor-pointer transition-colors duration-200
      `}
    >
      <input {...getInputProps()} />
      <Upload className={`h-12 w-12 ${isDragActive ? "text-primary" : "text-gray-400"}`} />
      <p className="mt-2 text-sm text-center text-gray-500">
        {isDragActive ? (
          "Déposez l'image ici"
        ) : (
          <>
            Glissez-déposez une image ici, ou<br />
            <span className="text-primary">cliquez pour sélectionner</span>
          </>
        )}
      </p>
      <p className="mt-1 text-xs text-gray-400">
        JPEG, JPG, PNG ou WEBP (max. 10MB)
      </p>
    </div>
  );
}
