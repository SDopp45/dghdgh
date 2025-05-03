import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Widget } from '@/lib/stores/useWidgetStore';
import { Wallet, TrendingUp, ArrowRight, ZoomIn, ZoomOut, MousePointer, Move } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useProperties } from '@/api/properties';

// Types for Sankey diagram
interface SankeyNode {
  id: string;
  name: string;
  category: 'income' | 'expense' | 'credit' | 'amount';
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  date?: Date;
}

// Alias pour SankeyNode pour les extensions éventuelles
type SankeyNodeExtended = SankeyNode;

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  path?: string;
  sourceX?: number;
  sourceY?: number;
  targetX?: number;
  targetY?: number;
  sourceNode?: SankeyNode;
  targetNode?: SankeyNode;
  width?: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
  totalIncome: number;
}

// Interface étendue pour accepter des transactions en prop optionnelle
interface CashflowSankeyWidgetProps {
  widget: Widget;
  transactions?: any[];
  period?: 'month' | 'quarter' | 'year';
  transactionStatus?: 'pending' | 'completed' | 'all';
}

// Redéfinir les couleurs pour un look plus futuriste/crypto
const categoryColors = {
  income: {
    main: '#00FFDD', // Cyan néon
    secondary: '#00DDCC66',
    text: '#ffffff'
  },
  expense: {
    main: '#FF2A6D', // Rose néon
    secondary: '#FF2A6D66',
    text: '#ffffff'
  },
  credit: {
    main: '#D800FF', // Violet néon
    secondary: '#D800FF66',
    text: '#ffffff'
  },
  investment: { // Garder pour compatibilité avec des données existantes
    main: '#D800FF', // Violet néon
    secondary: '#D800FF66',
    text: '#ffffff'
  },
  amount: {
    main: '#05FFA1', // Vert néon
    secondary: '#05FFA166',
    text: '#212121'
  }
};

// Fonction utilitaire pour obtenir la couleur d'une catégorie en toute sécurité
function getCategoryColor(category: string, property: 'main' | 'secondary' | 'text'): string {
  // Convertir investment en credit pour la compatibilité
  const normalizedCategory = category === 'investment' ? 'credit' : category;
  
  // Vérifier si la catégorie existe dans les couleurs définies
  const validCategories = ['income', 'expense', 'credit', 'investment', 'savings', 'amount'];
  const categoryKey = validCategories.includes(normalizedCategory) 
    ? normalizedCategory as keyof typeof categoryColors 
    : 'amount';  // Catégorie par défaut
  
  // Retourner la couleur demandée
  if (categoryColors[categoryKey]) {
    return categoryColors[categoryKey][property];
  }
  
  // Valeurs par défaut
  const defaults = {
    main: '#9E9E9E',
    secondary: '#E0E0E0',
    text: '#FFFFFF'
  };
  
  return defaults[property];
}

// Définir les noms et couleurs des types principaux
const typeNodes: Record<string, { name: string; category: 'income' | 'expense' | 'credit' }> = {
  'rental': { name: 'Revenus locatifs', category: 'income' },
  'fees': { name: 'Frais et commissions', category: 'income' },
  'services': { name: 'Services', category: 'income' },
  'dividends': { name: 'Dividendes & intérêts', category: 'income' },
  'sales': { name: 'Ventes', category: 'income' },
  'other_income': { name: 'Autres revenus', category: 'income' },
  
  'maintenance': { name: 'Maintenance', category: 'expense' },
  'insurance': { name: 'Assurance', category: 'expense' },
  'taxes': { name: 'Impôts & taxes', category: 'expense' },
  'utilities': { name: 'Charges & utilities', category: 'expense' },
  'professional': { name: 'Services professionnels', category: 'expense' },
  'equipment': { name: 'Équipements', category: 'expense' },
  'marketing': { name: 'Marketing & pub', category: 'expense' },
  'misc': { name: 'Divers', category: 'expense' },
  
  'mortgage': { name: 'Prêts', category: 'credit' },
  'stocks': { name: 'Actions & Investissements', category: 'credit' },
  'crypto': { name: 'Crypto-monnaies', category: 'credit' }
};

// Fonction pour calculer la disposition des nœuds rectangulaires
function computeSankeyLayout(initialData: Omit<SankeyData, 'totalIncome'>, width: number, height: number): SankeyData {
  // Création d'une copie profonde pour éviter de modifier les données d'origine
  const deepCopy = JSON.parse(JSON.stringify(initialData));
  const data = { 
    nodes: deepCopy.nodes,
    links: deepCopy.links,
    totalIncome: 0
  };
  
  // Trouver les niveaux (colonnes) uniques en fonction des liens
  const levels = new Map<string, number>();
  
  // Déterminer les niveaux initiaux selon la hiérarchie à 5 niveaux
  data.nodes.forEach((node: SankeyNode) => {
    if (node.id.startsWith('property_')) {
      levels.set(node.id, 0); // Propriétés
    } else if (node.id === 'income' || node.id === 'expense' || node.id === 'credit') {
      levels.set(node.id, 1); // Types principaux (revenus, dépenses, crédit)
    } else if (['rental', 'fees', 'services', 'dividends', 'sales', 'other_income',
               'maintenance', 'taxes', 'utilities', 'insurance', 'professional', 
               'equipment', 'marketing', 'misc', 'mortgage', 'stocks', 'crypto'].includes(node.id)) {
      levels.set(node.id, 2); // Sous-types
    } else if (node.id.startsWith('category_')) {
      levels.set(node.id, 3); // Catégories spécifiques
    } else if (node.id.startsWith('payment_')) {
      levels.set(node.id, 4); // Méthodes de paiement
    } else if (node.id.startsWith('amount_')) {
      levels.set(node.id, 5); // Montants (final)
    } else {
      // Nœuds non identifiés
      if (node.category === 'income' || node.category === 'credit') {
        levels.set(node.id, 2);
    } else if (node.category === 'expense') {
      levels.set(node.id, 3);
      } else if (node.category === 'amount') {
        levels.set(node.id, 5);
    } else {
        levels.set(node.id, 3); // Valeur par défaut
      }
    }
  });
  
  // Filtrer les nœuds qui ont des connexions
  const connectedNodeIds = new Set<string>();
  data.links.forEach((link: SankeyLink) => {
    connectedNodeIds.add(link.source);
    connectedNodeIds.add(link.target);
  });
  
  const activeNodes = data.nodes.filter((node: SankeyNode) => connectedNodeIds.has(node.id));
  const activeLinks = data.links;
  
  // Trier les noeuds par catégorie et par valeur
  activeNodes.sort((a: SankeyNode, b: SankeyNode) => {
    // D'abord trier par catégorie/niveau
    const levelA = levels.get(a.id) || 0;
    const levelB = levels.get(b.id) || 0;
    if (levelA !== levelB) return levelA - levelB;
    
    // Ensuite par valeur (descendant)
    return b.value - a.value;
  });
  
  // Calculer le revenu total pour les statistiques
  const totalIncome = activeNodes
    .filter((node: SankeyNode) => node.category === 'income')
    .reduce((sum: number, node: SankeyNode) => sum + node.value, 0);
  
  // Grouper les nœuds par niveau
  const columnNodes = new Map<number, SankeyNode[]>();
  activeNodes.forEach((node: SankeyNode) => {
    const level = levels.get(node.id) || 0;
    if (!columnNodes.has(level)) {
      columnNodes.set(level, []);
    }
    columnNodes.get(level)?.push(node);
  });
  
  // Calculer la position de chaque nœud
  const maxLevel = Math.max(...Array.from(levels.values()));
  
  // Largeur de colonne fixe pour chaque niveau
  const columnWidth = 60;
  // Espacement entre les colonnes
  const columnSpacing = (width - (maxLevel + 1) * columnWidth) / maxLevel;
  
  // Pour chaque niveau, disposer les nœuds
  for (let level = 0; level <= maxLevel; level++) {
    const nodesInColumn = columnNodes.get(level) || [];
    
    // Position X pour cette colonne
    const columnX = level * (columnWidth + columnSpacing);
    
    // Hauteur totale disponible
    const availableHeight = height - 50; // Marge en haut et en bas
    
    // Calculer la hauteur totale nécessaire pour tous les nœuds + les marges
    const totalNodesValue = nodesInColumn.reduce((sum, node) => sum + node.value, 0);
    
    // Position Y pour le premier nœud
    let currentY = 25; // Marge en haut
    
    // Pour chaque nœud dans cette colonne
    nodesInColumn.forEach((node) => {
      // La hauteur du nœud est proportionnelle à sa valeur
      const nodeHeight = Math.max(25, (node.value / totalNodesValue) * availableHeight);
      
      // Mettre à jour les propriétés du nœud
      node.x = columnX;
      node.y = currentY;
      node.width = columnWidth;
      node.height = nodeHeight;
      node.radius = 0; // Pas besoin de rayon pour les rectangles
      
      // Mettre à jour Y pour le prochain nœud
      currentY += nodeHeight + 5; // Ajouter un petit espace entre les nœuds
    });
  }
  
  // Créer les connexions entre les nœuds
  const linkPaths: SankeyLink[] = [];
  
  activeLinks.forEach((link: SankeyLink) => {
    const sourceNode = activeNodes.find((n: SankeyNode) => n.id === link.source);
    const targetNode = activeNodes.find((n: SankeyNode) => n.id === link.target);
    
    if (sourceNode && targetNode) {
      // Calculer la proportion de ce lien par rapport à la valeur totale du nœud source
      const sourceRatio = link.value / sourceNode.value;
      // Calculer la proportion de ce lien par rapport à la valeur totale du nœud cible
      const targetRatio = link.value / targetNode.value;
      
      // Calculer la hauteur du lien
      const linkHeight = Math.min(
        sourceNode.height * sourceRatio, 
        targetNode.height * targetRatio,
        Math.max(1, Math.log10(link.value) * 2) // Assurer une taille minimale basée sur la valeur
      );
      
      // Position Y du centre du lien sur le nœud source
      const sourceY = sourceNode.y + sourceNode.height * 0.5;
      // Position Y du centre du lien sur le nœud cible
      const targetY = targetNode.y + targetNode.height * 0.5;
      
      // Coordonnées des points de contrôle pour la courbe de Bézier
      const sourceX = sourceNode.x + sourceNode.width;
      const controlX1 = sourceX + (targetNode.x - sourceX) * 0.4;
      const controlX2 = sourceX + (targetNode.x - sourceX) * 0.6;
      
      // Créer le chemin SVG pour le lien avec une courbe plus douce
      const path = `
        M ${sourceX} ${sourceY}
        C ${controlX1} ${sourceY},
          ${controlX2} ${targetY},
          ${targetNode.x} ${targetY}
      `;
      
      // Retourner un lien enrichi avec toutes les infos nécessaires au rendu
      linkPaths.push({
        ...link,
        sourceNode,
        targetNode,
        sourceX,
        sourceY,
        targetX: targetNode.x,
        targetY,
        path,
        width: linkHeight
      });
    }
  });
  
  return {
    nodes: activeNodes,
    links: linkPaths,
    totalIncome
  };
}

