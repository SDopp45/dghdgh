import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { pool } from "./db";
import { setSchemaForUser } from "./middleware/schema";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Ignorer les requêtes API ou uploads
    if (url.startsWith("/api") || url.startsWith("/uploads")) {
      return next();
    }

    // Configurer le schéma SQL pour l'utilisateur
    try {
      const userId = req.user?.id;
      if (userId) {
        await setSchemaForUser(userId);
      } else {
        // Utilisateur non authentifié - schéma public uniquement
        await pool.query('SET search_path TO public');
      }
    } catch (error) {
      console.warn("Erreur lors de la configuration du schéma:", error);
      // Continuer malgré l'erreur
    }

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // Toujours recharger le fichier index.html du disque au cas où il change
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // Redirection vers index.html si le fichier n'existe pas
  app.use("*", (req, res) => {
    // Configurer le schéma SQL avant de servir l'index.html
    try {
      const userId = req.user?.id;
      if (userId) {
        setSchemaForUser(userId).catch(err => {
          console.warn(`Erreur lors de la configuration du schéma: ${err.message}`);
        });
      }
    } catch (error) {
      console.warn("Erreur lors de la configuration du schéma:", error);
    }
    
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
