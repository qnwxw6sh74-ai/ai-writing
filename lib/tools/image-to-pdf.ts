import { PDFDocument } from 'pdf-lib'
import Jimp from 'jimp'
import fs from 'node:fs/promises'

export async function imagesToPdf(
  images: string[],
  outputPath: string,
  pageSize = 'a4'
): Promise<{ pageCount: number }> {
  const pdfDoc = await PDFDocument.create()

  for (const imagePath of images) {
    const imageBuffer = await fs.readFile(imagePath)
    const image = await Jimp.read(imageBuffer)

    let pageWidth: number, pageHeight: number

    switch (pageSize) {
      case 'a4':
        pageWidth = 595.28; pageHeight = 841.89; break
      case 'letter':
        pageWidth = 612; pageHeight = 792; break
      default:
        pageWidth = image.bitmap.width || 595.28
        pageHeight = image.bitmap.height || 841.89
    }

    const scale = Math.min(pageWidth / image.bitmap.width, pageHeight / image.bitmap.height)
    const drawW = image.bitmap.width * scale
    const drawH = image.bitmap.height * scale

    const page = pdfDoc.addPage([pageWidth, pageHeight])
    let embeddedImage
    try {
      embeddedImage = await pdfDoc.embedPng(imageBuffer)
    } catch {
      embeddedImage = await pdfDoc.embedJpg(imageBuffer)
    }

    page.drawImage(embeddedImage, {
      x: (pageWidth - drawW) / 2,
      y: (pageHeight - drawH) / 2,
      width: drawW,
      height: drawH,
    })
  }

  const bytes = await pdfDoc.save()
  await fs.writeFile(outputPath, bytes)
  return { pageCount: pdfDoc.getPageCount() }
}
