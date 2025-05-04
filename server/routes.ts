import fs from 'node:fs';
import { type Server, createServer } from 'node:http';
import path from 'node:path';
import { insertConfigSchema } from '@shared/schema';
import type { Express, Request, Response } from 'express';
import FormData from 'form-data';
import multer from 'multer';
import { nanoid } from 'nanoid';
import fetch from 'node-fetch';
import { z } from 'zod';
import { storage } from './storage';

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for temporary file storage
  const upload = multer({
    dest: 'temp_uploads/',
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  });

  // Get config by hash ID
  app.get('/api/configs/:hashId', async (req: Request, res: Response) => {
    const { hashId } = req.params;
    try {
      const config = await storage.getConfigByHash(hashId);
      if (!config) {
        return res.status(404).json({ message: 'Configuration not found' });
      }
      return res.json(config);
    } catch (error) {
      console.error('Error fetching config:', error);
      return res.status(500).json({ message: 'Failed to fetch configuration' });
    }
  });

  // Create new config
  app.post('/api/configs', async (req: Request, res: Response) => {
    try {
      const parsedData = insertConfigSchema.parse(req.body);
      const hashId = nanoid(10);
      const createdAt = new Date().toISOString();

      const newConfig = await storage.createConfig({
        ...parsedData,
        hashId,
        createdAt,
      });

      return res.status(201).json(newConfig);
    } catch (error) {
      console.error('Error creating config:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid config data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Failed to create configuration' });
    }
  });

  // Update config
  app.put('/api/configs/:hashId', async (req: Request, res: Response) => {
    const { hashId } = req.params;
    try {
      const parsedData = insertConfigSchema.omit({ hashId: true }).parse(req.body);

      const updatedConfig = await storage.updateConfig(hashId, {
        ...parsedData,
        hashId,
      });

      if (!updatedConfig) {
        return res.status(404).json({ message: 'Configuration not found' });
      }

      return res.json(updatedConfig);
    } catch (error) {
      console.error('Error updating config:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid config data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Failed to update configuration' });
    }
  });

  // Build .comapeocat file (simple implementation that renames the file)
  app.post('/api/build', upload.single('file'), async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      // For now, we'll just rename the .zip file to .comapeocat and send it back
      const outputPath = path.join('temp_uploads', `${req.file.filename}.comapeocat`);

      // Rename/copy the file
      fs.copyFileSync(req.file.path, outputPath);

      // Set the headers for file download
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename="config.comapeocat"');

      // Stream the file back to the client
      const fileStream = fs.createReadStream(outputPath);
      fileStream.pipe(res);

      // Clean up the temp files after request is completed
      res.on('finish', () => {
        // Delete both original and renamed files
        fs.unlink(req.file?.path, (err) => {
          if (err) console.error(`Error deleting temp file: ${err}`);
        });
        fs.unlink(outputPath, (err) => {
          if (err) console.error(`Error deleting temp output file: ${err}`);
        });
      });
    } catch (error) {
      console.error('Error building config:', error);

      // Clean up the temp file on error
      fs.unlink(req.file.path, (err) => {
        if (err) console.error(`Error deleting temp file: ${err}`);
      });

      return res.status(500).json({
        message: 'Failed to build configuration file',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
