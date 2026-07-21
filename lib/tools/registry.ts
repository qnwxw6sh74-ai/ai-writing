import { compressImage, CompressOptions } from './image-compress'
import { convertImage, ConvertOptions } from './image-convert'
import { mergePDFs } from './pdf-merge'
import { splitPDF } from './pdf-split'
import { imagesToPdf } from './image-to-pdf'
import { pdfToImages } from './pdf-to-image'

export interface UploadedFileInfo {
  path: string
  filename: string
  mimetype: string
  dir: string
}

export interface ToolDefinition {
  id: string
  name: string
  description: string
  category: 'image' | 'pdf' | 'document'
  icon: string
  accepts: string[]
  paramsSchema?: Record<string, { type: string; default: any; label: string }>
  handler: (params: any) => Promise<any>
}

const tools: ToolDefinition[] = [
  {
    id: 'image-compress',
    name: '图片压缩',
    description: '压缩图片体积，保持画质',
    category: 'image',
    icon: '🖼️',
    accepts: ['jpg', 'jpeg', 'png', 'webp'],
    paramsSchema: {
      quality: { type: 'number', default: 80, label: '压缩质量' },
      width: { type: 'number', default: null, label: '最大宽度' },
      height: { type: 'number', default: null, label: '最大高度' },
    },
    handler: async ({ files, quality, width, height }) => {
      const outputDir = files[0].dir
      const outputPath = `${outputDir}/compressed.jpg`
      const result = await compressImage(files[0].path, outputPath, { quality, width, height })
      return { outputFile: outputPath, ...result }
    },
  },
  {
    id: 'image-convert',
    name: '图片格式转换',
    description: 'JPG、PNG、WebP 等格式互转',
    category: 'image',
    icon: '🔄',
    accepts: ['jpg', 'jpeg', 'png', 'webp'],
    paramsSchema: {
      format: { type: 'select', default: 'jpeg', label: '目标格式', options: ['jpeg', 'png', 'webp'] },
      quality: { type: 'number', default: 80, label: '输出质量' },
    },
    handler: async ({ files, format, quality }) => {
      const outputDir = files[0].dir
      const ext = format === 'jpeg' ? 'jpg' : format
      const outputPath = `${outputDir}/converted.${ext}`
      const result = await convertImage(files[0].path, outputPath, { format, quality })
      return { outputFile: outputPath, ...result }
    },
  },
  {
    id: 'pdf-merge',
    name: 'PDF 合并',
    description: '将多个 PDF 文件合并为一个',
    category: 'pdf',
    icon: '📄',
    accepts: ['pdf'],
    handler: async ({ files }) => {
      const outputDir = files[0].dir
      const outputPath = `${outputDir}/merged.pdf`
      const result = await mergePDFs(files.map(f => f.path), outputPath)
      return { outputFile: outputPath, ...result }
    },
  },
  {
    id: 'pdf-split',
    name: 'PDF 拆分',
    description: '将 PDF 按页拆分或提取指定页',
    category: 'pdf',
    icon: '✂️',
    accepts: ['pdf'],
    paramsSchema: {
      pages: { type: 'string', default: '', label: '页码范围（如 1,3,5）' },
    },
    handler: async ({ files, pages }) => {
      const outputDir = files[0].dir
      const pageList = pages ? pages.split(',').map(Number).filter(n => !isNaN(n)) : undefined
      const result = await splitPDF(files[0].path, outputDir, pageList)
      return { outputFiles: result.files, ...result }
    },
  },
  {
    id: 'image-to-pdf',
    name: '图片转 PDF',
    description: '将多张图片合并为一个 PDF',
    category: 'image',
    icon: '📑',
    accepts: ['jpg', 'jpeg', 'png', 'webp'],
    paramsSchema: {
      pageSize: { type: 'select', default: 'a4', label: '页面大小', options: ['a4', 'letter'] },
    },
    handler: async ({ files, pageSize }) => {
      const outputDir = files[0].dir
      const outputPath = `${outputDir}/images.pdf`
      const result = await imagesToPdf(files.map(f => f.path), outputPath, pageSize)
      return { outputFile: outputPath, ...result }
    },
  },
]

export function getToolById(id: string): ToolDefinition | undefined {
  return tools.find(t => t.id === id)
}

export function getAllTools(): ToolDefinition[] {
  return tools
}

export function getToolsByCategory(category: string): ToolDefinition[] {
  return tools.filter(t => t.category === category)
}
