import type { CoMapeoConfig, ConfigFile } from '@shared/schema';
import JSZip from 'jszip';
import { apiRequest } from './queryClient';

/**
 * Progress callback type for file extraction
 */
export type ProgressCallback = (progress: number, message: string) => void;

/**
 * Extracts files from a .comapeocat (ZIP) file
 * @param file The ZIP file to extract
 * @param onProgress Optional callback for progress updates
 */
export async function extractZipFile(
  file: File,
  onProgress?: ProgressCallback
): Promise<ConfigFile[]> {
  // Report initial progress
  onProgress?.(5, 'Reading ZIP file...');

  const zip = new JSZip();
  const zipContents = await zip.loadAsync(file, {
    // Add progress callback for loading the zip
    onprogress: (metadata) => {
      if (metadata.percent) {
        // Map the JSZip loading progress to 5-15% of our overall progress
        const loadProgress = 5 + Math.floor(metadata.percent / 10);
        onProgress?.(loadProgress, `Loading ZIP file: ${Math.floor(metadata.percent)}%`);
      }
    },
  });

  onProgress?.(15, 'Analyzing ZIP structure...');
  const files: ConfigFile[] = [];

  // The component files we need to look for
  const configComponents: Record<string, any> = {};
  const componentFileNames = [
    'metadata.json',
    'presets.json',
    'fields.json',
    'translations.json',
    'icons.json',
  ];

  // Flag to determine if we need to extract and combine components
  let hasConfigJson = false;
  let hasComponentFiles = false;

  // Count total files for progress reporting
  const totalFiles = Object.keys(zipContents.files).length;
  let processedFiles = 0;

  // First, check if there's a single config.json file
  onProgress?.(20, 'Checking for configuration files...');
  if (zipContents.files['config.json']) {
    hasConfigJson = true;
    const configContent = await zipContents.files['config.json'].async('string');
    files.push({
      name: 'config.json',
      content: configContent,
      path: 'config.json',
    });

    console.log('Found config.json in zip file:', `${configContent.substring(0, 200)}...`);
  }

  // Process all files in the ZIP
  onProgress?.(25, 'Extracting files from ZIP...');
  for (const path in zipContents.files) {
    const zipEntry = zipContents.files[path];
    if (!zipEntry.dir) {
      // Check if this is a component file we're interested in
      const fileName = zipEntry.name.split('/').pop() || '';

      // Process all files to extract them
      try {
        // For JSON files, we validate them and optionally store for combining
        if (path.endsWith('.json')) {
          if (!hasConfigJson && componentFileNames.includes(fileName)) {
            // This is a component file we need to track
            hasComponentFiles = true;
            const content = await zipEntry.async('string');
            const parsedData = JSON.parse(content);
            configComponents[fileName.replace('.json', '')] = parsedData;

            // Also add the raw file to our list
            files.push({
              name: fileName,
              content,
              path,
            });

            console.log(`Extracted component file: ${path}, size: ${content.length}`);
          } else if (!hasConfigJson || path !== 'config.json') {
            // Any other JSON file that's not already processed config.json
            const content = await zipEntry.async('string');
            JSON.parse(content); // Validate but don't store the result

            files.push({
              name: fileName,
              content,
              path,
            });

            console.log(`Extracted file: ${path}, size: ${content.length}`);
          }
        }
        // For icons and other binary files, we determine the appropriate method
        else if (path.startsWith('icons/')) {
          // We need to handle both text-based SVG files and binary PNG files
          let content: string | ArrayBuffer;

          if (path.endsWith('.svg')) {
            content = await zipEntry.async('string');
            // Ensure SVG content is properly formatted
            if (typeof content === 'string' && content.trim().startsWith('<svg')) {
              // SVG content is valid
              console.log(`Valid SVG content extracted for ${path}`);
            } else {
              console.warn(`Possibly invalid SVG content in ${path}`);
            }
          } else if (path.endsWith('.png')) {
            content = await zipEntry.async('arraybuffer');
          } else {
            // Default to string for other files
            content = await zipEntry.async('string');
          }

          files.push({
            name: fileName,
            content,
            path,
          });

          console.log(`Extracted icon file: ${path}`);
        }
        // Handle VERSION file and other non-icon, non-JSON files
        else {
          const content = await zipEntry.async('string');

          files.push({
            name: fileName,
            content,
            path,
          });

          console.log(`Extracted file: ${path}, size: ${content.length}`);
        }
      } catch (error) {
        console.error(`Error processing file ${path}:`, error);
      }
    }

    // Update progress (25-75% range)
    processedFiles++;
    const extractionProgress = 25 + Math.floor((50 * processedFiles) / totalFiles);
    onProgress?.(extractionProgress, `Extracting files (${processedFiles}/${totalFiles})...`);
  }

  // If we have component files but no config.json, create one
  onProgress?.(80, 'Processing configuration components...');
  if (!hasConfigJson && hasComponentFiles) {
    console.log('No config.json found, reconstructing from component files...');

    // Attempt to build a unified config
    const unifiedConfig = {
      metadata: configComponents.metadata || {},
      presets: [],
      fields: [],
      translations: configComponents.translations || {},
      icons: configComponents.icons || {},
    };

    // Extract fields from presets.json if present and there's no fields.json
    if (configComponents.presets && !configComponents.fields) {
      const extractedFields: Record<string, any> = {};

      // In some formats, fields are defined within the presets.json file
      if (configComponents.presets.fields) {
        // Fields are nested under the "fields" key in presets.json
        for (const fieldId in configComponents.presets.fields) {
          if (Object.prototype.hasOwnProperty.call(configComponents.presets.fields, fieldId)) {
            const field = configComponents.presets.fields[fieldId];

            // Convert to our field format
            extractedFields[fieldId] = {
              id: fieldId,
              ...field,
            };
          }
        }

        // Add fields to our component tracking
        configComponents.fields = extractedFields;
      }
    }

    // Check and convert presets if present
    if (configComponents.presets) {
      let presetsArray: any[] = [];

      // Handle case when presets.json contains actual presets (not under a 'presets' key)
      if (
        typeof configComponents.presets === 'object' &&
        !Array.isArray(configComponents.presets)
      ) {
        // Check if it has a "presets" key or is a direct object map of presets
        const presetsMap = configComponents.presets.presets || configComponents.presets;

        // Filter out the fields and other special entries
        const excludedKeys = ['fields', 'categories'];

        for (const presetId in presetsMap) {
          if (
            Object.prototype.hasOwnProperty.call(presetsMap, presetId) &&
            !excludedKeys.includes(presetId)
          ) {
            const preset = presetsMap[presetId];

            // Convert to our preset format
            presetsArray.push({
              id: presetId,
              name: preset.name,
              tags: preset.tags || {},
              color: preset.color || '#000000',
              icon: preset.icon || 'default',
              geometry: preset.geometry || ['point'],
              fieldRefs: preset.fields || [],
            });
          }
        }
      } else if (Array.isArray(configComponents.presets)) {
        // Presets are already in an array format
        presetsArray = configComponents.presets;
      }

      unifiedConfig.presets = presetsArray;
    }

    // Check and convert fields if present
    if (configComponents.fields) {
      let fieldsArray: any[] = [];

      if (typeof configComponents.fields === 'object' && !Array.isArray(configComponents.fields)) {
        for (const fieldId in configComponents.fields) {
          if (Object.prototype.hasOwnProperty.call(configComponents.fields, fieldId)) {
            const field = configComponents.fields[fieldId];

            // Convert to our field format
            fieldsArray.push({
              id: fieldId,
              name: field.label || fieldId,
              tagKey: field.tagKey || field.key || fieldId,
              type: field.type || 'text',
              universal: field.universal || false,
              helperText: field.helperText || field.placeholder || '',
              options: field.options || [],
            });
          }
        }
      } else if (Array.isArray(configComponents.fields)) {
        // Fields are already in an array format
        fieldsArray = configComponents.fields;
      }

      unifiedConfig.fields = fieldsArray;
    }

    // Create a unified config.json file
    const configContent = JSON.stringify(unifiedConfig, null, 2);
    files.push({
      name: 'config.json',
      content: configContent,
      path: 'config.json',
    });

    console.log('Created unified config.json from component files');
  }

  onProgress?.(95, 'Finalizing configuration...');
  return files;
}

