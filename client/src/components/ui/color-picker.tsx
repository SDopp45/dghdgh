import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronDown } from 'lucide-react';

interface ColorPickerProps {
  color: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

const presetColors = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#171717', // neutral-900
  '#737373', // neutral-500
  '#fafafa', // neutral-50
];

export function ColorPicker({ color, onChange, className, disabled = false }: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(color || '#000000');
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(color);
  }, [color]);

  // Validate and format hex color
  const validateColor = (input: string): string => {
    // Add # if missing
    let value = input;
    if (!value.startsWith('#')) {
      value = '#' + value;
    }
    
    // Validate hex color format
    const hexRegex = /^#([A-Fa-f0-9]{3}){1,2}$/;
    if (!hexRegex.test(value)) {
      return color; // Return original if invalid
    }
    
    // Convert 3-char format to 6-char format
    if (value.length === 4) {
      value = '#' + value[1] + value[1] + value[2] + value[2] + value[3] + value[3];
    }
    
    return value;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Only update the actual color if it's valid
    if (newValue.length >= 4) { // At least #RGB format
      const validColor = validateColor(newValue);
      if (validColor !== color) {
        onChange(validColor);
      }
    }
  };

  const handleInputBlur = () => {
    const validColor = validateColor(inputValue);
    setInputValue(validColor);
    onChange(validColor);
  };

  const handlePresetClick = (presetColor: string) => {
    onChange(presetColor);
    setInputValue(presetColor);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between px-3 text-left font-normal",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <div 
              className="h-4 w-4 rounded-sm border border-gray-200 shadow-sm" 
              style={{ backgroundColor: validateColor(inputValue) }}
            />
            <span>{inputValue}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-3" 
        ref={pickerRef}
        align="start"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div 
              className="h-9 w-9 rounded-md border border-gray-200" 
              style={{ backgroundColor: validateColor(inputValue) }}
            />
            <Input
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className="h-9"
            />
          </div>
          
          <div>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {presetColors.map((presetColor) => (
                <button
                  key={presetColor}
                  className={cn(
                    "rounded-md h-6 w-6 flex items-center justify-center border",
                    inputValue.toLowerCase() === presetColor.toLowerCase() 
                      ? "ring-2 ring-offset-2 ring-primary"
                      : "border-gray-200 hover:scale-110 transition-transform"
                  )}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => handlePresetClick(presetColor)}
                >
                  {inputValue.toLowerCase() === presetColor.toLowerCase() && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 