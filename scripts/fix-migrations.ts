import fs from 'fs/promises';
import path from 'path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');
const LEGACY_DIR = path.join(MIGRATIONS_DIR, 'legacy');

async function fixMigrations() {
  try {
    // Créer le dossier legacy
    await fs.mkdir(LEGACY_DIR, { recursive: true });

    // Lire tous les fichiers SQL
    const files = await fs.readdir(MIGRATIONS_DIR);
    const sqlFiles = files.filter(f => f.endsWith('.sql'));

    // Trier les fichiers par date de création
    const fileStats = await Promise.all(
      sqlFiles.map(async (file) => {
        const stats = await fs.stat(path.join(MIGRATIONS_DIR, file));
        return { file, stats };
      })
    );

    fileStats.sort((a, b) => a.stats.birthtimeMs - b.stats.birthtimeMs);

    // Renommer les fichiers avec un format cohérent
    for (let i = 0; i < fileStats.length; i++) {
      const { file } = fileStats[i];
      const oldPath = path.join(MIGRATIONS_DIR, file);
      const newName = `${String(i + 1).padStart(4, '0')}_${file.replace(/^\d+\.?\d*_?/, '')}`;
      const newPath = path.join(MIGRATIONS_DIR, newName);
      const legacyPath = path.join(LEGACY_DIR, file);

      // Déplacer l'ancien fichier vers legacy
      await fs.rename(oldPath, legacyPath);
      console.log(`Déplacé ${file} vers legacy/`);

      // Créer le nouveau fichier avec le contenu mis à jour
      const content = await fs.readFile(legacyPath, 'utf-8');
      const updatedContent = `-- Migration: ${newName}
-- Date: ${new Date().toISOString()}
-- Description: ${file.replace(/^\d+\.?\d*_?/, '').replace('.sql', '')}

${content}`;
      
      await fs.writeFile(newPath, updatedContent);
      console.log(`Créé ${newName}`);
    }

    console.log('Correction des migrations terminée avec succès');
  } catch (error) {
    console.error('Erreur lors de la correction des migrations:', error);
    process.exit(1);
  }
}

fixMigrations(); 