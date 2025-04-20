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

  // First, check if there's a single config.json file
  if (zipContents.files['config.json']) {
    const configContent = await zipContents.files['config.json'].async('string');
    files.push({
      name: 'config.json',
      content: configContent,
      path: 'config.json'
    });
    
    console.log('Found config.json in zip file:', configContent.substring(0, 200) + '...');
  }

  // Process all other files
  for (const path in zipContents.files) {
    const zipEntry = zipContents.files[path];
    if (!zipEntry.dir && path !== 'config.json') {
      const content = await zipEntry.async('string');
      
      try {
        // Try to parse JSON files to verify their format
        if (path.endsWith('.json')) {
          JSON.parse(content);
        }
        
        files.push({
          name: zipEntry.name.split('/').pop() || '',
          content,
          path
        });
        
        console.log(`Extracted file: ${path}, size: ${content.length}`);
      } catch (error) {
        console.error(`Error parsing file ${path}:`, error);
      }
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
  
  // Create a single config.json file for CoMapeo format
  const combinedConfig = {
    metadata: config.metadata,
    fields: {},
    presets: {},
    translations: config.translations,
    icons: config.icons
  };
  
  // Convert fields array to object map
  if (Array.isArray(config.fields)) {
    config.fields.forEach(field => {
      combinedConfig.fields[field.id] = {
        tagKey: field.tagKey,
        type: field.type,
        label: field.name,
        helperText: field.helperText || '',
        universal: field.universal || false,
        options: field.options || []
      };
    });
  }
  
  // Convert presets array to object map
  if (Array.isArray(config.presets)) {
    config.presets.forEach(preset => {
      combinedConfig.presets[preset.id] = {
        name: preset.name,
        tags: preset.tags || {},
        color: preset.color || '#000000',
        icon: preset.icon || 'default',
        fields: preset.fieldRefs || [],
        removeTags: preset.removeTags || {},
        addTags: preset.addTags || {},
        geometry: preset.geometry || ['point']
      };
    });
  }
  
  // Add the combined config
  zip.file('config.json', JSON.stringify(combinedConfig, null, 2));
  
  // Also add individual files for compatibility
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
