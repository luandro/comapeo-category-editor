import JSZip from "jszip";
import { ConfigFile, CoMapeoConfig } from "@shared/schema";
import { apiRequest } from "./queryClient";

/**
 * Extracts files from a .comapeocat (ZIP) file
 */
export async function extractZipFile(file: File): Promise<ConfigFile[]> {
  const zip = new JSZip();
  const zipContents = await zip.loadAsync(file);
  const files: ConfigFile[] = [];

  // The component files we need to look for
  const configComponents: Record<string, any> = {};
  const componentFileNames = [
    "metadata.json",
    "presets.json",
    "fields.json",
    "translations.json",
    "icons.json",
  ];

  // Flag to determine if we need to extract and combine components
  let hasConfigJson = false;
  let hasComponentFiles = false;

  // First, check if there's a single config.json file
  if (zipContents.files["config.json"]) {
    hasConfigJson = true;
    const configContent =
      await zipContents.files["config.json"].async("string");
    files.push({
      name: "config.json",
      content: configContent,
      path: "config.json",
    });

    console.log(
      "Found config.json in zip file:",
      configContent.substring(0, 200) + "...",
    );
  }

  // Process all files in the ZIP
  for (const path in zipContents.files) {
    const zipEntry = zipContents.files[path];
    if (!zipEntry.dir) {
      // Check if this is a component file we're interested in
      const fileName = zipEntry.name.split("/").pop() || "";

      // Process all files to extract them
      try {
        // For JSON files, we validate them and optionally store for combining
        if (path.endsWith(".json")) {
          if (!hasConfigJson && componentFileNames.includes(fileName)) {
            // This is a component file we need to track
            hasComponentFiles = true;
            const content = await zipEntry.async("string");
            const parsedData = JSON.parse(content);
            configComponents[fileName.replace(".json", "")] = parsedData;

            // Also add the raw file to our list
            files.push({
              name: fileName,
              content,
              path,
            });

            console.log(
              `Extracted component file: ${path}, size: ${content.length}`,
            );
          } else if (!hasConfigJson || path !== "config.json") {
            // Any other JSON file that's not already processed config.json
            const content = await zipEntry.async("string");
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
        else if (path.startsWith("icons/")) {
          // We need to handle both text-based SVG files and binary PNG files
          let content: string | ArrayBuffer;

          if (path.endsWith(".svg")) {
            content = await zipEntry.async("string");
            // Ensure SVG content is properly formatted
            if (
              typeof content === "string" &&
              content.trim().startsWith("<svg")
            ) {
              // SVG content is valid
              console.log(`Valid SVG content extracted for ${path}`);
            } else {
              console.warn(`Possibly invalid SVG content in ${path}`);
            }
          } else if (path.endsWith(".png")) {
            content = await zipEntry.async("arraybuffer");
          } else {
            // Default to string for other files
            content = await zipEntry.async("string");
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
          const content = await zipEntry.async("string");

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
  }

  // If we have component files but no config.json, create one
  if (!hasConfigJson && hasComponentFiles) {
    console.log("No config.json found, reconstructing from component files...");

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
          if (
            Object.prototype.hasOwnProperty.call(
              configComponents.presets.fields,
              fieldId,
            )
          ) {
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
        typeof configComponents.presets === "object" &&
        !Array.isArray(configComponents.presets)
      ) {
        // Check if it has a "presets" key or is a direct object map of presets
        const presetsMap =
          configComponents.presets.presets || configComponents.presets;

        // Filter out the fields and other special entries
        const excludedKeys = ["fields", "categories"];

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
              color: preset.color || "#000000",
              icon: preset.icon || "default",
              geometry: preset.geometry || ["point"],
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

      if (
        typeof configComponents.fields === "object" &&
        !Array.isArray(configComponents.fields)
      ) {
        for (const fieldId in configComponents.fields) {
          if (
            Object.prototype.hasOwnProperty.call(
              configComponents.fields,
              fieldId,
            )
          ) {
            const field = configComponents.fields[fieldId];

            // Convert to our field format
            fieldsArray.push({
              id: fieldId,
              name: field.label || fieldId,
              tagKey: field.tagKey || field.key || fieldId,
              type: field.type || "text",
              universal: field.universal || false,
              helperText: field.helperText || field.placeholder || "",
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
      name: "config.json",
      content: configContent,
      path: "config.json",
    });

    console.log("Created unified config.json from component files");
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
    let filename = "";
    for (let i = 0; i < 100; i++) {
      const byte = new Uint8Array(header)[i];
      if (byte === 0) break;
      filename += String.fromCharCode(byte);
    }

    if (filename.length === 0) break; // End of archive

    // Extract file size (bytes 124-136)
    let fileSizeOctal = "";
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
      if (
        filename.endsWith(".json") ||
        filename.endsWith(".svg") ||
        filename === "VERSION"
      ) {
        files.push({
          name: filename.split("/").pop() || "",
          content: content,
          path: filename,
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
export async function createZipFile(
  config: CoMapeoConfig,
  rawFiles: ConfigFile[],
): Promise<Blob> {
  const zip = new JSZip();

  // Create a single config.json file for CoMapeo format
  const combinedConfig: {
    metadata: CoMapeoConfig["metadata"];
    fields: Record<string, any>;
    presets: Record<string, any>;
    translations: Record<string, Record<string, string>>;
    icons: Record<string, unknown>;
  } = {
    metadata: config.metadata,
    fields: {},
    presets: {},
    translations: config.translations || {},
    icons: config.icons || {},
  };

  // Convert fields array to object map
  if (Array.isArray(config.fields)) {
    config.fields.forEach((field) => {
      if (field.id) {
        // Using type assertion to avoid TypeScript error
        (combinedConfig.fields as Record<string, any>)[field.id] = {
          tagKey: field.tagKey,
          type: field.type,
          label: field.name,
          helperText: field.helperText || "",
          universal: field.universal || false,
          options: field.options || [],
        };
      }
    });
  }

  // Convert presets array to object map
  if (Array.isArray(config.presets)) {
    config.presets.forEach((preset) => {
      if (preset.id) {
        // Using type assertion to avoid TypeScript error
        (combinedConfig.presets as Record<string, any>)[preset.id] = {
          name: preset.name,
          tags: preset.tags || {},
          color: preset.color || "#000000",
          icon: preset.icon || "default",
          fields: preset.fieldRefs || [],
          removeTags: preset.removeTags || {},
          addTags: preset.addTags || {},
          geometry: preset.geometry || ["point"],
        };
      }
    });
  }

  // Add the combined config
  zip.file("config.json", JSON.stringify(combinedConfig, null, 2));

  // Also add individual files for compatibility
  zip.file("metadata.json", JSON.stringify(config.metadata, null, 2));
  zip.file("presets.json", JSON.stringify(config.presets, null, 2));
  zip.file("fields.json", JSON.stringify(config.fields, null, 2));
  zip.file("translations.json", JSON.stringify(config.translations, null, 2));
  zip.file("icons.json", JSON.stringify(config.icons, null, 2));

  // Add VERSION file
  zip.file("VERSION", "1");

  // Add any raw files (like icons)
  for (const file of rawFiles) {
    if (file.path.startsWith("icons/")) {
      // Create icons directory if needed
      zip.file(file.path, file.content);
    }
  }

  // Generate the ZIP file
  return await zip.generateAsync({ type: "blob" });
}

/**
 * Builds a .comapeocat file using the API
 */
export async function buildComapeoCatFile(zipBlob: Blob): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", zipBlob, "config.zip");

  const response = await fetch("/api/build", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Build API error: ${response.status} ${errorText}`);
  }

  return await response.blob();
}
