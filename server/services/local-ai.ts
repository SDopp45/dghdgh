import sharp from 'sharp';
import logger from '../utils/logger';

interface ImageProcessingOptions {
  strength?: number;
  guidance_scale?: number;
  num_inference_steps?: number;
}

export class LocalAIService {
  async imageToImage(imageBuffer: Buffer, prompt: string, options: ImageProcessingOptions = {}): Promise<Buffer> {
    try {
      logger.info('Processing image with Sharp', { prompt });
      let enhancedImage = sharp(imageBuffer);

      // Base enhancements for all images
      enhancedImage = enhancedImage.normalize();

      // Apply specific enhancements based on the prompt
      if (prompt.includes('interior')) {
        enhancedImage = enhancedImage
          .modulate({ brightness: 1.1, saturation: 1.2 })
          .gamma(1.1)
          .sharpen({ sigma: 1.2 });
      } else if (prompt.includes('exterior')) {
        enhancedImage = enhancedImage
          .modulate({ brightness: 1.15, saturation: 1.3 })
          .sharpen({ sigma: 1.5 });
      } else if (prompt.includes('aerial')) {
        enhancedImage = enhancedImage
          .modulate({ brightness: 1.1, saturation: 1.1 })
          .sharpen({ sigma: 1.8 });
      }

      // Add intensity-based adjustments
      const strength = options.strength || 0.5;
      enhancedImage = enhancedImage
        .modulate({
          brightness: 1 + (0.2 * strength),
          saturation: 1 + (0.3 * strength)
        })
        .normalize();

      return await enhancedImage
        .webp({ quality: 90 })
        .toBuffer();

    } catch (error) {
      logger.error('Error in image processing:', error);
      // Return original image as fallback
      return await sharp(imageBuffer)
        .webp({ quality: 90 })
        .toBuffer();
    }
  }
}

export const localAIService = new LocalAIService();