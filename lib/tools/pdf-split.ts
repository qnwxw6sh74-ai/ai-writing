import { PDFDocument } from 'pdf-lib'
import fs from 'node:fs/promises'
import path from 'node:path'

export async function splitPDF(
  inputFile: string,
  outputDir: string,
  pages?: number[]
): Promise<{ outputFileCount: number; files: string[] }> {
  const pdfBytes = await fs.readFile(inputFile)
  const pdf = await PDFDocument.load(pdfBytes)
  const totalPages = pdf.getPageCount()

  let pageIndices: number[]
  if (pages && pages.length > 0) {
    pageIndices = pages.filter(p => p >= 1 && p <= totalPages)
  } else {
    pageIndices = Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const outputFiles: string[] = []
  for (const pageIndex of pageIndices) {
    const newPdf = await PDFDocument.create()
    const [copiedPage] = await newPdf.copyPages(pdf, [pageIndex - 1])
    newPdf.addPage(copiedPage)

    const outPath = path.join(outputDir, `page_${pageIndex}.pdf`)
    const bytes = await newPdf.save()
    await fs.writeFile(outPath, bytes)
    outputFiles.push(outPath)
  }

  return {
    outputFileCount: outputFiles.length,
    files: outputFiles,
  }
}
