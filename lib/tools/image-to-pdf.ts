import { PDFDocument } from 'pdf-lib'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

export async function imagesToPdf(
  images: string[],
  outputPath: string,
  pageSize = 'a4'
): Promise<{ pageCount: number }> {
  const pdfDoc = await PDFDocument.create()

  for (const imagePath of images) {
    const imageBuffer = await fs.readFile(imagePath)
    let pageWidth: number, pageHeight: number

    switch (pageSize) {
      case 'a4':
        pageWidth = 595.28; pageHeight = 841.89; break
      case 'letter':
        pageWidth = 612; pageHeight = 792; break
      default:
        const meta = await sharp(imageBuffer).metadata()
        pageWidth = meta.width || 595.28
        pageHeight = meta.height || 841.89
    }

    const imgMeta = await sharp(imageBuffer).metadata()
    const scale = Math.min(pageWidth / imgMeta.width!, pageHeight / imgMeta.height!)
    const drawW = imgMeta.width! * scale
    const drawH = imgMeta.height! * scale

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
