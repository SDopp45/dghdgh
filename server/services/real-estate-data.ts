import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { db } from "@db";
import { scrapedListings } from "@db/schema";
import path from 'path';

const execAsync = promisify(exec);

async function runPythonScraper(params: {
  location: string;
  postalCode?: string;
  propertyType?: string;
}) {
  try {
    const scriptPath = path.join(process.cwd(), 'scraper', 'main.py');
    const { location } = params;

    const { stdout, stderr } = await execAsync(`python3 ${scriptPath}`, {
      env: {
        ...process.env,
        LOCATION: location,
        PROPERTY_TYPE: params.propertyType || '',
        POSTAL_CODE: params.postalCode || ''
      }
    });

    if (stderr) {
      console.error('Python script error:', stderr);
      throw new Error('Scraping failed');
    }

    // Le script Python sauvegarde dans un CSV, on le lit maintenant
    const scrapedData = JSON.parse(stdout);
    return scrapedData;
  } catch (error) {
    console.error('Error running Python scraper:', error);
    throw new Error('Failed to run scraper');
  }
}

export async function fetchRealEstateData(params: {
  location: string;
  postalCode?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  propertyType?: string;
}) {
  try {
    console.log('Starting scraping with params:', params);

    const scrapedData = await runPythonScraper(params);

    // Filtrer les résultats selon les critères
    const filteredData = scrapedData.filter((item: any) => {
      const price = parseFloat(item.prix.replace(/[^\d.]/g, ''));
      if (params.minPrice && price < params.minPrice) return false;
      if (params.maxPrice && price > params.maxPrice) return false;
      return true;
    });

    // Convertir au format de notre base de données
    const listings = filteredData.map((item: any) => ({
      title: item.titre,
      price: parseFloat(item.prix.replace(/[^\d.]/g, '')),
      description: '',
      location: item.localisation,
      url: item.url,
      source: item.source,
      imageUrls: [],
      propertyType: params.propertyType || 'apartment',
      area: null,
      rooms: null,
      features: null,
      contactInfo: null,
      scrapedAt: new Date(),
      archived: false
    }));

    // Sauvegarder dans la base de données
    if (listings.length > 0) {
      await db.insert(scrapedListings).values(listings);
    }

    return listings;
  } catch (error) {
    console.error('Error in fetchRealEstateData:', error);
    throw error;
  }
}