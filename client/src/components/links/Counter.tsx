import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface CounterProps {
  value: number;
  duration?: number;
  className?: string;
}

export function Counter({ value, duration = 1000, className }: CounterProps) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    // Si la valeur est 0, pas besoin d'animation
    if (value === 0) {
      setCount(0);
      return;
    }
    
    // Calculer l'incrément par étape
    const start = 0;
    const end = value;
    const steps = 20;
    const increment = (end - start) / steps;
    
    // Définir le délai entre chaque étape
    const stepDuration = duration / steps;
    
    let current = start;
    let stepCount = 0;
    
    // Démarrer l'animation
    const timer = setInterval(() => {
      stepCount++;
      current += increment;
      
      // Arrondir pour éviter les décimales
      const roundedValue = Math.round(current);
      
      // Mettre à jour le compteur
      setCount(roundedValue);
      
      // Arrêter l'animation à la dernière étape
      if (stepCount >= steps) {
        setCount(end);
        clearInterval(timer);
      }
    }, stepDuration);
    
    // Nettoyer le timer à la destruction du composant
    return () => clearInterval(timer);
  }, [value, duration]);
  
  return (
    <span className={cn(className)}>
      {count.toLocaleString()}
    </span>
  );
} 