import React from "react";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { ValidRating, RATING_DESCRIPTIONS, RATING_COLORS, getRatingDescription, isValidRating } from "@/utils/rating-utils";

interface StarRatingProps {
  value: number | null;
  onChange?: (value: number | null) => void;
  readOnly?: boolean;
  showDescription?: boolean;
  showLabels?: boolean;
  showClearButton?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StarRating({
  value,
  onChange,
  readOnly = false,
  showDescription = true,
  showLabels = true,
  showClearButton = true,
  size = "md",
  className,
}: StarRatingProps) {
  // Déterminer la taille des étoiles
  const starSizes = {
    sm: "h-5 w-5",
    md: "h-7 w-7",
    lg: "h-9 w-9",
  };

  // Déterminer la taille des boutons
  const buttonSizes = {
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-14 h-14",
  };

  // Gérer le clic sur une étoile
  const handleStarClick = (rating: number) => {
    if (readOnly || !onChange) return;
    
    // Si l'utilisateur clique sur la même étoile, annuler la sélection
    if (value === rating) {
      onChange(null);
    } else {
      onChange(rating);
    }
  };

  // Réinitialiser la note
  const handleClear = () => {
    if (readOnly || !onChange) return;
    onChange(null);
  };

  return (
    <div className={cn("flex flex-col space-y-3", className)}>
      <div className="flex items-center justify-center space-x-2 bg-amber-50 py-4 px-2 rounded-lg">
        {[1, 2, 3, 4, 5].map((rating) => {
          const isSelected = value === rating;
          const isActive = value !== null && value >= rating;
          
          return (
            <div key={rating} className="flex flex-col items-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleStarClick(rating)}
                className={cn(
                  buttonSizes[size],
                  "p-0 rounded-full transition-all duration-200 transform",
                  isSelected ? "scale-110 bg-white shadow-md" : "",
                  isActive ? RATING_COLORS[rating as ValidRating] : "hover:bg-white/80",
                  readOnly ? "cursor-default" : "cursor-pointer"
                )}
                disabled={readOnly}
                title={RATING_DESCRIPTIONS[rating as ValidRating]}
              >
                <Star
                  className={cn(
                    starSizes[size],
                    isActive 
                      ? RATING_COLORS[rating as ValidRating]
                      : "text-gray-300"
                  )}
                  fill={isActive ? "currentColor" : "none"}
                />
              </Button>
              {showLabels && (
                <span className="text-xs font-medium mt-1">{rating}</span>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Description de la note */}
      {showDescription && isValidRating(value) && (
        <div className="bg-white p-3 rounded-lg border border-amber-200 text-center">
          <p className="text-sm font-medium text-amber-800 flex items-center justify-center gap-2">
            <span className="bg-amber-100 rounded-full h-6 w-6 flex items-center justify-center text-amber-700 font-bold">
              {value}
            </span>
            <span>{getRatingDescription(value)}</span>
          </p>
        </div>
      )}
      
      {/* Bouton de réinitialisation et échelle */}
      <div className="flex justify-between items-center">
        {showLabels && (
          <div className="flex items-center space-x-2">
            <div className="text-xs text-red-600 font-medium">Insuffisant</div>
            <div className="flex-1 h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full mx-3"></div>
            <div className="text-xs text-green-600 font-medium">Excellent</div>
          </div>
        )}
        
        {showClearButton && !readOnly && onChange && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="ml-2 text-xs bg-white text-gray-600 hover:bg-gray-50 border-gray-300"
          >
            Effacer
          </Button>
        )}
      </div>
    </div>
  );
} 