/**
 * Extracts files from a .mapeosettings (TAR) file
 * @param file The TAR file to extract
 * @param onProgress Optional callback for progress updates
 */
export async function extractTarFile(
  file: File,
  onProgress?: ProgressCallback
): Promise<ConfigFile[]> {
  // Since we can't directly use tar-js in the browser easily,
  // we'll use a streaming approach with a worker or other library
  // For now, we'll implement a basic extraction

  // Report initial progress
  onProgress?.(5, 'Reading file contents...');

  const arrayBuffer = await file.arrayBuffer();
  const files: ConfigFile[] = [];

  // Report progress after file is loaded into memory
  onProgress?.(10, 'Analyzing file structure...');

  let offset = 0;
  const _view = new DataView(arrayBuffer);
  const totalSize = arrayBuffer.byteLength;
  let fileCount = 0;
  let processedBytes = 0;

  // First pass to count files for better progress reporting
  let countOffset = 0;
  while (countOffset < totalSize) {
    // Check if we have a valid header
    const headerSlice = arrayBuffer.slice(countOffset, countOffset + 512);
    let hasContent = false;

    // Check if header has content (not all zeros)
    for (let i = 0; i < 100; i++) {
      if (new Uint8Array(headerSlice)[i] !== 0) {
        hasContent = true;
        break;
      }
    }

    if (!hasContent) break;

    // Extract file size to skip to next header
    let fileSizeOctal = '';
    for (let i = 124; i < 136; i++) {
      const byte = new Uint8Array(headerSlice)[i];
      if (byte === 0 || byte === 32) break;
      fileSizeOctal += String.fromCharCode(byte);
    }

    const fileSize = Number.parseInt(fileSizeOctal, 8);
    countOffset += 512; // Move past header

    if (fileSize > 0) {
      fileCount++;
      countOffset += Math.ceil(fileSize / 512) * 512;
    } else {
      countOffset += 512;
    }
  }

  onProgress?.(15, `Found ${fileCount} files in archive...`);

  // Second pass to actually extract files
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

    const fileSize = Number.parseInt(fileSizeOctal, 8);
    offset += 512; // Move past header

    if (fileSize > 0) {
      // Read file content
      const contentBuffer = arrayBuffer.slice(offset, offset + fileSize);
      const fileName = filename.split('/').pop() || '';

      try {
        // Process different file types
        if (filename.endsWith('.json') || filename === 'VERSION') {
          // Text files - convert to string
          const textDecoder = new TextDecoder('utf-8');
          const content = textDecoder.decode(contentBuffer);

          files.push({
            name: fileName,
            content: content,
            path: filename,
          });

          console.log(`Extracted text file: ${filename}, size: ${content.length}`);
        } else if (filename.endsWith('.svg')) {
          // SVG files - convert to string
          const textDecoder = new TextDecoder('utf-8');
          const content = textDecoder.decode(contentBuffer);

          files.push({
            name: fileName,
            content: content,
            path: filename,
          });

          console.log(`Extracted SVG file: ${filename}, size: ${content.length}`);
        } else if (filename.endsWith('.png') || filename.includes('icons/')) {
          // Binary files - keep as ArrayBuffer
          files.push({
            name: fileName,
            content: contentBuffer,
            path: filename,
          });

          console.log(
            `Extracted binary file: ${filename}, size: ${contentBuffer.byteLength} bytes`
          );
        }
      } catch (error) {
        console.error(`Error processing file ${filename}:`, error);
      }

      // Move to next file, with padding to 512-byte boundary
      const blockSize = Math.ceil(fileSize / 512) * 512;
      offset += blockSize;
      processedBytes += blockSize + 512; // Include header size

      // Calculate extraction progress (15-70% range)
      if (fileCount > 0) {
        const extractionProgress = Math.min(70, 15 + Math.floor((55 * processedBytes) / totalSize));
        onProgress?.(extractionProgress, `Extracting files (${files.length}/${fileCount})...`);
      }
    } else {
      // Skip empty files or directories
      offset += 512;
    }
  }

  // Process the extracted files to create a unified config
  onProgress?.(75, 'Processing extracted files...');
  const configComponents: Record<string, any> = {};

  // Extract JSON components
  for (const file of files) {
    if (file.path.endsWith('.json') && typeof file.content === 'string') {
      try {
        const fileName = file.path.split('/').pop() || '';
        const componentName = fileName.replace('.json', '');
        configComponents[componentName] = JSON.parse(file.content);
        console.log(`Parsed ${fileName} into component: ${componentName}`);
      } catch (error) {
        console.error(`Error parsing JSON file ${file.path}:`, error);
      }
    }
  }

  // Create a unified config from the components
  if (Object.keys(configComponents).length > 0) {
    // Detect if it's a Mapeo format
    const isMapeo = configComponents.metadata?.hasOwnProperty('dataset_id');
    console.log(`Format detected: ${isMapeo ? 'Mapeo' : 'CoMapeo'}`);

    // Create a unified config structure
    const unifiedConfig: any = {
      metadata: configComponents.metadata || {},
      presets: configComponents.presets || {},
      fields: configComponents.fields || {},
      translations: configComponents.translations || {},
      icons: configComponents.icons || {},
    };

    // Add the unified config to the files
    files.push({
      name: 'config.json',
      content: JSON.stringify(unifiedConfig, null, 2),
      path: 'config.json',
    });

    console.log('Created unified config.json from Mapeo components');
  }

  onProgress?.(95, 'Finalizing configuration...');
  return files;
}

