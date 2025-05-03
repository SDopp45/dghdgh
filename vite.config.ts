import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Résolution des chemins absolus
const projectRoot = path.resolve(__dirname);
const clientSrc = path.resolve(projectRoot, "client/src");

export default defineConfig({
  plugins: [react()],
  // Le répertoire racine pour Vite
  root: path.resolve(projectRoot, "client"),
  resolve: {
    alias: {
      // Alias pour résoudre @/xxx -> client/src/xxx
      "@": clientSrc,
      "@db": path.resolve(projectRoot, "db"),
      "@shared": path.resolve(projectRoot, "shared"),
      "@server": path.resolve(projectRoot, "server")
    }
  },
  publicDir: path.resolve(projectRoot, "client/public"),
  build: {
    outDir: path.resolve(projectRoot, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(projectRoot, "client/index.html")
      }
    }
  },
  server: {
    hmr: true,
    port: 5005
  }
});
