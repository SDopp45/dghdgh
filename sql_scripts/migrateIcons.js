/**
 * Script de migration pour déplacer les icônes de liens vers le nouveau dossier d'images
 * et mettre à jour les références dans la base de données.
 */

const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { db } = require('../dist/db/index');
const { linkProfiles, links } = require('../dist/db/schema');
const { eq, like } = require('drizzle-orm');

const copyFileAsync = promisify(fs.copyFile);
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);

async function migrateIconsToImages() {
  try {
    console.log('Début de la migration des icônes vers des images...');
    
    // 1. Créer le répertoire de destination s'il n'existe pas
    const sourceDir = path.join(process.cwd(), 'uploads', 'link-icons');
    const destDir = path.join(process.cwd(), 'uploads', 'link-images');
    
    if (!await existsAsync(sourceDir)) {
      console.log('Le dossier source n\'existe pas, aucune migration nécessaire');
      return;
    }
    
    if (!await existsAsync(destDir)) {
      await mkdirAsync(destDir, { recursive: true });
      console.log(`Répertoire créé: ${destDir}`);
    }
    
    // 2. Récupérer tous les liens avec des icônes
    const linksWithIcons = await db.query.links.findMany({
      where: like(links.icon, '/uploads/link-icons/%')
    });
    
    console.log(`${linksWithIcons.length} liens avec des icônes trouvés`);
    
    // 3. Pour chaque lien, copier le fichier et mettre à jour la référence
    for (const link of linksWithIcons) {
      // Extraire le nom de fichier de l'URL de l'icône
      const iconPath = link.icon.replace(/^\//, '');
      const fileName = path.basename(iconPath);
      
      // Construire les chemins complets
      const sourcePath = path.join(process.cwd(), iconPath);
      const newFileName = fileName.replace('link-icon', 'link-image');
      const destPath = path.join(destDir, newFileName);
      
      try {
        // Copier le fichier
        if (await existsAsync(sourcePath)) {
          await copyFileAsync(sourcePath, destPath);
          console.log(`Fichier copié: ${sourcePath} -> ${destPath}`);
        } else {
          console.log(`Fichier source introuvable: ${sourcePath}`);
          continue;
        }
        
        // Mettre à jour la référence dans la base de données
        const newIconUrl = `/uploads/link-images/${newFileName}`;
        await db.update(links)
          .set({ icon: newIconUrl })
          .where(eq(links.id, link.id));
        
        console.log(`Référence mise à jour pour le lien ID ${link.id}: ${newIconUrl}`);
      } catch (err) {
        console.error(`Erreur lors de la migration du fichier ${fileName}:`, err);
      }
    }
    
    console.log('Migration terminée avec succès!');
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
  }
}

// Exécuter la migration
migrateIconsToImages()
  .then(() => {
    console.log('Script de migration terminé');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  }); 