import React, { useState } from 'react';
import { Card } from './card';
import { cn } from '@/lib/utils';

interface AreaChartProps {
  data: { 
    date: string;
    [key: string]: any
  }[];
  index: string;
  categories: string[];
  colors: string[];
  className?: string;
}

export const AreaChart = ({ 
  data, 
  index, 
  categories,
  colors,
  className
}: AreaChartProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  // Calculer les valeurs maximales pour l'axe Y
  const allValues = data.flatMap(item => categories.map(c => Number(item[c] || 0)));
  const maxValue = Math.max(...allValues, 1);

  // Hauteur du graphique
  const chartHeight = 200;
  const barWidth = 100 / Math.max(data.length, 1);

  // Générer des couleurs par défaut si non fournies
  const defaultColors = ['amber', 'blue', 'green', 'purple', 'red'];
  const usedColors = colors?.length ? colors : defaultColors;

  return (
    <div className={cn("relative w-full h-[240px]", className)}>
      <div className="absolute inset-0 flex flex-col">
        {/* Axe Y - lignes horizontales */}
        <div className="flex-1 flex flex-col justify-between text-xs text-muted-foreground">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-t border-border/40 h-0 relative">
              <span className="absolute -top-3 -left-5 text-[10px]">
                {Math.round((maxValue / 4) * (4 - i))}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="absolute left-0 bottom-0 right-0 h-[200px]">
        {/* Aires du graphique */}
        {categories.map((category, categoryIndex) => {
          const color = usedColors[categoryIndex % usedColors.length];
          
          return (
            <svg
              key={category}
              className="absolute inset-0 overflow-visible"
              preserveAspectRatio="none"
              viewBox={`0 0 100 100`}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d={`
                  M0,100
                  ${data.map((d, i) => {
                    const value = d[category] || 0;
                    const x = i * (100 / (data.length - 1));
                    const y = 100 - (value / maxValue) * 100;
                    return `L${x},${y}`;
                  }).join(' ')}
                  L100,100
                  Z
                `}
                className={`fill-${color}-100/50`}
              />
              <path
                d={`
                  M0,100
                  ${data.map((d, i) => {
                    const value = d[category] || 0;
                    const x = i * (100 / (data.length - 1));
                    const y = 100 - (value / maxValue) * 100;
                    return (i === 0 ? 'M' : 'L') + `${x},${y}`;
                  }).join(' ')}
                `}
                className={`stroke-${color}-600 stroke-2 fill-none`}
              />
            </svg>
          );
        })}

        {/* Barres interactives */}
        <div className="absolute inset-0 flex">
          {data.map((item, i) => (
            <div
              key={i}
              className="h-full relative group flex-1"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Info bulle */}
              {hoveredIndex === i && (
                <Card className="absolute -top-20 left-1/2 -translate-x-1/2 z-10 p-2 min-w-[100px] shadow-lg">
                  <p className="text-xs font-medium mb-1">{item[index]}</p>
                  {categories.map((category, catIndex) => (
                    <div key={category} className="flex justify-between text-xs">
                      <span className={`text-${usedColors[catIndex % usedColors.length]}-600`}>
                        {category}:
                      </span>
                      <span className="font-medium">{item[category]}</span>
                    </div>
                  ))}
                </Card>
              )}
              
              {/* Ligne de séparation au survol */}
              <div
                className={cn("h-full w-px bg-transparent mx-auto transition-colors", {
                  "bg-muted-foreground/20": hoveredIndex === i
                })}
              />
              
              {/* Point visible au survol */}
              {hoveredIndex === i && categories.map((category, catIndex) => {
                const color = usedColors[catIndex % usedColors.length];
                const value = item[category] || 0;
                const top = chartHeight - (value / maxValue) * chartHeight;
                
                return (
                  <div
                    key={category}
                    className={`absolute w-2 h-2 rounded-full bg-${color}-600 border-2 border-white transform -translate-x-1/2 -translate-y-1/2`}
                    style={{ left: '50%', top: `${top}px` }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Axe X (dates) */}
      <div className="absolute left-0 bottom-0 right-0 flex justify-between px-2">
        {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0 || i === data.length - 1).map((item, i) => (
          <div key={i} className="text-xs text-muted-foreground">
            {item[index].toString().substring(0, 5)}
          </div>
        ))}
      </div>
    </div>
  );
}; 