// Une légende pour expliquer les catégories
function SankeyLegend() {
  const categories = [
    { id: 'income', label: 'Revenus' },
    { id: 'expense', label: 'Dépenses' },
    { id: 'credit', label: 'Crédits' },
    { id: 'amount', label: 'Transactions' }
  ];
  
  return (
    <div className="flex flex-wrap gap-3 justify-center my-2">
      {categories.map(category => (
        <div key={category.id} className="flex items-center gap-1.5">
          <div 
            className="w-3 h-3 rounded-sm" 
            style={{ backgroundColor: categoryColors[category.id as keyof typeof categoryColors].main }}
          ></div>
          <span className="text-xs text-neutral-400">{category.label}</span>
        </div>
      ))}
    </div>
  );
}

// Ajouter des interactions plus avancées au SVG avec des animations
function SankeyRender({ data, hoveredNode, setHoveredNode, hoveredLink, setHoveredLink }: {
  data: SankeyData,
  hoveredNode: string | null,
  setHoveredNode: (id: string | null) => void,
  hoveredLink: SankeyLink | null,
  setHoveredLink: (link: SankeyLink | null) => void
}) {
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);
  const [nodeTransitions, setNodeTransitions] = useState<Record<string, { opacity: number, filter: string }>>({});

  // Optimiser le rendu en mémorisant les nœuds et liens calculés
  const { renderedNodes, renderedLinks, levelTitles } = useMemo(() => {
    if (!data || !data.nodes || !data.links) {
      return { renderedNodes: [], renderedLinks: [], levelTitles: [] };
    }
    
    // Grouper les nœuds par niveau pour afficher les titres
    const nodesByLevel: Record<number, SankeyNode[]> = {};
    data.nodes.forEach(node => {
      // Déduire le niveau à partir de la position X
      const level = Math.round(node.x / 100); // Approximation
      if (!nodesByLevel[level]) nodesByLevel[level] = [];
      nodesByLevel[level].push(node);
    });
    
    // Titres des niveaux
    const titles: { x: number, y: number, label: string }[] = [];
    Object.entries(nodesByLevel).forEach(([level, nodes]) => {
      const levelNumber = parseInt(level);
      let label = '';
      
      // Définir les étiquettes selon le niveau
      if (levelNumber === 0) label = 'Propriétés';
      else if (levelNumber === 1) label = 'Types';
      else if (levelNumber === 2) label = 'Sous-types';
      else if (levelNumber === 3) label = 'Catégories';
      else if (levelNumber === 4) label = 'Paiements';
      else if (levelNumber === 5) label = 'Montants';
      
      if (label && nodes.length > 0) {
        titles.push({
          x: nodes[0].x + nodes[0].width / 2,
          y: 15,
          label
        });
      }
    });
    
    // Filtrer les nœuds qui ont des connexions réelles
    const connectedNodeIds = new Set<string>();
    data.links.forEach(link => {
      connectedNodeIds.add(link.source);
      connectedNodeIds.add(link.target);
    });
    
    const filteredNodes = data.nodes.filter(node => {
      const hasConnections = data.links.some(
        link => link.source === node.id || link.target === node.id
      );
      return hasConnections;
    });
    
    return { 
      renderedNodes: filteredNodes, 
      renderedLinks: data.links,
      levelTitles: titles
    };
  }, [data]);
  
  // Effet pour les transitions fluides
  useEffect(() => {
    if (!renderedNodes.length) return;
    
    // Initialiser les transitions pour tous les nœuds
    const initialTransitions: Record<string, { opacity: number, filter: string }> = {};
    renderedNodes.forEach(node => {
      initialTransitions[node.id] = { 
        opacity: highlightedCategory ? (node.category === highlightedCategory ? 1 : 0.3) : 0.9,
        filter: 'brightness(1)'
      };
    });
    
    setNodeTransitions(initialTransitions);
  }, [renderedNodes, highlightedCategory]);
  
  // Fonction pour mettre à jour l'état de survol d'un nœud avec animation
  const handleNodeHover = (nodeId: string | null) => {
    if (!nodeId) {
      // Réinitialiser tous les nœuds à leur état normal
      const resetTransitions = { ...nodeTransitions };
      Object.keys(resetTransitions).forEach(id => {
        resetTransitions[id] = { 
          opacity: highlightedCategory ? (renderedNodes.find(n => n.id === id)?.category === highlightedCategory ? 1 : 0.3) : 0.9,
          filter: 'brightness(1)'
        };
      });
      setNodeTransitions(resetTransitions);
      setHoveredNode(null);
      return;
    }
    
    // Mettre en évidence le nœud survolé et ses connexions
    const newTransitions = { ...nodeTransitions };
    const hoveredNodeObj = renderedNodes.find(n => n.id === nodeId);
    if (!hoveredNodeObj) return;
    
    // Trouver tous les nœuds connectés
    const connectedNodes = new Set<string>();
    connectedNodes.add(nodeId);
    
    renderedLinks.forEach(link => {
      if (link.source === nodeId) {
        connectedNodes.add(link.target);
      } else if (link.target === nodeId) {
        connectedNodes.add(link.source);
      }
    });
    
    // Mettre à jour les transitions pour tous les nœuds
    Object.keys(newTransitions).forEach(id => {
      if (connectedNodes.has(id)) {
        newTransitions[id] = { 
          opacity: 1,
          filter: id === nodeId ? 'brightness(1.2)' : 'brightness(1.05)'
        };
      } else {
        newTransitions[id] = { 
          opacity: 0.3,
          filter: 'saturate(0.7) brightness(0.8)'
        };
      }
    });
    
    setNodeTransitions(newTransitions);
    setHoveredNode(nodeId);
  };
  
  if (!data || !data.nodes || !data.links) return null;

  // Fonction pour vérifier si un nœud est dans la catégorie surlignée
  const isHighlightedNode = (node: SankeyNode) => {
    if (!highlightedCategory) return true; // Aucun filtre
    return node.category === highlightedCategory;
  };

  // Fonction pour vérifier si un lien doit être surligné
  const isHighlightedLink = (link: SankeyLink) => {
    if (!highlightedCategory) return true; // Aucun filtre
    
    const sourceNode = data.nodes.find(n => n.id === link.source);
    const targetNode = data.nodes.find(n => n.id === link.target);
    
    return (sourceNode && sourceNode.category === highlightedCategory) || 
           (targetNode && targetNode.category === highlightedCategory);
  };

  // Fonction pour déterminer la couleur d'un nœud
  const getNodeFillColor = (node: SankeyNode) => {
    const isHighlighted = isHighlightedNode(node);
    const isHovered = hoveredNode === node.id;
    
    // Utilisez la fonction getCategoryColor pour obtenir les couleurs de manière sécurisée
    return isHovered 
      ? getCategoryColor(node.category, 'main')
      : isHighlighted 
        ? getCategoryColor(node.category, 'main')
        : getCategoryColor(node.category, 'secondary');
  };
  
  // Fonction pour déterminer la couleur d'un lien
  const getLinkColor = (link: SankeyLink) => {
    const source = data.nodes.find(n => n.id === link.source);
    const target = data.nodes.find(n => n.id === link.target);
    
    if (!source) return getCategoryColor('amount', 'secondary');
    
    const isHighlighted = isHighlightedLink(link);
    const isHovered = hoveredLink === link;
    
    // Utilisez la fonction getCategoryColor pour obtenir les couleurs de manière sécurisée
    return isHovered 
      ? getCategoryColor(source.category, 'main')
      : isHighlighted 
        ? getCategoryColor(source.category, 'main') 
        : getCategoryColor(source.category, 'secondary') + '80'; // Ajouter transparence
  };

  return (
    <>
      {/* Arrière-plan avec lignes de niveaux */}
      {levelTitles.map((title, i) => (
        <g key={`level-${i}`}>
          <line
            x1={title.x}
            y1={30}
            x2={title.x}
            y2={480}
            stroke="#334155"
            strokeOpacity={0.15}
            strokeWidth={1}
            strokeDasharray="3,3"
          />
          <text
            x={title.x}
            y={title.y}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={10}
            fontWeight="medium"
          >
            {title.label}
          </text>
        </g>
      ))}
      
      {/* Liens */}
      {renderedLinks.map((link, i) => {
        const sourceNode = renderedNodes.find(n => n.id === link.source);
        const targetNode = renderedNodes.find(n => n.id === link.target);
        const sourceCategory = sourceNode?.category || 'income';
        
        // Vérifier si ce lien doit être surligné
        const isHighlighted = hoveredNode === link.source || 
                          hoveredNode === link.target || 
                          hoveredLink === link;
                          
        const isFiltered = isHighlightedLink(link);
        
        // Calculer le gradient basé sur les catégories source et cible
        const gradientId = `gradient-${link.source}-${link.target}`;
        
        return (
          <g key={`link-${i}`} className="link-group">
            {/* Définition du gradient pour ce lien spécifique */}
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={categoryColors[sourceCategory].main} />
                <stop offset="100%" stopColor={categoryColors[targetNode?.category || 'expense'].main} />
              </linearGradient>
            </defs>
            
            {/* Dessin du lien */}
            <path
              d={link.path || ''}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeOpacity={isHighlighted ? 0.9 : isFiltered ? 0.7 : 0.25}
              strokeWidth={link.width}
              strokeLinecap="round"
              onMouseEnter={() => setHoveredLink(link)}
              onMouseLeave={() => setHoveredLink(null)}
              className="transition-all duration-300 ease-in-out"
              style={{ 
                filter: isHighlighted ? 'drop-shadow(0 0 4px ' + getCategoryColor(sourceCategory, 'main') + ')' : 'saturate(1.2)'
              }}
            />
          </g>
        );
      })}
      
      {/* Nœuds */}
      {renderedNodes.map((node, i) => {
        const isHighlighted = hoveredNode === node.id;
        const isFiltered = isHighlightedNode(node);
        
        // Récupérer la transition pour ce nœud
        const transition = nodeTransitions[node.id] || { opacity: isFiltered ? 0.8 : 0.4, filter: 'brightness(1)' };
        
        return (
          <g 
            key={`node-${i}`}
            onMouseEnter={() => handleNodeHover(node.id)}
            onMouseLeave={() => handleNodeHover(null)}
            onClick={() => setHighlightedCategory(
              highlightedCategory === node.category ? null : node.category
            )}
            style={{ cursor: 'pointer' }}
          >
            {/* Rectangle principal */}
            <rect
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              fill={getNodeFillColor(node)}
              rx={4}
              ry={4}
              className="transition-all duration-300 ease-in-out"
              style={{ 
                stroke: isHighlighted ? '#ffffff' : 'none',
                strokeWidth: 1.5,
                opacity: transition.opacity,
                filter: isHighlighted ? `drop-shadow(0 0 8px ${getCategoryColor(node.category, 'main')})` : transition.filter
              }}
            />
            
            {/* Étiquette pour les nœuds suffisamment grands */}
            {node.height > 30 && isFiltered && (
              <foreignObject
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
              >
                <div
                  className="h-full flex flex-col justify-center items-center px-0.5 font-bold text-center break-words overflow-hidden whitespace-nowrap transition-opacity duration-300"
                  style={{
                    color: categoryColors[node.category].text,
                    fontSize: node.height > 60 ? '10px' : '8px',
                    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    opacity: transition.opacity
                  }}
                >
                  {node.name}
                </div>
              </foreignObject>
            )}
          </g>
        );
      })}
      
      {/* Tooltip pour le lien survolé */}
      {hoveredLink && hoveredLink.sourceX !== undefined && hoveredLink.targetX !== undefined && 
       hoveredLink.sourceY !== undefined && hoveredLink.targetY !== undefined && (
        <foreignObject
          x={(hoveredLink.sourceX + hoveredLink.targetX) / 2 - 100}
          y={(hoveredLink.sourceY + hoveredLink.targetY) / 2 - 40}
          width={200}
          height={80}
          style={{ overflow: 'visible' }}
        >
          <div
            className="bg-black/85 p-2 rounded border border-white/10 text-white text-xs leading-relaxed max-w-[200px] pointer-events-none"
            style={{
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}
          >
            <div className="font-bold mb-1">
              {hoveredLink.sourceNode?.name} → {hoveredLink.targetNode?.name}
            </div>
            <div 
              className="text-sm font-bold" 
              style={{ 
                color: categoryColors[hoveredLink.sourceNode?.category || 'income'].main 
              }}
            >
              {new Intl.NumberFormat('fr-FR', { 
                style: 'currency', 
                currency: 'EUR',
                maximumFractionDigits: 0 
              }).format(hoveredLink.value)}
            </div>
            <div className="text-[10px] opacity-80">
              {Math.round(hoveredLink.value / (hoveredLink.sourceNode?.value || 1) * 100)}% du total
            </div>
          </div>
        </foreignObject>
      )}
      
      {/* Tooltip pour un nœud survolé */}
      {hoveredNode && !hoveredLink && (() => {
        const node = data.nodes.find(n => n.id === hoveredNode);
        if (!node) return null;
        
        // Calculer les liens entrants et sortants
        const incomingLinks = data.links.filter(link => link.target === node.id);
        const outgoingLinks = data.links.filter(link => link.source === node.id);
        
        // Calculer les totaux
        const totalIncoming = incomingLinks.reduce((sum, link) => sum + link.value, 0);
        const totalOutgoing = outgoingLinks.reduce((sum, link) => sum + link.value, 0);
        
        return (
          <foreignObject
            x={node.x + node.width + 5}
            y={node.y}
            width={220}
            height={Math.max(120, 60 + (incomingLinks.length + outgoingLinks.length) * 12)}
            style={{ overflow: 'visible' }}
          >
            <div
              className="bg-black/85 p-3 rounded border border-white/10 text-white text-xs leading-relaxed max-w-[220px] pointer-events-none"
              style={{
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
              }}
            >
              <div 
                className="font-bold mb-1 text-sm"
                style={{ 
                  color: categoryColors[node.category].main
                }}
              >
                {node.name}
              </div>
              
              <div className="text-sm font-bold mb-1.5">
                {new Intl.NumberFormat('fr-FR', { 
                  style: 'currency', 
                  currency: 'EUR',
                  maximumFractionDigits: 0 
                }).format(node.value)}
              </div>
              
              {incomingLinks.length > 0 && (
                <div>
                  <div style={{ 
                    fontSize: '10px', 
                    opacity: 0.8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginTop: '4px'
                  }}>
                    Entrées:
                  </div>
                  {incomingLinks.slice(0, 3).map((link, i) => {
                    const sourceNode = data.nodes.find(n => n.id === link.source);
                    return (
                      <div key={i} style={{ fontSize: '10px', marginLeft: '4px' }}>
                        <span style={{ opacity: 0.7 }}>{sourceNode?.name}:</span> {new Intl.NumberFormat('fr-FR', { 
                          style: 'currency', 
                          currency: 'EUR',
                          maximumFractionDigits: 0 
                        }).format(link.value)}
                      </div>
                    );
                  })}
                  {incomingLinks.length > 3 && (
                    <div style={{ fontSize: '10px', opacity: 0.7, marginLeft: '4px' }}>
                      +{incomingLinks.length - 3} autres...
                    </div>
                  )}
                </div>
              )}
              
              {outgoingLinks.length > 0 && (
                <div>
                  <div style={{ 
                    fontSize: '10px', 
                    opacity: 0.8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginTop: '4px'
                  }}>
                    Sorties:
                  </div>
                  {outgoingLinks.slice(0, 3).map((link, i) => {
                    const targetNode = data.nodes.find(n => n.id === link.target);
                    return (
                      <div key={i} style={{ fontSize: '10px', marginLeft: '4px' }}>
                        <span style={{ opacity: 0.7 }}>{targetNode?.name}:</span> {new Intl.NumberFormat('fr-FR', { 
                          style: 'currency', 
                          currency: 'EUR',
                          maximumFractionDigits: 0 
                        }).format(link.value)}
                      </div>
                    );
                  })}
                  {outgoingLinks.length > 3 && (
                    <div style={{ fontSize: '10px', opacity: 0.7, marginLeft: '4px' }}>
                      +{outgoingLinks.length - 3} autres...
                    </div>
                  )}
                </div>
              )}
            </div>
          </foreignObject>
        );
      })()}
    </>
  );
}

