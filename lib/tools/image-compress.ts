import sharp from 'sharp'
import fs from 'node:fs/promises'

export interface CompressOptions {
  quality?: number
  width?: number
  height?: number
}

export async function compressImage(
  inputPath: string,
  outputPath: string,
  options: CompressOptions = {}
): Promise<{ originalSize: number; outputSize: number }> {
  const stat = await fs.stat(inputPath)
  const originalSize = stat.size

  const config: sharp.SharpOptions = {}
  if (options.width) config.width = options.width
  if (options.height) config.height = options.height

  await sharp(inputPath, config)
    .resize(options.width, options.height, { fit: 'inside' })
    .jpeg({ quality: options.quality || 80 })
    .toFile(outputPath)

  const outStat = await fs.stat(outputPath)
  return {
    originalSize,
    outputSize: outStat.size,
  }
}
