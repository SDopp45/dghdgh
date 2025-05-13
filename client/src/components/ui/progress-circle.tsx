import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

const progressCircleVariants = cva(
  "relative inline-flex",
  {
    variants: {
      size: {
        sm: "h-16 w-16",
        md: "h-24 w-24",
        lg: "h-32 w-32",
      },
      variant: {
        default: "text-primary",
        success: "text-green-500",
        warning: "text-amber-500",
        danger: "text-red-500",
      },
    },
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  }
);

interface ProgressCircleProps extends VariantProps<typeof progressCircleVariants> {
  value: number;
  className?: string;
  strokeWidth?: number;
  showValue?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  label?: string;
}

export const ProgressCircle = forwardRef<HTMLDivElement, ProgressCircleProps>(
  ({ 
    value, 
    size, 
    variant, 
    className, 
    strokeWidth = 4,
    showValue = true,
    valuePrefix = "",
    valueSuffix = "%",
    label
  }, ref) => {
    // Assurez-vous que la valeur est entre 0 et 100
    const safeValue = Math.min(100, Math.max(0, value));
    
    // Calcul des propriétés du cercle
    const radius = 50 - strokeWidth / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (safeValue / 100) * circumference;
    
    return (
      <div 
        ref={ref} 
        className={cn(progressCircleVariants({ size, variant }), className)}
      >
        <svg 
          viewBox="0 0 100 100" 
          className="rotate-[-90deg]"
        >
          {/* Cercle de fond */}
          <circle 
            cx="50" 
            cy="50" 
            r={radius} 
            strokeWidth={strokeWidth} 
            className="fill-none stroke-muted"
          />
          
          {/* Cercle de progression */}
          <circle 
            cx="50" 
            cy="50" 
            r={radius} 
            strokeWidth={strokeWidth} 
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="fill-none stroke-current transition-all duration-300 ease-in-out"
            strokeLinecap="round"
          />
        </svg>
        
        {/* Valeur au centre */}
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-lg font-bold leading-none">
              {valuePrefix}{Math.round(safeValue)}{valueSuffix}
            </span>
            {label && <span className="mt-1 text-xs text-muted-foreground">{label}</span>}
          </div>
        )}
      </div>
    );
  }
);

ProgressCircle.displayName = "ProgressCircle"; 