export function CashflowSankeyWidget({ widget, transactions: externalTransactions, period: defaultPeriod, transactionStatus: defaultTransactionStatus }: CashflowSankeyWidgetProps) {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>(defaultPeriod || 'month');
  const [transactionStatus, setTransactionStatus] = useState<'pending' | 'completed' | 'all'>(defaultTransactionStatus || 'all');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<SankeyLink | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    nodeCount: number;
    linkCount: number;
    renderTime: number;
  }>({ nodeCount: 0, linkCount: 0, renderTime: 0 });
  
  // Référence au conteneur principal
  const containerRef = useRef<HTMLDivElement>(null);
  
  // État pour le zoom et le panoramique
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
  const [interactionMode, setInteractionMode] = useState<'zoom' | 'pan' | 'select'>('select');
  
  // Référence à l'élément SVG
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Mettre à jour la période quand elle change via les props
  useEffect(() => {
    if (defaultPeriod) {
      setPeriod(defaultPeriod);
    }
  }, [defaultPeriod]);
  
  // Mettre à jour le statut de transaction quand il change via les props
  useEffect(() => {
    if (defaultTransactionStatus) {
      setTransactionStatus(defaultTransactionStatus);
    }
  }, [defaultTransactionStatus]);
  
  // Effet pour logger les changements de statut de transaction
  useEffect(() => {
    console.log("Status de transaction changé:", transactionStatus);
  }, [transactionStatus]);
  
  // Récupérer les données réelles des propriétés
  const { data: realProperties, isLoading: propertiesLoading } = useProperties();
  
  // Récupérer les données de flux financiers réelles au lieu des données simulées
  const { data, isLoading, error } = useQuery<SankeyData>({
    queryKey: ['cashflow', period, transactionStatus, realProperties, externalTransactions ? 'external' : 'api'],
    queryFn: async () => {
      try {
        console.log("Récupération des données pour le diagramme Sankey...");
        console.log("Filtres actuels - Période:", period, "Status:", transactionStatus);
        
        // Si des transactions sont fournies en props, les utiliser directement
        let transactions = [];
        if (externalTransactions && externalTransactions.length > 0) {
          console.log("Utilisation des transactions fournies en props", externalTransactions.length);
          transactions = externalTransactions;
        } else {
          // Sinon, récupérer les transactions de l'API
          console.log("Appel API pour récupérer les transactions");
          const response = await fetch('/api/transactions');
          if (!response.ok) {
            throw new Error('Erreur lors de la récupération des transactions');
          }
          
          const transactionsData = await response.json();
          transactions = Array.isArray(transactionsData) ? transactionsData : 
                        (transactionsData.data || transactionsData.transactions || []);
          console.log(`${transactions.length} transactions récupérées depuis l'API`);
        }
        
        if (!transactions || transactions.length === 0) {
          console.log("Aucune transaction trouvée, utilisation des données par défaut");
        return generateDefaultSankeyData(period);
      }
      
        // Créer une liste de toutes les propriétés uniques
        const propertiesMap = new Map();
        
        // D'abord récupérer les propriétés des transactions
        transactions.forEach((t: any) => {
          if (t.propertyId && t.propertyName) {
            if (!propertiesMap.has(t.propertyId)) {
              propertiesMap.set(t.propertyId, t.propertyName);
            }
          }
        });
        
        // Ensuite utiliser realProperties comme source secondaire si disponible
        if (realProperties && realProperties.length > 0) {
          realProperties.forEach((prop: any) => {
            if (prop.id && prop.name && !propertiesMap.has(prop.id)) {
              propertiesMap.set(prop.id, prop.name);
            }
          });
        }
        
        console.log(`Propriétés trouvées: ${propertiesMap.size}`);
        propertiesMap.forEach((name, id) => {
          console.log(`Propriété ID: ${id}, Nom: ${name}`);
        });
        
        // Filtrer selon les critères de date et de statut
        const currentDate = new Date();
        let startDate = new Date();
        
        if (period === 'month') {
          startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        } else if (period === 'quarter') {
          startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1);
        } else { // year
          startDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1);
        }
        
        const filteredTransactions = transactions.filter((t: any) => {
          // Convertir la date en objet Date si elle ne l'est pas déjà
          const transactionDate = typeof t.date === 'string' ? new Date(t.date) : t.date;
          
          // Vérifier que la date est valide
          if (!(transactionDate instanceof Date) || isNaN(transactionDate.getTime())) {
            console.log(`Transaction ignorée: date invalide`, t);
            return false;
          }
          
          // Appliquer le filtre de date
          const dateMatch = transactionDate >= startDate && transactionDate <= currentDate;
          
          // Normaliser le statut pour la comparaison
          const normalizedStatus = String(t.status || '').toLowerCase();
          const isPending = normalizedStatus === 'pending' || 
                           normalizedStatus.includes('atten') || 
                           normalizedStatus.includes('wait');
          const isCompleted = normalizedStatus === 'completed' || 
                             normalizedStatus.includes('compl') || 
                             normalizedStatus.includes('term');
          
          // Appliquer le filtre de statut
          let statusMatch = true;
          if (transactionStatus === 'pending') {
            statusMatch = isPending;
          } else if (transactionStatus === 'completed') {
            statusMatch = isCompleted;
          }
          
          return dateMatch && statusMatch;
        });
        
        console.log(`Transactions filtrées: ${filteredTransactions.length}`);
        
        // Structure du diagramme Sankey:
        // 1. Propriétés -> Types principaux (revenus, dépenses, crédits)
        // 2. Types principaux -> Catégories
        // 3. Catégories -> Méthodes de paiement
        
        const nodes: SankeyNode[] = [];
        const links: SankeyLink[] = [];
        const nodeMap = new Map<string, SankeyNode>();
        
        // Représentation des types principaux
        const typeNodes = {
          'income': { id: 'income', name: 'Revenus', category: 'income' as const },
          'expense': { id: 'expense', name: 'Dépenses', category: 'expense' as const },
          'credit': { id: 'credit', name: 'Crédits', category: 'credit' as const }
        };
        
        // Totaux par type, propriété, catégorie et méthode de paiement
        const typeTotals: Record<string, number> = { 'income': 0, 'expense': 0, 'credit': 0 };
        const propertyTotals: Record<string, Record<string, number>> = {}; // Property -> Type -> Amount
        const categoryTotals: Record<string, { value: number, type: string }> = {};
        const methodTotals: Record<string, { value: number, category: string }> = {};
        
        // ---- NIVEAU 1: PROPRIÉTÉS ----
        
        // Créer un nœud "sans propriété" pour les transactions sans propriété
        const noPropertyId = 'property_none';
        propertyTotals[noPropertyId] = { 'income': 0, 'expense': 0, 'credit': 0 };
        
        // Premier passage: calculer les montants par propriété et par type
        filteredTransactions.forEach((t: any) => {
          // Vérifier et normaliser l'amount
          let amount = Number(t.amount);
          if (isNaN(amount) || amount === 0) {
            console.log(`Transaction ignorée: montant invalide`, t);
            return;
          }
          
          // Normaliser le type
          let type = t.type;
          if (!type || !['income', 'expense', 'credit'].includes(type)) {
            // Si le type est manquant ou invalide, le déterminer à partir du montant et de la catégorie
            if (t.category && t.category.toLowerCase().includes('crédit') || 
                t.category && t.category.toLowerCase().includes('credit') || 
                t.category && t.category.toLowerCase().includes('prêt') ||
                t.category && t.category.toLowerCase().includes('loan')) {
              type = 'credit';
            } else if (amount > 0) {
              type = 'income';
            } else {
              type = 'expense';
              amount = Math.abs(amount);
            }
            
            console.log(`Type normalisé: ${t.id}, original=${t.type}, nouveau=${type}`);
          } else if (type === 'expense' && amount > 0) {
            // Pour les dépenses, s'assurer que le montant est toujours positif pour le graphique
            amount = Math.abs(amount);
          } else if (type === 'credit' && amount < 0) {
            // Pour les crédits, s'assurer que le montant est toujours positif pour le graphique
            amount = Math.abs(amount);
          }
          
          // Récupérer la propriété
          const propertyId = t.propertyId ? `property_${t.propertyId}` : noPropertyId;
          
          // Initialiser les totaux pour cette propriété si nécessaire
          if (!propertyTotals[propertyId]) {
            propertyTotals[propertyId] = { 'income': 0, 'expense': 0, 'credit': 0 };
          }
          
          // Accumuler les montants par propriété et par type
          propertyTotals[propertyId][type] = (propertyTotals[propertyId][type] || 0) + amount;
          
          // Accumuler les totaux par type
          typeTotals[type] = (typeTotals[type] || 0) + amount;
          
          // Récupérer ou normaliser la catégorie
          const category = t.category || (type === 'income' ? 'Revenus divers' : 
                                        type === 'expense' ? 'Dépenses diverses' : 
                                        'Crédit non catégorisé');
          
          // Récupérer ou normaliser la méthode de paiement
          const method = t.paymentMethod || 'Non spécifié';
          
          // Accumuler pour les catégories
          const categoryId = `category_${category}`;
          if (!categoryTotals[categoryId]) {
            categoryTotals[categoryId] = { value: 0, type };
          }
          categoryTotals[categoryId].value += amount;
          
          // Accumuler pour les méthodes de paiement
          const methodId = `method_${method}_${category}`;
          if (!methodTotals[methodId]) {
            methodTotals[methodId] = { value: 0, category: categoryId };
          }
          methodTotals[methodId].value += amount;
        });
        
        // ---- CRÉER LES NŒUDS ET LIENS ----
        
        // 1. Créer les nœuds de propriété
        Object.entries(propertyTotals).forEach(([propertyId, totals]) => {
          // Calculer le total pour cette propriété (tous types confondus)
          const totalValue = totals.income + totals.expense + totals.credit;
          
          if (totalValue > 0) {
            // Trouver le nom de la propriété
            let propertyName;
            if (propertyId === noPropertyId) {
              propertyName = 'Sans propriété';
            } else {
              const propId = propertyId.replace('property_', '');
              propertyName = propertiesMap.get(Number(propId)) || `Propriété ${propId}`;
            }
            
            const node: SankeyNode = {
              id: propertyId,
              name: propertyName,
              category: 'income', // Couleur "revenus" pour les propriétés
              value: totalValue,
            x: 0,
            y: 0,
            width: 0,
            height: 0
            };
            
            nodes.push(node);
            nodeMap.set(propertyId, node);
            
            // Créer les liens vers les types principaux
            Object.entries(totals).forEach(([type, value]) => {
              if (value > 0) {
                links.push({
                  source: propertyId,
                  target: type,
                  value,
                  path: ''
                });
              }
            });
          }
        });
        
        // 2. Créer les nœuds de types principaux
        Object.values(typeNodes).forEach(typeInfo => {
          const typeId = typeInfo.id;
          const value = typeTotals[typeId] || 0;
          
          if (value > 0) {
            const node: SankeyNode = {
              id: typeId,
              name: typeInfo.name,
              category: typeInfo.category,
              value,
              x: 0,
              y: 0,
              width: 0,
              height: 0
            };
            
            nodes.push(node);
            nodeMap.set(typeId, node);
          }
        });
        
        // 3. Créer les nœuds de catégories
        Object.entries(categoryTotals).forEach(([categoryId, data]) => {
          const value = data.value;
          const type = data.type;
          
          if (value > 0) {
            const categoryName = categoryId.replace('category_', '').charAt(0).toUpperCase() + 
                               categoryId.replace('category_', '').slice(1).replace(/_/g, ' ');
            
            const node: SankeyNode = {
              id: categoryId,
              name: categoryName,
              category: type as 'income' | 'expense' | 'credit',
              value,
              x: 0,
              y: 0,
              width: 0,
              height: 0
            };
            
            nodes.push(node);
            nodeMap.set(categoryId, node);
            
            // Lien entre type et catégorie
            links.push({
              source: type,
              target: categoryId,
              value,
              path: ''
            });
          }
        });
        
        // 4. Créer les nœuds de méthode de paiement
        Object.entries(methodTotals).forEach(([methodId, data]) => {
          const value = data.value;
          const categoryId = data.category;
          
          if (value > 0) {
            const parts = methodId.split('_');
            const method = parts[1]; // Après "method_"
            
            let paymentName;
            switch (method.toLowerCase()) {
              case 'cash': paymentName = 'Espèces'; break;
              case 'bank_transfer': paymentName = 'Virement bancaire'; break;
              case 'credit_card': paymentName = 'Carte de crédit'; break;
              case 'debit_card': paymentName = 'Carte de débit'; break;
              case 'check': paymentName = 'Chèque'; break;
              case 'direct_debit': paymentName = 'Prélèvement'; break;
              case 'paypal': paymentName = 'PayPal'; break;
              case 'stripe': paymentName = 'Stripe'; break;
              case 'non': paymentName = 'Non spécifié'; break;
              default: paymentName = method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, ' ');
            }
            
            const node: SankeyNode = {
              id: methodId,
              name: paymentName,
              category: 'amount',
            value,
            x: 0,
            y: 0,
            width: 0,
            height: 0
            };
            
            nodes.push(node);
            nodeMap.set(methodId, node);
            
            // Lien entre catégorie et méthode de paiement
            links.push({
              source: categoryId,
              target: methodId,
              value,
              path: ''
            });
          }
        });
        
        console.log(`Diagramme Sankey: ${nodes.length} nœuds et ${links.length} liens`);
        
        return {
          nodes,
          links,
          totalIncome: typeTotals.income || 0
        } as SankeyData;
      } catch (error) {
        console.error("Erreur lors de la récupération des données de transactions:", error);
        return generateDefaultSankeyData(period);
      }
    },
    enabled: !propertiesLoading // N'exécuter que si les propriétés sont chargées
  });
  
  // Fonction pour générer des données Sankey par défaut (si aucune propriété)
  const generateDefaultSankeyData = (selectedPeriod: 'month' | 'quarter' | 'year') => {
    // Facteur multiplicateur selon la période
    const multiplier = selectedPeriod === 'month' ? 1 : selectedPeriod === 'quarter' ? 3 : 12;
    
    // Nœuds par défaut
    const nodes: Omit<SankeyNode, 'x' | 'y' | 'width' | 'height'>[] = [
      { id: 'salary', name: 'Salaires', category: 'income', value: 8500 * multiplier },
      { id: 'rental', name: 'Loyers', category: 'income', value: 3200 * multiplier },
      { id: 'dividends', name: 'Dividendes', category: 'income', value: 1500 * multiplier },
      { id: 'business', name: 'Entreprise', category: 'income', value: 4500 * multiplier },
      
      { id: 'stocks', name: 'Actions', category: 'credit', value: 2000 * multiplier },
      { id: 'realestate', name: 'Immobilier', category: 'credit', value: 3500 * multiplier },
      { id: 'crypto', name: 'Crypto', category: 'credit', value: 1000 * multiplier },
      
      { id: 'housing', name: 'Logement', category: 'expense', value: 2100 * multiplier },
      { id: 'transport', name: 'Transport', category: 'expense', value: 800 * multiplier },
      { id: 'food', name: 'Alimentation', category: 'expense', value: 1200 * multiplier },
      { id: 'leisure', name: 'Loisirs', category: 'expense', value: 900 * multiplier },
      { id: 'health', name: 'Santé', category: 'expense', value: 600 * multiplier },
      { id: 'taxes', name: 'Impôts', category: 'expense', value: 3500 * multiplier },
      { id: 'misc', name: 'Divers', category: 'expense', value: 1100 * multiplier },
    ];
    
    // Liens par défaut - remplacer les liens vers 'savings' par des liens vers d'autres catégories
    const links: SankeyLink[] = [
      { source: 'salary', target: 'stocks', value: 1500 * multiplier, path: '' },
      { source: 'salary', target: 'housing', value: 1800 * multiplier, path: '' },
      { source: 'salary', target: 'transport', value: 600 * multiplier, path: '' },
      { source: 'salary', target: 'food', value: 1000 * multiplier, path: '' },
      { source: 'salary', target: 'taxes', value: 2800 * multiplier, path: '' },
      { source: 'salary', target: 'misc', value: 800 * multiplier, path: '' },
      
      { source: 'rental', target: 'realestate', value: 1200 * multiplier, path: '' },
      { source: 'rental', target: 'housing', value: 1000 * multiplier, path: '' },
      { source: 'rental', target: 'taxes', value: 700 * multiplier, path: '' },
      { source: 'rental', target: 'misc', value: 300 * multiplier, path: '' },
      
      { source: 'dividends', target: 'crypto', value: 500 * multiplier, path: '' },
      { source: 'dividends', target: 'leisure', value: 400 * multiplier, path: '' },
      { source: 'dividends', target: 'health', value: 400 * multiplier, path: '' },
      { source: 'dividends', target: 'stocks', value: 200 * multiplier, path: '' },
      
      { source: 'business', target: 'stocks', value: 500 * multiplier, path: '' },
      { source: 'business', target: 'realestate', value: 2300 * multiplier, path: '' },
      { source: 'business', target: 'taxes', value: 1000 * multiplier, path: '' },
      { source: 'business', target: 'misc', value: 700 * multiplier, path: '' },
    ];
    
    // Initialiser le layout Sankey sans valeurs x/y (elles seront calculées par computeSankeyLayout)
    const initialSankeyData = { nodes: nodes as SankeyNode[], links };
    
    // Renvoyer un objet vide car nous n'avons pas encore calculé la mise en page
    return initialSankeyData as SankeyData;
  };
  
  // Calculer la mise en page Sankey avec mesure de performance
  const sankeyData = useMemo(() => {
    if (!data || !data.nodes || !data.links) return null;
    
    const startTime = performance.now();
    
    // Limitation intelligente des données pour de meilleures performances
    let optimizedData = data;
    
    // Si trop de nœuds/liens, optimiser les données
    if (data.nodes.length > 100 || data.links.length > 200) {
      // Regrouper les petits nœuds "amount" (montants finaux) par catégorie et date
      const groupedAmounts: Record<string, SankeyNode> = {};
      
      const nodesToKeep = data.nodes.filter(node => {
        // Garder tous les nœuds qui ne sont pas des montants individuels
        if (node.category !== 'amount') return true;
        
        // Pour les montants, les regrouper par mois
        if (node.date) {
          const date = new Date(node.date);
          const monthYear = `${date.getMonth()}-${date.getFullYear()}`;
          const parentNode = data.links.find(link => link.target === node.id)?.source || '';
          const groupKey = `amount_${parentNode}_${monthYear}`;
          
          if (!groupedAmounts[groupKey]) {
            groupedAmounts[groupKey] = {
              ...node,
              id: groupKey,
              name: `Transactions ${date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`,
              value: node.value
            };
          } else {
            groupedAmounts[groupKey].value += node.value;
          }
          return false; // Exclure ce nœud individuel
        }
        
        return true; // Garder les autres nœuds amount sans date
      });
      
      // Ajouter les nœuds groupés
      const groupedNodes = [...nodesToKeep, ...Object.values(groupedAmounts)];
      
      // Mettre à jour les liens pour pointer vers les groupes
      const updatedLinks = data.links.map(link => {
        const targetNode = data.nodes.find(n => n.id === link.target);
        
        // Si c'est un lien vers un nœud de montant qui a été groupé
        if (targetNode?.category === 'amount' && targetNode?.date) {
          const date = new Date(targetNode.date);
          const monthYear = `${date.getMonth()}-${date.getFullYear()}`;
          const groupKey = `amount_${link.source}_${monthYear}`;
          
          if (groupedAmounts[groupKey]) {
            return { ...link, target: groupKey };
          }
        }
        
        return link;
      }).filter(link => {
        // Garder seulement les liens qui pointent vers des nœuds existants
        return groupedNodes.some(n => n.id === link.source) && 
               groupedNodes.some(n => n.id === link.target);
      });
      
      optimizedData = { 
        ...data, 
        nodes: groupedNodes,
        links: updatedLinks
      };
    }
    
    // Utiliser l'espace disponible de manière optimale
    const result = computeSankeyLayout(optimizedData, 800, 440);
    
    const endTime = performance.now();
    setPerformanceMetrics({
      nodeCount: result.nodes.length,
      linkCount: result.links.length,
      renderTime: Math.round(endTime - startTime)
    });
    
    return result;
  }, [data]);
  
  // Fonction pour calculer les totaux par catégorie
  const calculateCategoryTotals = useCallback((nodes: SankeyNode[]) => {
    const totals = {
      income: 0,
      expense: 0, 
      credit: 0,
      amount: 0
    };
    
    // Parcourir tous les nœuds et accumuler les valeurs par catégorie
    nodes.forEach(node => {
      // Normaliser la catégorie
      let categoryKey: keyof typeof totals;
      
      // Vérifier si c'est un ancien nœud de type 'investment'
      if (node.category === 'investment' as any) {
        categoryKey = 'credit';
      } else if (node.category === 'savings' as any) {
        // Ignorer les nœuds "savings" qui ne sont plus utilisés
        return;
      } else {
        categoryKey = node.category as keyof typeof totals;
      }
      
      // Vérifier si la catégorie existe dans nos totaux
      if (typeof totals[categoryKey] === 'number') {
        totals[categoryKey] += node.value;
      }
    });
    
    return totals;
  }, []);
  
  // Calculer les totaux une seule fois pour l'affichage
  const categoryTotals = useMemo(() => {
    return data ? calculateCategoryTotals(data.nodes) : {
      income: 0,
      expense: 0,
      credit: 0,
      amount: 0
    };
  }, [data, calculateCategoryTotals]);

  // Fonction pour obtenir la couleur d'un nœud à partir de sa catégorie
  const getNodeColor = useCallback((category: string) => {
    return getCategoryColor(category, 'main');
  }, []);

  // Fonction pour obtenir la couleur d'un lien à partir des nœuds source et cible
  const getLinkColor = useCallback((link: SankeyLink, nodes: SankeyNode[]) => {
    const sourceNode = nodes.find(n => n.id === link.source);
    return sourceNode ? getCategoryColor(sourceNode.category, 'main') : getCategoryColor('amount', 'main');
  }, []);

  // Gestionnaires d'événements pour le zoom et le panoramique
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };
  
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };
  
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (interactionMode === 'pan') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [interactionMode, pan]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging && dragStart) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Limiter le panoramique pour éviter de sortir trop loin
      const boundedX = Math.max(Math.min(newX, 300), -300);
      const boundedY = Math.max(Math.min(newY, 200), -200);
      
      setPan({ x: boundedX, y: boundedY });
    }
  }, [isDragging, dragStart]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Transformer la matrice pour le zoom et le panoramique
  const transform = useMemo(() => {
    return `translate(${pan.x}, ${pan.y}) scale(${zoom})`;
  }, [zoom, pan]);
  
  // Réinitialiser le zoom et le panoramique
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  
  // Mettre à jour le style du curseur en fonction du mode d'interaction
  const svgCursor = useMemo(() => {
    if (interactionMode === 'pan') return 'cursor-grab';
    if (interactionMode === 'zoom') return 'cursor-zoom-in';
    return 'cursor-default';
  }, [interactionMode]);
  
  // Ajouter des gestionnaires d'événements pour le document pour le relâchement de la souris
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };
    
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);

  // Empêcher le défilement de la page lorsque la souris est sur le graphique
  useEffect(() => {
    // Empêcher tout défilement de la page sur ce composant
    const preventScrollOnBody = (e: Event) => {
      if ((e.target as HTMLElement)?.closest('.chart-container')) {
        e.preventDefault();
        return false;
      }
    };
    
    // Capturer les événements au niveau document avec capture
    document.addEventListener('wheel', preventScrollOnBody, { passive: false, capture: true });
    
    return () => {
      document.removeEventListener('wheel', preventScrollOnBody, { capture: true });
    };
  }, []);
  
  // Ajouter/retirer une classe au body quand la souris est sur le graphique
  useEffect(() => {
    const chartContainer = containerRef.current?.querySelector('.chart-container');
    
    if (!chartContainer) return;
    
    const handleMouseEnter = () => {
      document.body.classList.add('sankeyHover');
    };
    
    const handleMouseLeave = () => {
      document.body.classList.remove('sankeyHover');
    };
    
    chartContainer.addEventListener('mouseenter', handleMouseEnter);
    chartContainer.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      chartContainer.removeEventListener('mouseenter', handleMouseEnter);
      chartContainer.removeEventListener('mouseleave', handleMouseLeave);
      // S'assurer que la classe est retirée lors du démontage du composant
      document.body.classList.remove('sankeyHover');
    };
  }, [sankeyData]);

  // Afficher les statistiques
  const statCards = useMemo(() => {
    // Statistiques des nœuds filtrés
    let totalIncome = 0;
    let totalExpense = 0;
    let totalCredit = 0;
    let transactionCount = 0;
    
    if (sankeyData?.nodes) {
      // Parcourir les nœuds de type principal pour des stats précises
      sankeyData.nodes.forEach(node => {
        if (node.id === 'income') totalIncome = node.value;
        if (node.id === 'expense') totalExpense = node.value;
        if (node.id === 'credit') totalCredit = node.value;
      });
      
      // Compter les transactions (nœuds de méthode)
      transactionCount = sankeyData.nodes.filter(n => n.id.startsWith('method_')).length;
    }

  return (
      <div className="grid grid-cols-4 gap-2 mb-4">
        <StatCard 
          title="Revenus" 
          value={totalIncome} 
          color={getCategoryColor('income', 'main')} 
        />
        <StatCard 
          title="Dépenses" 
          value={totalExpense} 
          color={getCategoryColor('expense', 'main')} 
        />
        <StatCard 
          title="Crédits" 
          value={totalCredit} 
          color={getCategoryColor('credit', 'main')} 
        />
        <StatCard 
          title="Transactions" 
          value={transactionCount} 
          isCount={true}
          color={getCategoryColor('amount', 'main')} 
        />
      </div>
    );
  }, [sankeyData]);

  return (
    <Card className="w-full overflow-hidden border-blue-200 dark:border-blue-900" ref={containerRef}>
      <style jsx global>{`
        body.sankeyHover {
          overflow: hidden !important;
          height: 100vh;
        }
        .chart-container {
          overscroll-behavior: contain;
          touch-action: none;
        }
      `}</style>
      <CardHeader className="bg-blue-50 dark:bg-blue-950/20 rounded-t-xl">
        <CardTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-400">
          <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
            <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
          Flux Financiers
          <Badge 
            variant="outline" 
            className="ml-2 border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400"
          >
            {period === 'month' ? 'Mois' : period === 'quarter' ? 'Trimestre' : 'Année'}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <div className="p-4 bg-[#0D1117]">
        {isLoading ? (
          <div className="flex items-center justify-center h-80">
            <div className="h-16 w-16 rounded-full border-t-2 border-b-2 border-[#05FFA1] animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-neutral-400">
            Une erreur est survenue lors du chargement des données.
          </div>
        ) : sankeyData ? (
          <div>
            <StatCards sankeyData={sankeyData} />
            
            <div className="h-[480px] relative bg-[#0D1117] rounded-lg overflow-hidden border border-[#1E2C3A]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#09151D]/80 to-[#071D29]/95"></div>
              <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
              
              {/* Contrôles d'interaction */}
              <div className="absolute left-2 top-2 z-20 flex flex-col gap-1 bg-[#1A2533]/80 backdrop-blur-sm rounded-md p-1.5 border border-[#2A3F59]/50">
                <button 
                  onClick={() => setInteractionMode('select')} 
                  className={`p-1.5 rounded-md hover:bg-[#243247]/80 transition-colors ${interactionMode === 'select' ? 'bg-[#2A3F59]' : ''}`}
                  title="Mode sélection"
                >
                  <MousePointer size={16} className="text-[#05FFA1]" />
                </button>
                <button 
                  onClick={() => setInteractionMode('pan')} 
                  className={`p-1.5 rounded-md hover:bg-[#243247]/80 transition-colors ${interactionMode === 'pan' ? 'bg-[#2A3F59]' : ''}`}
                  title="Mode panoramique"
                >
                  <Move size={16} className="text-[#05FFA1]" />
                </button>
                <button 
                  onClick={handleZoomIn} 
                  className="p-1.5 rounded-md hover:bg-[#243247]/80 transition-colors"
                  title="Zoom avant"
                >
                  <ZoomIn size={16} className="text-[#05FFA1]" />
                </button>
                <button 
                  onClick={handleZoomOut} 
                  className="p-1.5 rounded-md hover:bg-[#243247]/80 transition-colors"
                  title="Zoom arrière"
                >
                  <ZoomOut size={16} className="text-[#05FFA1]" />
                </button>
                <button 
                  onClick={resetView} 
                  className="p-1.5 rounded-md hover:bg-[#243247]/80 transition-colors text-xs text-[#05FFA1] flex items-center justify-center"
                  title="Réinitialiser la vue"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 2V8H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C15.3019 3 18.1885 4.78311 19.7545 7.42909" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              
              <div className="absolute top-2 right-2 z-10 bg-black/30 px-2 py-1 rounded text-xs text-neutral-400 backdrop-blur-sm">
                <div className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M12 8V12L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {period === 'month' ? 'Données mensuelles' : period === 'quarter' ? 'Données trimestrielles' : 'Données annuelles'}
                </div>
              </div>
              
              <div 
                className="chart-container w-full h-full absolute inset-0 overflow-hidden overscroll-none"
                onWheel={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  if (e.deltaY < 0) {
                    setZoom(prev => Math.min(prev + 0.1, 3));
                  } else {
                    setZoom(prev => Math.max(prev - 0.1, 0.5));
                  }
                  
                  return false;
                }}
              >
              <svg
                ref={svgRef}
                width="100%"
                height="480"
                viewBox="0 0 800 480"
                className={`relative z-0 ${svgCursor} ${isDragging ? 'cursor-grabbing' : ''}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                  style={{ touchAction: 'none', overflow: 'hidden' }}
              >
                <g transform={transform}>
                  <SankeyRender
                    data={sankeyData}
                    hoveredNode={hoveredNode}
                    setHoveredNode={interactionMode === 'select' ? setHoveredNode : () => {}}
                    hoveredLink={hoveredLink}
                    setHoveredLink={interactionMode === 'select' ? setHoveredLink : () => {}}
                  />
                </g>
              </svg>
              </div>
              
              {/* Indicateur de zoom */}
              <div className="absolute left-2 bottom-2 z-10 bg-black/30 px-2 py-1 rounded text-xs text-neutral-400 backdrop-blur-sm">
                <div className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M11 8V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 11H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Zoom: {Math.round(zoom * 100)}%
                  </div>
                  </div>
              
              <div className="absolute left-0 right-0 bottom-10 z-10">
                <SankeyLegend />
                  </div>
              
              <div className="absolute right-2 bottom-2 z-10 text-[10px] text-neutral-500 mr-2">
                <div className="flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 16V16.01M12 8V12M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Cliquez sur une catégorie pour filtrer</span>
                  </div>
              </div>
              
              {/* Indicateur de performance */}
              <div className="absolute left-12 bottom-2 z-10 bg-black/30 px-2 py-1 rounded text-xs text-neutral-400 backdrop-blur-sm ml-24">
                <div className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 9V13L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Nœuds: {performanceMetrics.nodeCount} | Liens: {performanceMetrics.linkCount} | Rendu: {performanceMetrics.renderTime}ms</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-80 text-neutral-400">
            Aucune donnée disponible
          </div>
        )}
      </div>
    </Card>
  );
}

// Composant StatCard à ajouter au début du fichier
interface StatCardProps {
  title: string;
  value: number;
  color: string;
  isCount?: boolean;
}

function StatCard({ title, value, color, isCount = false }: StatCardProps) {
  return (
    <div 
      className="rounded-md p-3 bg-[#11161F] border border-[#1E2C3A]/70 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
      style={{ boxShadow: `0 4px 10px ${color}15, 0 0 0 1px ${color}33` }}
    >
      <div className="text-xs uppercase tracking-wider text-neutral-400 mb-1 font-medium">{title}</div>
      <div className="text-xl font-bold" style={{ color }}>
        {isCount ? value : new Intl.NumberFormat('fr-FR', { 
          style: 'currency', 
          currency: 'EUR',
          maximumFractionDigits: 0,
          notation: value > 100000 ? 'compact' : 'standard'
        }).format(value)}
      </div>
    </div>
  );
} 

// Ajout d'un composant qui utilise un grid pour les cartes statistiques
const StatCards = ({ sankeyData }: { sankeyData: SankeyData }) => {
  // Statistiques des nœuds filtrés
  let totalIncome = 0;
  let totalExpense = 0;
  let totalCredit = 0;
  let transactionCount = 0;
  
  if (sankeyData?.nodes) {
    // Parcourir les nœuds de type principal pour des stats précises
    sankeyData.nodes.forEach((node: SankeyNode) => {
      if (node.id === 'income') totalIncome = node.value;
      if (node.id === 'expense') totalExpense = node.value;
      if (node.id === 'credit') totalCredit = node.value;
    });
    
    // Compter les transactions (nœuds de méthode)
    transactionCount = sankeyData.nodes.filter((n: SankeyNode) => n.id.startsWith('method_')).length;
  }
  
  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      <StatCard 
        title="Revenus" 
        value={totalIncome} 
        color={getCategoryColor('income', 'main')} 
      />
      <StatCard 
        title="Dépenses" 
        value={totalExpense} 
        color={getCategoryColor('expense', 'main')} 
      />
      <StatCard 
        title="Crédits" 
        value={totalCredit} 
        color={getCategoryColor('credit', 'main')} 
      />
      <StatCard 
        title="Transactions" 
        value={transactionCount} 
        isCount={true}
        color={getCategoryColor('amount', 'main')} 
      />
    </div>
  );
}; 