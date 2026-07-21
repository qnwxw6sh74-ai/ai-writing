import Jimp from 'jimp'
import fs from 'node:fs/promises'

export interface ConvertOptions {
  format: 'jpeg' | 'png' | 'webp' | 'tiff' | 'gif'
  quality?: number
}

export async function convertImage(
  inputPath: string,
  outputPath: string,
  options: ConvertOptions
): Promise<{ originalSize: number; outputSize: number }> {
  const stat = await fs.stat(inputPath)
  const originalSize = stat.size

  const image = await Jimp.read(inputPath)

  switch (options.format) {
    case 'jpeg':
      image.quality(options.quality || 80)
      break
    case 'png':
      image.quality(options.quality || 80)
      break
    case 'webp':
      image.quality(options.quality || 80)
      break
    case 'tiff':
      // Jimp doesn't support tiff well, fall back to png
      options.format = 'png'
      break
    case 'gif':
      // Jimp has limited gif support
      break
  }

  await image.writeAsync(outputPath)

  const outStat = await fs.stat(outputPath)
  return {
    originalSize,
    outputSize: outStat.size,
  }
}
