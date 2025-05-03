import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { HexColorPicker } from 'react-colorful';
import { useState } from "react";

export interface WatermarkSettings {
  type: 'logo' | 'text';
  text?: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  size: number;
  color?: string;
  font?: string;
  opacity: number;
  sizeMode?: 'percent' | 'pixels';
}

interface WatermarkSettingsProps {
  settings: WatermarkSettings;
  onSettingsChange: (settings: WatermarkSettings) => void;
  type: 'logo' | 'text';
}

export function WatermarkSettings({ settings, onSettingsChange, type }: WatermarkSettingsProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const positions = [
    { value: 'top-left', label: 'Haut Gauche' },
    { value: 'top-right', label: 'Haut Droite' },
    { value: 'bottom-left', label: 'Bas Gauche' },
    { value: 'bottom-right', label: 'Bas Droite' },
    { value: 'center', label: 'Centre' },
  ];

  const fonts = [
    { value: 'Arial', label: 'Arial' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Helvetica', label: 'Helvetica' },
    { value: 'Georgia', label: 'Georgia' },
  ];

  return (
    <div className="space-y-4">
      {type === 'text' && (
        <div className="space-y-2">
          <Label>Texte du filigrane</Label>
          <Input
            value={settings.text}
            onChange={(e) => onSettingsChange({ ...settings, text: e.target.value })}
            placeholder="Entrez le texte du filigrane"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Position</Label>
        <Select
          value={settings.position}
          onValueChange={(value) => onSettingsChange({ 
            ...settings, 
            position: value as WatermarkSettings['position']
          })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choisir la position" />
          </SelectTrigger>
          <SelectContent>
            {positions.map((pos) => (
              <SelectItem key={pos.value} value={pos.value}>
                {pos.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Taille ({settings.size}%)</Label>
        <Slider
          value={[settings.size]}
          onValueChange={([value]) => onSettingsChange({ ...settings, size: value })}
          min={5}
          max={100}
          step={5}
        />
      </div>

      <div className="space-y-2">
        <Label>Opacité ({settings.opacity}%)</Label>
        <Slider
          value={[settings.opacity]}
          onValueChange={([value]) => onSettingsChange({ ...settings, opacity: value })}
          min={10}
          max={100}
          step={10}
        />
      </div>

      {type === 'text' && (
        <>
          <div className="space-y-2">
            <Label>Police</Label>
            <Select
              value={settings.font}
              onValueChange={(value) => onSettingsChange({ ...settings, font: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir la police" />
              </SelectTrigger>
              <SelectContent>
                {fonts.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Couleur</Label>
            <div 
              className="w-full h-10 rounded-md border cursor-pointer"
              style={{ backgroundColor: settings.color }}
              onClick={() => setShowColorPicker(!showColorPicker)}
            />
            {showColorPicker && (
              <div className="absolute z-10 mt-2">
                <HexColorPicker
                  color={settings.color}
                  onChange={(color) => onSettingsChange({ ...settings, color })}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}