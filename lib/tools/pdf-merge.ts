import { PDFDocument } from 'pdf-lib'
import fs from 'node:fs/promises'

export async function mergePDFs(
  inputFiles: string[],
  outputPath: string
): Promise<{ pageCount: number }> {
  const mergedPdf = await PDFDocument.create()

  for (const inputFile of inputFiles) {
    const pdfBytes = await fs.readFile(inputFile)
    const pdf = await PDFDocument.load(pdfBytes)
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
    copiedPages.forEach((page) => mergedPdf.addPage(page))
  }

  const outputBytes = await mergedPdf.save()
  await fs.writeFile(outputPath, outputBytes)

  return {
    pageCount: mergedPdf.getPageCount(),
  }
}
