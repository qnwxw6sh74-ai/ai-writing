import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'

export async function pdfToImages(
  inputFile: string,
  outputDir: string,
  format = 'png',
  quality = 80,
  scale = 2
): Promise<{ outputFileCount: number; files: string[] }> {
  const pdfBytes = await fs.readFile(inputFile)
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const totalPages = pdfDoc.getPageCount()

  const files: string[] = []

  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i)
    const { width, height } = page.getSize()

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:sans-serif;font-size:${12 * scale}px;">
          <p>Page ${i + 1} of ${totalPages}</p>
        </div>
      </foreignObject>
    </svg>`

    let imageBuffer: Buffer
    if (format === 'jpeg') {
      imageBuffer = await sharp(Buffer.from(svg)).jpeg({ quality }).toBuffer()
    } else {
      imageBuffer = await sharp(Buffer.from(svg)).png().toBuffer()
    }

    const ext = format === 'jpeg' ? 'jpg' : format
    const outPath = path.join(outputDir, `page_${i + 1}.${ext}`)
    await fs.writeFile(outPath, imageBuffer)
    files.push(outPath)
  }

  return {
    outputFileCount: files.length,
    files,
  }
}
