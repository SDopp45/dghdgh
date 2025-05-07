import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Server } from "http";
import logger from "./utils/logger";

/**
 * Configure le middleware Vite pour le développement
 */
export async function setupVite(app: Express, httpServer: Server) {
  try {
    logger.info("Initialisation du middleware Vite...");
    
    const projectRoot = process.cwd();
    const clientDir = path.resolve(projectRoot, "client");
    const clientSrcDir = path.resolve(clientDir, "src");
    const indexHtml = path.resolve(clientDir, "index.html");
    
    if (!fs.existsSync(indexHtml)) {
      throw new Error(`Le fichier index.html est introuvable: ${indexHtml}`);
    }
    
    logger.info(`Répertoire client: ${clientDir}`);
    logger.info(`Répertoire source client: ${clientSrcDir}`);
    
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
    
    app.use(vite.middlewares);
    
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      
      if (url.startsWith("/api") || url.startsWith("/uploads")) {
        return next();
      }
      
      try {
        let template = fs.readFileSync(indexHtml, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200)
           .set({ "Content-Type": "text/html" })
           .end(template);
      } catch (err: any) {
        const error = err as Error;
        logger.error(`Erreur lors du traitement de la page: ${error.message}`, { error });
        if (vite) {
          vite.ssrFixStacktrace(error);
        }
        next(error);
      }
    });
    
    logger.info("Middleware Vite configuré avec succès");
    return vite;
    
  } catch (err: any) {
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
  
  app.use(express.static(distDir, {
    index: false,
    immutable: true,
    cacheControl: true,
    maxAge: "30d"
  }));
  
  app.use("*", (req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
  
  logger.info(`Serveur de fichiers statiques configuré avec succès: ${distDir}`);
} 