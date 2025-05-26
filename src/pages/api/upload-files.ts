// pages/api/upload-files.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';

// Disable the default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Process file upload
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      multiples: true,
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filename: (name, ext, part) => {
        // Generate unique filename to prevent overwriting
        const uniqueId = nanoid(10);
        const timestamp = Date.now();
        const safeName = part.originalFilename?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown';
        return `${timestamp}-${uniqueId}-${safeName}`;
      },
    });

    // Parse the form to get file data
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    // Process uploaded files
    const fileArray = Array.isArray(files.files) ? files.files : [files.files];
    const uploadedFiles = fileArray.filter(Boolean).map((file) => {
      // Get relative path for serving the file
      const filePath = file?.filepath;
      const relativeFilePath = filePath ? `/uploads/${path.basename(filePath)}` : '';
      
      return {
        path: relativeFilePath,
        originalName: file?.originalFilename || 'Unknown',
        mimeType: file?.mimetype || 'application/octet-stream',
        size: file?.size || 0,
      };
    });

    return res.status(200).json(uploadedFiles);
  } catch (error) {
    console.error('Error uploading files:', error);
    return res.status(500).json({ error: 'Failed to upload files' });
  }
};

export default handler;