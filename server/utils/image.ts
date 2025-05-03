import sharp from 'sharp';

export async function convertToWebP(inputBuffer: Buffer, isThumb: boolean = false): Promise<Buffer> {
  const pipeline = sharp(inputBuffer).webp({ quality: 80 });
  
  if (isThumb) {
    return pipeline
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .toBuffer();
  }
  
  return pipeline
    .resize(1200, 1200, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .toBuffer();
}
