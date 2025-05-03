import { User } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ProfileImageProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  fallback?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

export function ProfileImage({ 
  src, 
  fallback, 
  size = "md", 
  className,
  ...props 
}: ProfileImageProps) {
  return (
    <Avatar className={cn(sizeClasses[size], className)} {...props}>
      <AvatarImage 
        src={src || ''} 
        alt="Photo de profil"
        className="object-cover"
      />
      <AvatarFallback className="bg-primary/10">
        {fallback ? (
          <span className="text-sm font-medium text-primary">
            {fallback.slice(0, 2).toUpperCase()}
          </span>
        ) : (
          <User className="h-4 w-4 text-primary" />
        )}
      </AvatarFallback>
    </Avatar>
  );
}
