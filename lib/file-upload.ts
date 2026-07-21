import { Busboy, BusboyConfig } from 'busboy'
import type { IncomingMessage } from 'node:http'
import { pipeline } from 'node:stream/promises'
import fs from 'node:fs'

export interface UploadedFile {
  filename: string
  mimetype: string
  size: number
  filepath: string
}

export async function parseUpload(
  req: IncomingMessage,
  destDir: string
): Promise<{ files: UploadedFile[]; fields: Record<string, string> }> {
  const contentType = req.headers['content-type'] || ''
  const boundary = contentType.split('boundary=')[1]
  if (!boundary) {
    throw new Error('Missing multipart boundary')
  }

  const config: BusboyConfig = {
    headers: req.headers,
    limits: { fileSize: 200 * 1024 * 1024 },
  }

  const busboy = Busboy(config)
  const files: UploadedFile[] = []
  const fields: Record<string, string> = {}

  await new Promise<void>((resolve, reject) => {
    busboy.on('file', (fieldname, fileStream, info) => {
      const { filename, mimetype } = info
      const filepath = `${destDir}/${Date.now()}-${filename}`
      const writeStream = fs.createWriteStream(filepath)

      fileStream.on('error', reject)
      writeStream.on('error', reject)
      writeStream.on('finish', () => {
        files.push({
          filename,
          mimetype,
          size: fileStream.bytesRead,
          filepath,
        })
      })

      pipeline(fileStream, writeStream).catch(reject)
    })

    busboy.on('field', (fieldname, value) => {
      fields[fieldname] = value
    })

    busboy.on('finish', resolve)
    busboy.on('error', reject)

    req.pipe(busboy)
  })

  return { files, fields }
}
