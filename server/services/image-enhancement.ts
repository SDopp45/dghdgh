import sharp from 'sharp';
import logger from '../utils/logger';
import { localAIService } from './local-ai';

interface EnhancementOptions {
  style?: string;
  intensity?: number;
  format?: string;
  quality?: number;
  watermarkSettings?: {
    type: 'logo' | 'text';
    position: string;
    size: number;
    opacity: number;
    text?: string;
    color?: string;
    font?: string;
  };
  watermarkBuffer?: Buffer;
}

export async function enhanceImageWithLocalAI(imageBuffer: Buffer, type: string, options: EnhancementOptions = {}) {
  try {
    logger.info(`Starting image enhancement process: ${type}`, { 
      options: JSON.stringify({
        style: options.style,
        intensity: options.intensity,
        format: options.format,
        quality: options.quality,
        hasWatermark: !!options.watermarkBuffer,
        watermarkSettings: options.watermarkSettings ? 
          { type: options.watermarkSettings.type, position: options.watermarkSettings.position } : 
          undefined
      }) 
    });

    // Vérifier que le buffer d'image est valide
    if (!imageBuffer || imageBuffer.length === 0) {
      logger.error('Invalid image buffer received');
      throw new Error('Buffer d\'image invalide');
    }

    const optimizedBuffer = await sharp(imageBuffer)
      .resize(1024, 1024, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 90,
        mozjpeg: true
      })
      .toBuffer();

    let pipeline = sharp(optimizedBuffer);
    const intensity = options.intensity || 1;

    switch (type) {
      case 'enhance-quality':
        return await sharp(optimizedBuffer)
          .modulate({
            brightness: 1.1,
            saturation: 1.2
          })
          .sharpen()
          .toBuffer();

      case 'real-estate-interior':
        const interiorStyle = options.style || 'natural';
        switch (interiorStyle) {
          case 'dramatic':
            pipeline = pipeline
              .normalize()
              .modulate({
                brightness: 1.2 * intensity,
                saturation: 1.3 * intensity
              })
              .gamma(1.2)
              .sharpen({
                sigma: 1.5,
                m1: 2.0,
                m2: 20
              });
            break;
          case 'bright':
            pipeline = pipeline
              .normalize()
              .modulate({
                brightness: 1.3 * intensity,
                saturation: 1.1 * intensity
              })
              .gamma(1.1)
              .sharpen({
                sigma: 1.2,
                m1: 1.5,
                m2: 15
              });
            break;
          default: // natural
            pipeline = pipeline
              .normalize()
              .modulate({
                brightness: 1.1 * intensity,
                saturation: 1.2 * intensity
              })
              .gamma(1.1)
              .sharpen({
                sigma: 1.0,
                m1: 1.0,
                m2: 10
              });
        }
        break;

      case 'real-estate-exterior':
        const exteriorStyle = options.style || 'clear-sky';
        pipeline = pipeline.normalize();

        switch (exteriorStyle) {
          case 'golden-hour':
            pipeline = pipeline
              .modulate({
                brightness: 1.15 * intensity,
                saturation: 1.3 * intensity,
                hue: 15
              })
              .gamma(1.1)
              .tint({ r: 255, g: 200, b: 150 })
              .sharpen({ sigma: 1.3, m1: 1.5, m2: 15 });
            break;
          case 'vibrant':
            pipeline = pipeline
              .modulate({
                brightness: 1.2 * intensity,
                saturation: 1.4 * intensity
              })
              .gamma(1.2)
              .sharpen({ sigma: 1.5, m1: 2.0, m2: 20 });
            break;
          default: // clear-sky
            pipeline = pipeline
              .modulate({
                brightness: 1.15 * intensity,
                saturation: 1.25 * intensity
              })
              .gamma(1.1)
              .sharpen({ sigma: 1.2, m1: 1.5, m2: 15 });
        }
        break;

      case 'aerial-view':
        const aerialStyle = options.style || 'clarity';
        pipeline = sharp(optimizedBuffer);

        switch (aerialStyle) {
          case 'pro':
            pipeline = pipeline
              .modulate({ brightness: 1.2, saturation: 1.3 })
              .gamma(1.1)
              .sharpen({ sigma: 2.0 });
            break;
          default: // clarity
            pipeline = pipeline
              .modulate({ brightness: 1.15, saturation: 1.2 })
              .gamma(1.0)
              .sharpen({ sigma: 1.5 });
        }
        break;

      case 'hdr-enhance':
        const hdrStyle = options.style || 'natural';
        pipeline = sharp(optimizedBuffer);

        if (hdrStyle === 'vivid') {
          pipeline = pipeline
            .recomb([
              [1.2, -0.1, 0.1],
              [-0.1, 1.2, -0.1],
              [0.1, -0.1, 1.2]
            ])
            .modulate({ brightness: 1.2, saturation: 1.4 })
            .gamma(1.2);
        } else { // natural
          pipeline = pipeline
            .recomb([
              [1.1, -0.05, 0.05],
              [-0.05, 1.1, -0.05],
              [0.05, -0.05, 1.1]
            ])
            .modulate({ brightness: 1.1, saturation: 1.2 })
            .gamma(1.1);
        }
        break;

      case 'perspective-correction':
        return await sharp(optimizedBuffer)
          .resize(1024, 1024, {
            fit: 'inside',
            withoutEnlargement: true,
            kernel: sharp.kernel.lanczos3
          })
          .recomb([
            [1, 0.1, 0],
            [0, 1, 0],
            [0, 0, 1]
          ])
          .toBuffer();

      case 'smart-crop':
        return await sharp(optimizedBuffer)
          .resize(800, 800, {
            fit: 'cover',
            position: 'entropy'
          })
          .toBuffer();

      case 'add-logo':
        if (!options.watermarkBuffer) {
          throw new Error('Missing watermark buffer');
        }

        const { position, size, opacity } = options.watermarkSettings || {};
        if (!position || !size || !opacity) {
          throw new Error('Missing watermark settings');
        }

        const metadata = await sharp(optimizedBuffer).metadata();
        const baseWidth = metadata.width || 1024;
        const baseHeight = metadata.height || 1024;

        const watermarkSize = Math.round((baseWidth * size) / 100);
        const resizedWatermark = await sharp(options.watermarkBuffer)
          .resize(watermarkSize, watermarkSize, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .toBuffer();

        const watermarkMetadata = await sharp(resizedWatermark).metadata();
        const watermarkWidth = watermarkMetadata.width || watermarkSize;
        const watermarkHeight = watermarkMetadata.height || watermarkSize;

        let left = 20, top = 20;
        switch (position) {
          case 'top-right':
            left = baseWidth - watermarkWidth - 20;
            break;
          case 'bottom-left':
            top = baseHeight - watermarkHeight - 20;
            break;
          case 'bottom-right':
            top = baseHeight - watermarkHeight - 20;
            left = baseWidth - watermarkWidth - 20;
            break;
          case 'center':
            top = (baseHeight - watermarkHeight) / 2;
            left = (baseWidth - watermarkWidth) / 2;
            break;
        }

        return await sharp(optimizedBuffer)
          .composite([{
            input: resizedWatermark,
            top: Math.round(top),
            left: Math.round(left),
            blend: 'over'
          }])
          .toBuffer();

      case 'add-watermark':
        if (!options.watermarkSettings?.text) {
          throw new Error('Missing watermark text');
        }

        const { text, position: textPosition = 'bottom-right', opacity: textOpacity = 50, color = '#000000', font = 'Arial' } = options.watermarkSettings;

        const textMetadata = await sharp(optimizedBuffer).metadata();
        const textBaseWidth = textMetadata.width || 1024;
        const textBaseHeight = textMetadata.height || 1024;

        const fontSize = Math.round(textBaseHeight * 0.03);
        const svgText = `
          <svg width="${textBaseWidth}" height="${textBaseHeight}">
            <style>
              .watermark {
                fill: ${color};
                font-family: ${font};
                font-size: ${fontSize}px;
                opacity: ${textOpacity / 100};
              }
            </style>
            <text
              x="${textPosition.includes('right') ? textBaseWidth - 20 : textPosition.includes('center') ? textBaseWidth / 2 : 20}"
              y="${textPosition.includes('bottom') ? textBaseHeight - 20 : textPosition.includes('center') ? textBaseHeight / 2 : 20}"
              text-anchor="${textPosition.includes('right') ? 'end' : textPosition.includes('center') ? 'middle' : 'start'}"
              dominant-baseline="${textPosition.includes('bottom') ? 'auto' : textPosition.includes('center') ? 'middle' : 'hanging'}"
              class="watermark"
            >${text}</text>
          </svg>
        `;

        return await sharp(optimizedBuffer)
          .composite([{
            input: Buffer.from(svgText),
            blend: 'over'
          }])
          .toBuffer();

      case 'smart-enhance':
        const result = await localAIService.imageToImage(
          optimizedBuffer,
          'enhance real estate photo quality, maintain realism',
          {
            strength: options.intensity || 0.3,
            guidance_scale: 7.0,
            num_inference_steps: 15
          }
        );

        return await sharp(result)
          .webp({ quality: options.quality || 90 })
          .toBuffer();

      case "specialty-filter":
        const specialtyStyle = options.style || 'living-room';
        pipeline = pipeline.normalize();

        switch (specialtyStyle) {
          case "living-room":
            pipeline = pipeline
              .modulate({
                brightness: 1.15 * intensity,
                saturation: 1.2 * intensity
              })
              .tint({ r: 255, g: 245, b: 235 })
              .gamma(1.1)
              .sharpen({ sigma: Math.max(0.3, 1.3 * intensity), m1: 1.5, m2: 15 });
            break;
          case "bedroom":
            pipeline = pipeline
              .modulate({
                brightness: 1.1 * intensity,
                saturation: 1.1 * intensity
              })
              .tint({ r: 250, g: 245, b: 240 })
              .gamma(1.05)
              .sharpen({ sigma: Math.max(0.3, 1.2 * intensity), m1: 1.3, m2: 13 });
            break;
          case "bathroom":
            pipeline = pipeline
              .modulate({
                brightness: 1.2 * intensity,
                saturation: 0.95 * intensity
              })
              .tint({ r: 245, g: 250, b: 255 })
              .gamma(1.15)
              .sharpen({ sigma: Math.max(0.3, 1.4 * intensity), m1: 1.6, m2: 16 });
            break;
          case "kitchen":
            pipeline = pipeline
              .modulate({
                brightness: 1.18 * intensity,
                saturation: 1.15 * intensity
              })
              .tint({ r: 250, g: 248, b: 245 })
              .gamma(1.12)
              .sharpen({ sigma: Math.max(0.3, 1.5 * intensity), m1: 1.7, m2: 17 });
            break;
          case "office":
            pipeline = pipeline
              .modulate({
                brightness: 1.15 * intensity,
                saturation: 1.05 * intensity
              })
              .tint({ r: 245, g: 245, b: 250 })
              .gamma(1.1)
              .sharpen({ sigma: Math.max(0.3, 1.4 * intensity), m1: 1.6, m2: 16 });
            break;
          case "exterior":
            pipeline = pipeline
              .modulate({
                brightness: 1.15 * intensity,
                saturation: 1.25 * intensity
              })
              .gamma(1.1)
              .sharpen({ sigma: Math.max(0.3, 1.5 * intensity), m1: 1.8, m2: 18 });
            break;
          case "pool-area":
            pipeline = pipeline
              .modulate({
                brightness: 1.15 * intensity,
                saturation: 1.3 * intensity,
                hue: 5
              })
              .gamma(1.15)
              .sharpen({ sigma: Math.max(0.3, 1.4 * intensity), m1: 1.8, m2: 18 });
            break;
          case "garden":
            pipeline = pipeline
              .modulate({
                brightness: 1.12 * intensity,
                saturation: 1.35 * intensity,
                hue: -5
              })
              .gamma(1.1)
              .sharpen({ sigma: Math.max(0.3, 1.5 * intensity), m1: 2.0, m2: 20 });
            break;
        }
        break;

      case 'seasonal-filter':
        const seasonStyle = options.style || 'summer';
        pipeline = pipeline.normalize();

        switch (seasonStyle) {
          case 'spring':
            pipeline = pipeline
              .modulate({
                brightness: 1.12 * intensity,
                saturation: 1.25 * intensity,
                hue: -5
              })
              .tint({ r: 240, g: 255, b: 245 })
              .gamma(1.1)
              .sharpen({ sigma: 1.3, m1: 1.5, m2: 15 });
            break;
          case 'summer':
            pipeline = pipeline
              .modulate({
                brightness: 1.15 * intensity,
                saturation: 1.35 * intensity
              })
              .tint({ r: 255, g: 245, b: 235 })
              .gamma(1.2)
              .sharpen({ sigma: 1.4, m1: 1.8, m2: 18 });
            break;
          case 'autumn':
            pipeline = pipeline
              .modulate({
                brightness: 1.08 * intensity,
                saturation: 1.3 * intensity,
                hue: 5
              })
              .tint({ r: 255, g: 235, b: 215 })
              .gamma(1.1)
              .sharpen({ sigma: 1.3, m1: 1.5, m2: 15 });
            break;
          case 'winter':
            pipeline = pipeline
              .modulate({
                brightness: 1.2 * intensity,
                saturation: 0.95 * intensity
              })
              .tint({ r: 235, g: 245, b: 255 })
              .gamma(1.1)
              .sharpen({ sigma: 1.2, m1: 1.4, m2: 14 });
            break;
        }
        break;

      case 'color-adjustment':
        const colorStyle = options.style || 'vibrant';
        pipeline = pipeline.normalize();

        switch (colorStyle) {
          case 'vibrant':
            pipeline = pipeline
              .modulate({
                brightness: 1.1,
                saturation: 1.3 * intensity
              })
              .gamma(1.2);
            break;
          case 'warm':
            pipeline = pipeline
              .modulate({
                brightness: 1.05,
                saturation: 1.15 * intensity,
                hue: 10
              })
              .tint({ r: 255, g: 240, b: 220 });
            break;
          case 'cool':
            pipeline = pipeline
              .modulate({
                brightness: 1.05,
                saturation: 1.15 * intensity,
                hue: -10
              })
              .tint({ r: 220, g: 240, b: 255 });
            break;
          case 'muted':
            pipeline = pipeline
              .modulate({
                brightness: 1.0,
                saturation: 0.8 * intensity
              })
              .gamma(1.1);
            break;
        }
        break;

      case 'lighting-adjustment':
        const lightStyle = options.style || 'bright';
        pipeline = pipeline.normalize();

        switch (lightStyle) {
          case 'bright':
            pipeline = pipeline
              .modulate({
                brightness: 1.2 * intensity,
                saturation: 1.0
              })
              .gamma(1.1);
            break;
          case 'dark':
            pipeline = pipeline
              .modulate({
                brightness: 0.8 * intensity,
                saturation: 1.1
              })
              .gamma(1.2);
            break;
          case 'high-contrast':
            pipeline = pipeline
              .modulate({
                brightness: 1.1,
                saturation: 1.2
              })
              .gamma(1.3 * intensity);
            break;
          case 'soft':
            pipeline = pipeline
              .modulate({
                brightness: 1.1,
                saturation: 0.9
              })
              .gamma(0.9 * intensity);
            break;
        }
        break;

      case 'grain-adjustment':
        const grainStyle = options.style || 'fine';
        pipeline = pipeline.normalize();

        switch (grainStyle) {
          case 'fine':
            pipeline = pipeline
              .convolve({
                width: 3,
                height: 3,
                kernel: [
                  0.5, 0.5, 0.5,
                  0.5, 1, 0.5,
                  0.5, 0.5, 0.5
                ]
              })
              .modulate({ brightness: 1 + (0.1 * intensity) });
            break;
          case 'medium':
            pipeline = pipeline
              .convolve({
                width: 3,
                height: 3,
                kernel: [
                  0.7, 0.7, 0.7,
                  0.7, 1, 0.7,
                  0.7, 0.7, 0.7
                ]
              })
              .modulate({ brightness: 1 + (0.2 * intensity) });
            break;
          case 'rough':
            pipeline = pipeline
              .convolve({
                width: 3,
                height: 3,
                kernel: [
                  1, 1, 1,
                  1, 1, 1,
                  1, 1, 1
                ]
              })
              .modulate({ brightness: 1 + (0.3 * intensity) });
            break;
          case 'remove':
            pipeline = pipeline
              .median(3)
              .sharpen({
                sigma: Math.max(0.3, 1.2 * intensity),
                m1: 1,
                m2: 2
              });
            break;
        }
        break;

      case 'sharpness-adjustment':
        const sharpStyle = options.style || 'medium';
        pipeline = pipeline.normalize();

        switch (sharpStyle) {
          case 'soft':
            pipeline = pipeline.sharpen({
              sigma: Math.max(0.3, 0.8 * intensity),
              m1: 1,
              m2: 2
            });
            break;
          case 'medium':
            pipeline = pipeline.sharpen({
              sigma: Math.max(0.3, 1.2 * intensity),
              m1: 1.5,
              m2: 3
            });
            break;
          case 'strong':
            pipeline = pipeline.sharpen({
              sigma: Math.max(0.3, 1.5 * intensity),
              m1: 2,
              m2: 4
            });
            break;
          case 'extreme':
            pipeline = pipeline.sharpen({
              sigma: Math.max(0.3, 2.0 * intensity),
              m1: 3,
              m2: 5
            });
            break;
        }
        break;

      case 'blur-adjustment':
        const blurStyle = options.style || 'slight';
        pipeline = pipeline.normalize();

        switch (blurStyle) {
          case 'slight':
            pipeline = pipeline.sharpen({
              sigma: Math.max(0.3, 1.0 * intensity),
              m1: 1,
              m2: 2
            });
            break;
          case 'medium':
            pipeline = pipeline.sharpen({
              sigma: Math.max(0.3, 1.5 * intensity),
              m1: 2,
              m2: 3
            });
            break;
          case 'strong':
            pipeline = pipeline.sharpen({
              sigma: Math.max(0.3, 2.0 * intensity),
              m1: 3,
              m2: 4
            });
            break;
          case 'gaussian':
            pipeline = pipeline.sharpen({
              sigma: Math.max(0.3, 1.8 * intensity),
              m1: 2,
              m2: 3
            });
            break;
        }
        break;

      default:
        pipeline = pipeline
          .modulate({ brightness: 1.1, saturation: 1.1 })
          .gamma(1.1)
          .sharpen()
          .normalize();
    }

    // Format conversion
    const format = options?.format || 'webp';
    const quality = options?.quality || 92;

    let finalPipeline;
    switch (format) {
      case 'jpeg':
        finalPipeline = pipeline.jpeg({ quality, mozjpeg: true });
        break;
      case 'png':
        finalPipeline = pipeline.png({ quality: Math.floor(quality * 0.8) });
        break;
      case 'avif':
        finalPipeline = pipeline.avif({ quality });
        break;
      case 'webp':
      default:
        finalPipeline = pipeline.webp({
          quality,
          effort: 6,
          smartSubsample: true,
          force: true
        });
    }

    logger.info(`Finalizing image processing in ${format} format`);
    
    try {
      const finalBuffer = await finalPipeline.toBuffer();
      logger.info(`Image processing completed successfully: ${finalBuffer.length} bytes`);
      return finalBuffer;
    } catch (bufferError) {
      logger.error('Error generating final buffer:', bufferError);
      // En cas d'erreur, retourner une image simple avec un message d'erreur
      return await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
      .composite([{
        input: Buffer.from(`
          <svg width="800" height="600">
            <rect width="100%" height="100%" fill="#f8f9fa" />
            <text x="400" y="250" font-family="Arial" font-size="24" text-anchor="middle" fill="#dc3545">
              Erreur de traitement d'image
            </text>
            <text x="400" y="300" font-family="Arial" font-size="16" text-anchor="middle" fill="#6c757d">
              Veuillez réessayer avec une autre image
            </text>
          </svg>
        `),
        gravity: 'center'
      }])
      .webp({ quality: 90 })
      .toBuffer();
    }

  } catch (error) {
    logger.error('Error in image enhancement:', error);
    // En cas d'erreur, retourner une image simple avec un message d'erreur
    return await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([{
      input: Buffer.from(`
        <svg width="800" height="600">
          <rect width="100%" height="100%" fill="#f8f9fa" />
          <text x="400" y="250" font-family="Arial" font-size="24" text-anchor="middle" fill="#dc3545">
            Erreur de traitement d'image
          </text>
          <text x="400" y="300" font-family="Arial" font-size="16" text-anchor="middle" fill="#6c757d">
            ${error instanceof Error ? error.message : 'Erreur inconnue'}
          </text>
        </svg>
      `),
      gravity: 'center'
    }])
    .webp({ quality: 90 })
    .toBuffer();
  }
}