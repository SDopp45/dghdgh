import React from "react";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

const dataCardVariants = cva(
  "data-card",
  {
    variants: {
      variant: {
        default: "",
        outline: "border-2",
        glass: "glass-card border-0",
        neumorphic: "neumorphic border-0",
      },
      size: {
        default: "p-5",
        sm: "p-4",
        lg: "p-6",
      },
      animation: {
        none: "",
        float: "animate-float",
        pulse: "animate-pulse-glow",
        scale: "transform hover:scale-[1.02] transition-transform duration-300",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "none",
    },
  }
);

export interface TrendData {
  value: number;
  trend?: number;
  trendLabel?: string;
  trendPeriod?: string;
  prefix?: string;
  suffix?: string;
  formatter?: (value: number) => string;
}

export interface DataCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dataCardVariants> {
  title: string;
  icon?: React.ReactNode;
  data: TrendData;
  footer?: React.ReactNode;
  colorScheme?: "blue" | "green" | "red" | "amber" | "purple" | "default";
}

export function DataCard({
  title,
  icon,
  data,
  footer,
  className,
  variant,
  size,
  animation,
  colorScheme = "default",
  ...props
}: DataCardProps) {
  const {
    value,
    trend = 0,
    trendLabel,
    trendPeriod = "vs précédent",
    prefix = "",
    suffix = "",
    formatter,
  } = data;

  // Formatage de la valeur
  const formattedValue = formatter 
    ? formatter(value) 
    : `${prefix}${value.toLocaleString('fr-FR')}${suffix}`;

  // Classes CSS pour le schéma de couleur
  const colorClasses = {
    blue: "text-blue-500",
    green: "text-emerald-500",
    red: "text-rose-500",
    amber: "text-amber-500",
    purple: "text-purple-500",
    default: "text-primary",
  };

  // Classes d'icônes pour les tendances
  const trendIconClasses = cn(
    "h-4 w-4",
    trend > 0 ? "text-emerald-500" : trend < 0 ? "text-rose-500" : "text-muted-foreground"
  );

  // Texte de tendance formaté
  const trendText = trend !== 0 
    ? `${trend > 0 ? '+' : ''}${trend.toLocaleString('fr-FR')}%` 
    : "0%";

  return (
    <div
      className={cn(
        dataCardVariants({ variant, size, animation }),
        className
      )}
      {...props}
    >
      <div className="data-card-header">
        <h4 className="data-card-title">{title}</h4>
        {icon && (
          <div className={cn(
            "data-card-icon",
            colorScheme !== "default" && `bg-${colorScheme}-500/10 text-${colorScheme}-500`
          )}>
            {icon}
          </div>
        )}
      </div>
      
      <div className={cn("data-card-value", colorClasses[colorScheme])}>
        {formattedValue}
      </div>
      
      {trend !== undefined && (
        <div className={cn(
          "data-card-trend",
          trend > 0 ? "positive" : trend < 0 ? "negative" : ""
        )}>
          {trend > 0 ? (
            <ArrowUp className={trendIconClasses} />
          ) : trend < 0 ? (
            <ArrowDown className={trendIconClasses} />
          ) : (
            <Minus className={trendIconClasses} />
          )}
          <span>
            {trendText} {trendLabel || trendPeriod}
          </span>
        </div>
      )}
      
      {footer && <div className="mt-4 pt-4 border-t border-border/50">{footer}</div>}
    </div>
  );
} 