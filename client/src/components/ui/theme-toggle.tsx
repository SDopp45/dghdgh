import { Moon, Sun } from "lucide-react";
import { Button } from "./button";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "default" | "icon";
}

export function ThemeToggle({ className, variant = "default" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost" 
      size={variant === "icon" ? "icon" : "default"}
      className={cn(
        "rounded-full h-9 w-9 text-muted-foreground hover:text-primary hover:bg-muted/50 transition-all duration-200",
        className
      )}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      <Sun className={cn(
        "h-5 w-5 rotate-0 scale-100 transition-all duration-300",
        theme === "dark" && "rotate-90 scale-0"
      )} />
      <Moon className={cn(
        "absolute h-5 w-5 rotate-90 scale-0 transition-all duration-300",
        theme === "dark" && "rotate-0 scale-100"
      )} />
    </Button>
  );
} 