/**
 * Creates a ZIP file from the configuration
 */
export async function createZipFile(config: CoMapeoConfig, rawFiles: ConfigFile[]): Promise<Blob> {
  const zip = new JSZip();

  // Prepare to collect presets by geometry type

  // Populate defaults based on presets
  const pointPresets: string[] = [];
  const linePresets: string[] = [];
  const areaPresets: string[] = [];

  // Process presets to populate defaults
  if (Array.isArray(config.presets)) {
    config.presets.forEach((preset) => {
      if (preset.id) {
        // Add to appropriate geometry arrays
        if (preset.geometry.includes('point')) {
          pointPresets.push(preset.id);
        }
        if (preset.geometry.includes('line')) {
          linePresets.push(preset.id);
        }
        if (preset.geometry.includes('area')) {
          areaPresets.push(preset.id);
        }

        // We don't need to add presets to the presets.json file
        // as they're handled separately in the Mapeo format
      }
    });
  }

  // These will be used in the generatePresetsJson function

  // Generate presets.json content in the correct format
  const generatePresetsJson = () => {
    // Start with the basic structure
    const result = {
      categories: {},
      fields: {},
      defaults: {
        area: areaPresets,
        line: linePresets,
        point: pointPresets,
        vertex: [],
        relation: [],
      },
    };

    // Add fields in the correct format
    if (Array.isArray(config.fields)) {
      config.fields.forEach((field) => {
        if (field.id) {
          result.fields[field.id] = {
            tagKey: field.tagKey,
            type: field.type,
            label: field.name,
            helperText: field.helperText || '',
            universal: field.universal || false,
          };

          // Add options if they exist
          if (field.options && field.options.length > 0) {
            result.fields[field.id].options = field.options;
          }
        }
      });
    }

    return result;
  };

  // Add the required files
  zip.file('metadata.json', JSON.stringify(config.metadata, null, 2));
  zip.file('presets.json', JSON.stringify(generatePresetsJson(), null, 2));
  zip.file('translations.json', JSON.stringify(config.translations, null, 2));
  zip.file('icons.json', JSON.stringify(config.icons, null, 2));

  // Add VERSION file
  zip.file('VERSION', '1');

  // Add style.css file (empty or with default styles)
  zip.file('style.css', '/* CoMapeo configuration styles */');

  // Create icons directory
  zip.folder('icons');

  // Add icons.png and icons.svg placeholder files
  // These would normally be sprite sheets generated from individual icons
  zip.file('icons.png', new Uint8Array([]));
  zip.file(
    'icons.svg',
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg>'
  );

  // Add any raw files (like icons)
  for (const file of rawFiles) {
    if (file.path.startsWith('icons/')) {
      // Create icons directory if needed
      if (file.path.endsWith('.png') && file.content instanceof ArrayBuffer) {
        // Handle ArrayBuffer content for PNG files
        zip.file(file.path, file.content);
      } else if (file.path.endsWith('.png') && typeof file.content === 'string') {
        // Handle base64 string content for PNG files
        try {
          // Convert base64 string to ArrayBuffer
          const binary = atob(file.content);
          const array = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
          }
          zip.file(file.path, array.buffer);
        } catch (error) {
          console.error(`Error processing PNG file ${file.path}:`, error);
          // Skip this file if it can't be processed
        }
      } else {
        // Handle SVG and other text-based files
        zip.file(file.path, file.content);
      }
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
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Build API error: ${response.status} ${errorText}`);
  }

  return await response.blob();
}
