import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

// Note: Ce fichier n'a pas besoin d'utiliser les schémas clients car il gère uniquement des fichiers statiques
// et ne fait pas d'accès à la base de données

const router = express.Router();

// Route pour servir les motifs SVG avec la couleur spécifiée
router.get('/patterns/:patternName.svg', (req: Request, res: Response) => {
  try {
    const { patternName } = req.params;
    const color = req.query.color ? decodeURIComponent(req.query.color as string) : '#000000';
    const opacity = parseFloat(req.query.opacity as string);
    const size = parseInt(req.query.size as string) || 20;
    
    // Validation des paramètres avec une valeur d'opacité très faible possible
    const validatedOpacity = !isNaN(opacity) ? Math.min(Math.max(opacity, 0.01), 1) : 0.2;
    const validatedSize = Math.min(Math.max(size, 10), 100);
    
    // Log détaillé pour débogage
    logger.info(`Serving pattern ${patternName} with color=${color}, opacity=${validatedOpacity}, size=${validatedSize}`);
    
    // Chemin du fichier SVG
    const filePath = path.join(process.cwd(), 'client', 'public', 'patterns', `${patternName}.svg`);
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      logger.error(`Pattern file not found: ${filePath}`);
      return res.status(404).send('Pattern not found');
    }
    
    // Lire le contenu du fichier SVG
    let svgContent = fs.readFileSync(filePath, 'utf8');
    
    // Remplacer 'currentColor' par la couleur spécifiée
    svgContent = svgContent.replace(/currentColor/g, color);
    
    // Simplification: remplacer directement toutes les opacités dans le SVG
    svgContent = svgContent.replace(/opacity="([^"]*)"/g, `opacity="${validatedOpacity}"`);
    
    // Garantir que tous les éléments avec fill ou stroke ont une opacité
    const elementRegex = /<(circle|rect|path|polygon|line|ellipse)([^>]*?)(fill|stroke)="([^"]*?)"([^>]*?)(\/?)>/g;
    svgContent = svgContent.replace(elementRegex, (match, tag, before, attr, value, after, endSlash) => {
      if (before.includes('opacity=') || after.includes('opacity=')) {
        return match;
      }
      return `<${tag}${before}${attr}="${value}"${after} opacity="${validatedOpacity}"${endSlash}>`;
    });
    
    // Mettre à jour la taille du SVG si différente de la valeur par défaut
    if (validatedSize !== 20) {
      // Mettre à jour les attributs width et height
      svgContent = svgContent.replace(/<svg width="20" height="20"/g, `<svg width="${validatedSize}" height="${validatedSize}"`);
      
      // Adapter les coordonnées des formes proportionnellement
      const scale = validatedSize / 20;
      if (scale !== 1) {
        // Transformer les attributs cx, cy, r pour les cercles
        svgContent = svgContent.replace(/cx="(\d+(\.\d+)?)"/g, (match, value) => 
          `cx="${(parseFloat(value) * scale).toFixed(1)}"`);
        svgContent = svgContent.replace(/cy="(\d+(\.\d+)?)"/g, (match, value) => 
          `cy="${(parseFloat(value) * scale).toFixed(1)}"`);
        svgContent = svgContent.replace(/r="(\d+(\.\d+)?)"/g, (match, value) => 
          `r="${(parseFloat(value) * scale).toFixed(1)}"`);
        
        // Transformer les attributs x, y, width, height pour les rectangles
        svgContent = svgContent.replace(/x="(\d+(\.\d+)?)"/g, (match, value) => 
          `x="${(parseFloat(value) * scale).toFixed(1)}"`);
        svgContent = svgContent.replace(/y="(\d+(\.\d+)?)"/g, (match, value) => 
          `y="${(parseFloat(value) * scale).toFixed(1)}"`);
        svgContent = svgContent.replace(/width="(\d+(\.\d+)?)"/g, (match, value) => 
          `width="${(parseFloat(value) * scale).toFixed(1)}"`);
        svgContent = svgContent.replace(/height="(\d+(\.\d+)?)"/g, (match, value) => 
          `height="${(parseFloat(value) * scale).toFixed(1)}"`);
        
        // Ajuster les paths - plus complexe, nécessite un parsing complet
        svgContent = svgContent.replace(/d="([^"]*)"/g, (match, pathData) => {
          // Diviser le chemin en commandes et coordonnées
          const transformedPath = pathData.replace(/(-?\d+(\.\d+)?)/g, (numMatch: string) => {
            return (parseFloat(numMatch) * scale).toFixed(1);
          });
          return `d="${transformedPath}"`;
        });
        
        // Ajuster les épaisseurs de trait
        svgContent = svgContent.replace(/stroke-width="(\d+(\.\d+)?)"/g, (match, value) => 
          `stroke-width="${(parseFloat(value) * scale).toFixed(1)}"`);
      }
    }
    
    // Définir les en-têtes pour indiquer que c'est un fichier SVG
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache'); // Désactiver le cache pendant les tests
    
    // Envoyer le contenu SVG modifié
    res.send(svgContent);
    
  } catch (error) {
    logger.error('Error serving SVG pattern:', error);
    res.status(500).send('Error serving SVG pattern');
  }
});

export default router; 