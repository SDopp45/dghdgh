import * as ort from 'onnxruntime-node';
import { HfInference } from '@huggingface/inference';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';

// Initialiser le client Hugging Face avec le token d'API
const hf = new HfInference(process.env.HUGGING_FACE_TOKEN);

export async function generateImageWithStableDiffusion(prompt: string, options: {
  negative_prompt?: string;
  num_inference_steps?: number;
  guidance_scale?: number;
  width?: number;
  height?: number;
}) {
  try {
    if (!process.env.HUGGING_FACE_TOKEN) {
      logger.error('Hugging Face token is missing');
      throw new Error('Token d\'authentification Hugging Face manquant');
    }

    logger.info('Starting image generation with Stable Diffusion', { 
      prompt,
      hasToken: !!process.env.HUGGING_FACE_TOKEN,
      options: {
        ...options,
        negative_prompt: options.negative_prompt || '',
        num_inference_steps: options.num_inference_steps || 20,
        guidance_scale: options.guidance_scale || 7.5,
        width: options.width || 512,
        height: options.height || 512,
      }
    });

    // Utiliser le modèle Stable Diffusion optimisé de Hugging Face
    const response = await hf.textToImage({
      model: 'runwayml/stable-diffusion-v1-5',
      inputs: prompt,
      parameters: {
        negative_prompt: options.negative_prompt || '',
        num_inference_steps: options.num_inference_steps || 20,
        guidance_scale: options.guidance_scale || 7.5,
        width: options.width || 512,
        height: options.height || 512,
      }
    });

    // Convertir le blob en buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Optimiser l'image générée avec Sharp
    const optimizedBuffer = await sharp(buffer)
      .resize(options.width || 512, options.height || 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .webp({ quality: 90 })
      .toBuffer();

    // Sauvegarder l'image
    const filename = `generated-${Date.now()}.webp`;
    const outputPath = path.join(process.cwd(), 'uploads', filename);

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(outputPath, optimizedBuffer);

    logger.info('Image generated successfully', { filename });

    return {
      imageUrl: `/uploads/${filename}`,
      prompt,
      model: 'stable-diffusion-v1-5'
    };

  } catch (error) {
    logger.error('Error generating image with Stable Diffusion:', error);

    // Gérer spécifiquement les erreurs d'authentification
    if (error.message.includes('auth method') || error.message.includes('Invalid username or password')) {
      throw new Error('Token d\'authentification Hugging Face invalide ou permissions insuffisantes');
    }

    throw error;
  }
}