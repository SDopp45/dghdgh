import React, { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassCardVariants = cva(
  "glass-card overflow-hidden w-full",
  {
    variants: {
      variant: {
        default: "bg-white/10 dark:bg-card/40 backdrop-blur-md",
        subtle: "bg-white/5 dark:bg-card/20 backdrop-blur-sm",
        solid: "bg-white/20 dark:bg-card/60 backdrop-blur-xl",
      },
      border: {
        default: "border border-white/20 dark:border-white/10",
        none: "",
        light: "border border-white/10 dark:border-white/5",
        colored: "border border-primary/20",
      },
      shadow: {
        default: "shadow-lg",
        none: "",
        soft: "shadow-md",
        hard: "shadow-xl",
        glow: "shadow-xl shadow-primary/20",
      },
      rounded: {
        default: "rounded-xl",
        none: "",
        sm: "rounded-lg",
        lg: "rounded-2xl",
        full: "rounded-3xl",
      },
      padding: {
        default: "p-6",
        none: "",
        sm: "p-4",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      border: "default",
      shadow: "default",
      rounded: "default",
      padding: "default",
    },
  }
);

export interface GlassCardProps 
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {
  hoverEffect?: boolean;
  animation?: "none" | "float" | "pulse" | "scale";
}

export function GlassCard({
  className,
  variant,
  border,
  shadow,
  rounded,
  padding,
  hoverEffect = true,
  animation = "none",
  children,
  ...props
}: GlassCardProps) {
  return (
    <div 
      className={cn(
        glassCardVariants({ variant, border, shadow, rounded, padding }),
        hoverEffect && "transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
        animation === "float" && "animate-float",
        animation === "pulse" && "animate-pulse-glow",
        animation === "scale" && "transform hover:scale-[1.02] transition-transform duration-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function GlassCardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 mb-4 w-full", className)}
      {...props}
    />
  );
}

export function GlassCardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <h3
      className={cn("font-semibold leading-tight text-lg", className)}
      {...props}
    />
  );
}

export function GlassCardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <p
      className={cn("text-sm text-foreground/70", className)}
      {...props}
    />
  );
}

export function GlassCardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("w-full", className)}
      {...props}
    />
  );
}

export function GlassCardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center pt-4 mt-auto w-full", className)}
      {...props}
    />
  );
} 