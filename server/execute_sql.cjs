// Script pour exécuter le fichier SQL de configuration du stockage
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration explicite de la connexion PostgreSQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'immobilier',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

console.log('Configuration de connexion:', {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  password: '********' // Ne pas afficher le mot de passe
});

// Créer une connexion à la base de données
const pool = new Pool(dbConfig);

// Chemin vers le fichier SQL
const sqlFilePath = path.join(__dirname, 'migrations', 'setup_all_storage_management.sql');

// Lire le contenu du fichier SQL
console.log(`Lecture du fichier SQL: ${sqlFilePath}`);
const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

// Vérifier la connexion à la base de données
console.log('Vérification de la connexion...');
pool.query('SELECT NOW() as current_time')
  .then(res => {
    console.log(`Connexion établie à ${res.rows[0].current_time}`);
    
    // Exécuter le script SQL
    console.log('Exécution du script SQL...');
    return pool.query(sqlScript);
  })
  .then(res => {
    console.log('Configuration du système de gestion de stockage terminée avec succès');
    pool.end();
  })
  .catch(err => {
    console.error('Erreur lors de la configuration :', err);
    pool.end();
  }); 