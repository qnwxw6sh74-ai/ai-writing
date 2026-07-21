import Jimp from 'jimp'
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

  const image = await Jimp.read(inputPath)

  if (options.width || options.height) {
    image.resize(options.width, options.height, Jimp.RESIZE_BESIDE)
  }

  image.quality(options.quality || 80)
  await image.writeAsync(outputPath)

  const outStat = await fs.stat(outputPath)
  return {
    originalSize,
    outputSize: outStat.size,
  }
}
