import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface ImagePreviewProps {
  file?: File;
  src?: string;
  className?: string;
}

export function ImagePreview({ file, src, className = "" }: ImagePreviewProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onloadstart = () => setIsLoading(true);
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    } else if (src) {
      setPreview(src);
      setIsLoading(false);
    }
  }, [file, src]);

  if (isLoading) {
    return <Skeleton className={`w-full aspect-[4/3] rounded-lg ${className}`} />;
  }

  if (!preview) {
    return null;
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-lg ${className}`}>
      <div className="w-full aspect-[4/3]">
        <img
          src={preview}
          alt="Aperçu de l'image"
          className="w-full h-full object-contain bg-muted/10"
        />
      </div>
    </div>
  );
}