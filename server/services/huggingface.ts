import { HfInference } from '@huggingface/inference';
import logger from '../utils/logger';
import sharp from 'sharp';

export class HuggingFaceService {
  private hf: HfInference;

  constructor() {
    if (!process.env.HUGGING_FACE_TOKEN) {
      throw new Error('Token Hugging Face manquant');
    }
    this.hf = new HfInference(process.env.HUGGING_FACE_TOKEN);
  }

  async imageToImage(imageBuffer: Buffer, prompt: string, options: {
    strength?: number;
    guidance_scale?: number;
    num_inference_steps?: number;
  } = {}) {
    try {
      logger.info('Starting Hugging Face image-to-image', {
        hasPrompt: !!prompt,
        options
      });

      // Convertir l'image en JPEG et ensuite en base64
      const jpegBuffer = await sharp(imageBuffer)
        .jpeg()
        .toBuffer();

      const base64Image = jpegBuffer.toString('base64');
      const imageUrl = `data:image/jpeg;base64,${base64Image}`;

      const response = await this.hf.imageToImage({
        model: "stabilityai/stable-diffusion-img2img",
        inputs: {
          image: imageUrl,
          prompt,
          negative_prompt: "blur, noise, artifacts, distortion, low quality, unrealistic",
          num_inference_steps: options.num_inference_steps || 20,
          guidance_scale: options.guidance_scale || 7.5,
          strength: options.strength || 0.35
        }
      });

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      logger.error('Error in Hugging Face image-to-image:', error);
      throw error;
    }
  }

  async textToImage(prompt: string, options: {
    negative_prompt?: string;
    guidance_scale?: number;
    num_inference_steps?: number;
    width?: number;
    height?: number;
  } = {}) {
    try {
      logger.info('Starting Hugging Face text-to-image', {
        prompt,
        options
      });

      const response = await this.hf.textToImage({
        model: "stabilityai/stable-diffusion-xl-base-1.0",
        inputs: prompt,
        parameters: {
          negative_prompt: options.negative_prompt || "blur, noise, artifacts, distortion",
          num_inference_steps: options.num_inference_steps || 20,
          guidance_scale: options.guidance_scale || 7.5,
          width: options.width || 512,
          height: options.height || 512
        }
      });

      // Convertir la réponse en buffer et optimiser en WEBP
      const buffer = Buffer.from(await response.arrayBuffer());
      return await sharp(buffer)
        .webp({ quality: 90 })
        .toBuffer();
    } catch (error) {
      logger.error('Error in Hugging Face text-to-image:', error);
      throw error;
    }
  }
}

export const huggingFaceService = new HuggingFaceService();