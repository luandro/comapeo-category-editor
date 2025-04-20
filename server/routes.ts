import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { z } from "zod";
import { nanoid } from "nanoid";
import { insertConfigSchema } from "@shared/schema";
import path from "path";
import fs from "fs";
import fetch from "node-fetch";
import FormData from "form-data";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for temporary file storage
  const upload = multer({ 
    dest: 'temp_uploads/',
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size
  });

  // Get config by hash ID
  app.get("/api/configs/:hashId", async (req: Request, res: Response) => {
    const { hashId } = req.params;
    try {
      const config = await storage.getConfigByHash(hashId);
      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      return res.json(config);
    } catch (error) {
      console.error("Error fetching config:", error);
      return res.status(500).json({ message: "Failed to fetch configuration" });
    }
  });

  // Create new config
  app.post("/api/configs", async (req: Request, res: Response) => {
    try {
      const parsedData = insertConfigSchema.parse(req.body);
      const hashId = nanoid(10);
      const createdAt = new Date().toISOString();
      
      const newConfig = await storage.createConfig({
        ...parsedData,
        hashId,
        createdAt
      });
      
      return res.status(201).json(newConfig);
    } catch (error) {
      console.error("Error creating config:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid config data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create configuration" });
    }
  });

  // Update config
  app.put("/api/configs/:hashId", async (req: Request, res: Response) => {
    const { hashId } = req.params;
    try {
      const parsedData = insertConfigSchema.omit({ hashId: true }).parse(req.body);
      
      const updatedConfig = await storage.updateConfig(hashId, {
        ...parsedData,
        hashId
      });
      
      if (!updatedConfig) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      
      return res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating config:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid config data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to update configuration" });
    }
  });

  // Build .comapeocat file
  app.post("/api/build", upload.single('file'), async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      // Get API endpoint from environment variable
      const apiUrl = process.env.COMAPEO_CONFIG_BUILDER_API || 'http://localhost:8080';
      
      // Create form data for the API request
      const form = new FormData();
      const fileStream = fs.createReadStream(req.file.path);
      form.append('file', fileStream, { filename: 'config.zip' });
      
      // Call the comapeo-config-builder-api
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: form,
        headers: form.getHeaders()
      });
      
      // Check if the API call was successful
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }
      
      // Stream the file response back to the client
      response.body!.pipe(res);
      
      // Clean up the temp file after request is completed
      res.on('finish', () => {
        fs.unlink(req.file!.path, (err) => {
          if (err) console.error(`Error deleting temp file: ${err}`);
        });
      });
    } catch (error) {
      console.error("Error building config:", error);
      
      // Clean up the temp file on error
      fs.unlink(req.file.path, (err) => {
        if (err) console.error(`Error deleting temp file: ${err}`);
      });
      
      return res.status(500).json({ 
        message: "Failed to build configuration file", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
