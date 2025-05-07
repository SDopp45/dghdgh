import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Server } from "http";
import logger from "./utils/logger";
import { pool } from "./db";
import { setSchemaForUser } from "./middleware/schema";

/**
 * Configure le middleware Vite pour le développement
 */
export async function setupVite(app: Express, httpServer: Server) {
  try {
    logger.info("Initialisation du middleware Vite...");
    
    // Chemins importants
    const projectRoot = process.cwd();
    const clientDir = path.resolve(projectRoot, "client");
    const clientSrcDir = path.resolve(clientDir, "src");
    const indexHtml = path.resolve(clientDir, "index.html");
    
    if (!fs.existsSync(indexHtml)) {
      throw new Error(`Le fichier index.html est introuvable: ${indexHtml}`);
    }
    
    logger.info(`Répertoire client: ${clientDir}`);
    logger.info(`Répertoire source client: ${clientSrcDir}`);
    
    // Création du serveur Vite
    const vite = await createViteServer({
      root: clientDir,
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer
        }
      },
      appType: "spa",
      resolve: {
        alias: [
          { find: '@', replacement: clientSrcDir }
        ]
      }
    });
    
    // Middleware Vite
    app.use(vite.middlewares);
    
    // Route pour servir l'application React (toutes les routes non-API)
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      
      // Ne pas traiter les routes API et uploads
      if (url.startsWith("/api") || url.startsWith("/uploads")) {
        return next();
      }
      
      // Configurer le schéma SQL pour cette requête
      if (req.user?.id) {
        try {
          await setSchemaForUser(req.user.id);
        } catch (error) {
          logger.warn(`Impossible de configurer le schéma pour l'utilisateur ${req.user.id}`, error);
          // Revenir au schéma public pour éviter les problèmes
          await pool.query('SET search_path TO public');
        }
      } else {
        // Utilisateur non authentifié - schéma public uniquement
        await pool.query('SET search_path TO public');
      }
      
      try {
        // Lecture du template HTML
        let template = fs.readFileSync(indexHtml, "utf-8");
        
        // Transformation par Vite
        template = await vite.transformIndexHtml(url, template);
        
        // Envoi de la réponse
        res.status(200)
           .set({ "Content-Type": "text/html" })
           .end(template);
           
      } catch (err) {
        const error = err as Error;
        logger.error(`Erreur lors du traitement de la page: ${error.message}`, { error });
        
        // Correction des stack traces
        if (vite) {
          vite.ssrFixStacktrace(error);
        }
        
        // Passer l'erreur au gestionnaire global
        next(error);
      }
    });
    
    logger.info("Middleware Vite configuré avec succès");
    return vite;
    
  } catch (err) {
    const error = err as Error;
    logger.error(`Échec de la configuration de Vite: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Sert les fichiers statiques en production
 */
export function serveStatic(app: Express) {
  const distDir = path.resolve(process.cwd(), "dist");
  
  if (!fs.existsSync(distDir)) {
    logger.warn(`Le répertoire de build n'existe pas: ${distDir}`);
    return;
  }
  
  // Middleware pour les fichiers statiques
  app.use(express.static(distDir, {
    index: false,
    immutable: true,
    cacheControl: true,
    maxAge: "30d"
  }));
  
  // Toutes les autres routes -> index.html
  app.use("*", (req, res) => {
    // Configurer le schéma SQL pour cette requête finale
    if (req.user?.id) {
      try {
        setSchemaForUser(req.user.id).catch(err => {
          logger.warn(`Erreur lors de la configuration du schéma pour la route statique: ${err.message}`);
        });
      } catch (error) {
        logger.warn(`Impossible de configurer le schéma pour la route statique`, error);
      }
    }
    
    res.sendFile(path.join(distDir, "index.html"));
  });
  
  logger.info(`Serveur de fichiers statiques configuré avec succès: ${distDir}`);
} 