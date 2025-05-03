import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Option {
  value: string;
  label: string;
}

interface PaginatedSelectProps {
  options: Option[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  triggerClassName?: string;
}

export function PaginatedSelect({
  options,
  value,
  onValueChange,
  placeholder = "Sélectionner...",
  className = "",
  triggerClassName = "",
}: PaginatedSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`h-10 bg-background/50 hover:bg-background/80 transition-colors ${triggerClassName}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={`min-w-[240px] ${className}`}>
        <div className="py-2 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-red-500/10 scrollbar-track-background hover:scrollbar-thumb-red-500/20">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </div>
      </SelectContent>
    </Select>
  );
}