import sharp from 'sharp'
import fs from 'node:fs/promises'

export interface ConvertOptions {
  format: 'jpeg' | 'png' | 'webp' | 'tiff' | 'gif' | 'svg'
  quality?: number
}

export async function convertImage(
  inputPath: string,
  outputPath: string,
  options: ConvertOptions
): Promise<{ originalSize: number; outputSize: number }> {
  const stat = await fs.stat(inputPath)
  const originalSize = stat.size

  let sharpInstance = sharp(inputPath)

  switch (options.format) {
    case 'jpeg':
      sharpInstance = sharpInstance.jpeg({ quality: options.quality || 80 })
      break
    case 'png':
      sharpInstance = sharpInstance.png({ quality: options.quality || 80 })
      break
    case 'webp':
      sharpInstance = sharpInstance.webp({ quality: options.quality || 80 })
      break
    case 'tiff':
      sharpInstance = sharpInstance.tiff()
      break
    case 'gif':
      sharpInstance = sharpInstance.gif()
      break
    case 'svg':
      sharpInstance = sharpInstance.svg()
      break
  }

  await sharpInstance.toFile(outputPath)

  const outStat = await fs.stat(outputPath)
  return {
    originalSize,
    outputSize: outStat.size,
  }
}
