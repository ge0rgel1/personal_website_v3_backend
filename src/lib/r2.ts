import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

// Configure R2 client (S3-compatible)
const r2Client = new S3Client({
  region: 'auto', // R2 uses 'auto' for region
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export interface UploadImageResult {
  url: string
  key: string
  filename: string
}

export async function uploadImageToR2(
  file: File | Buffer,
  originalFilename: string,
  contentType: string,
  folder: string = 'images'
): Promise<UploadImageResult> {
  try {
    // Generate unique filename
    const fileExtension = originalFilename.split('.').pop()
    const uniqueFilename = `${folder}/${randomUUID()}.${fileExtension}`
    
    // Prepare upload parameters
    const uploadParams = {
      Bucket: process.env.R2_BUCKET!,
      Key: uniqueFilename,
      Body: file instanceof File ? Buffer.from(await file.arrayBuffer()) : file,
      ContentType: contentType,
      // Optional: Set cache control headers
      CacheControl: 'public, max-age=31536000', // 1 year
    }

    // Upload to R2
    const command = new PutObjectCommand(uploadParams)
    await r2Client.send(command)

    // Construct public URL
    const publicUrl = `${process.env.R2_PUBLIC_BASE_URL}/${uniqueFilename}`

    return {
      url: publicUrl,
      key: uniqueFilename,
      filename: originalFilename,
    }
  } catch (error) {
    console.error('Error uploading to R2:', error)
    throw new Error('Failed to upload image to R2')
  }
}

export default r2Client
