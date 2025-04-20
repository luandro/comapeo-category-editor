import JSZip from 'jszip';
import { ConfigFile, CoMapeoConfig } from '@shared/schema';
import { apiRequest } from './queryClient';

/**
 * Extracts files from a .comapeocat (ZIP) file
 */
export async function extractZipFile(file: File): Promise<ConfigFile[]> {
  const zip = new JSZip();
  const zipContents = await zip.loadAsync(file);
  const files: ConfigFile[] = [];

  for (const path in zipContents.files) {
    const zipEntry = zipContents.files[path];
    if (!zipEntry.dir) {
      const content = await zipEntry.async('string');
      files.push({
        name: zipEntry.name.split('/').pop() || '',
        content,
        path
      });
    }
  }

  return files;
}

/**
 * Extracts files from a .mapeosettings (TAR) file
 */
export async function extractTarFile(file: File): Promise<ConfigFile[]> {
  // Since we can't directly use tar-js in the browser easily,
  // we'll use a streaming approach with a worker or other library
  // For now, we'll implement a basic extraction
  
  const arrayBuffer = await file.arrayBuffer();
  const files: ConfigFile[] = [];
  
  let offset = 0;
  const view = new DataView(arrayBuffer);
  
  while (offset < arrayBuffer.byteLength) {
    // Tar header is 512 bytes
    const header = arrayBuffer.slice(offset, offset + 512);
    
    // Extract filename (first 100 bytes of header)
    let filename = '';
    for (let i = 0; i < 100; i++) {
      const byte = new Uint8Array(header)[i];
      if (byte === 0) break;
      filename += String.fromCharCode(byte);
    }
    
    if (filename.length === 0) break; // End of archive
    
    // Extract file size (bytes 124-136)
    let fileSizeOctal = '';
    for (let i = 124; i < 136; i++) {
      const byte = new Uint8Array(header)[i];
      if (byte === 0 || byte === 32) break;
      fileSizeOctal += String.fromCharCode(byte);
    }
    
    const fileSize = parseInt(fileSizeOctal, 8);
    offset += 512; // Move past header
    
    if (fileSize > 0) {
      // Read file content
      const content = arrayBuffer.slice(offset, offset + fileSize);
      
      // Add to files array if it's a file we care about
      if (filename.endsWith('.json') || filename.endsWith('.svg') || filename === 'VERSION') {
        files.push({
          name: filename.split('/').pop() || '',
          content: content,
          path: filename
        });
      }
      
      // Move to next file, with padding to 512-byte boundary
      offset += Math.ceil(fileSize / 512) * 512;
    }
  }
  
  return files;
}

/**
 * Creates a ZIP file from the configuration
 */
export async function createZipFile(config: CoMapeoConfig, rawFiles: ConfigFile[]): Promise<Blob> {
  const zip = new JSZip();
  
  // Add JSON configuration files
  zip.file('metadata.json', JSON.stringify(config.metadata, null, 2));
  zip.file('presets.json', JSON.stringify(config.presets, null, 2));
  zip.file('fields.json', JSON.stringify(config.fields, null, 2));
  zip.file('translations.json', JSON.stringify(config.translations, null, 2));
  zip.file('icons.json', JSON.stringify(config.icons, null, 2));
  
  // Add VERSION file
  zip.file('VERSION', '1');
  
  // Add any raw files (like icons)
  for (const file of rawFiles) {
    if (file.path.startsWith('icons/')) {
      // Create icons directory if needed
      zip.file(file.path, file.content);
    }
  }
  
  // Generate the ZIP file
  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Builds a .comapeocat file using the API
 */
export async function buildComapeoCatFile(zipBlob: Blob): Promise<Blob> {
  const formData = new FormData();
  formData.append('file', zipBlob, 'config.zip');
  
  const response = await fetch('/api/build', {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Build API error: ${response.status} ${errorText}`);
  }
  
  return await response.blob();
}
