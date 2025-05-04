import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the test file
const comapeocatFilePath = path.join(__dirname, 'test_files', 'sample.comapeocat');

// Function to extract the ZIP contents and analyze the structure
async function analyzeComapeoCat(filePath) {
  console.log(`Analyzing file: ${filePath}`);
  
  try {
    // Read the file
    const fileData = fs.readFileSync(filePath);
    console.log(`File size: ${fileData.length} bytes`);
    
    // Check if it's a ZIP file (simply checking the first bytes)
    if (fileData[0] !== 0x50 || fileData[1] !== 0x4B) {
      console.error('File does not appear to be a valid ZIP file');
      return;
    }
    
    // Try to extract using JSZip
    const zip = new JSZip();
    const zipContents = await zip.loadAsync(fileData);
    
    console.log('Zip structure:');
    const files = [];
    
    // List all files in the ZIP
    for (const filename in zipContents.files) {
      const file = zipContents.files[filename];
      if (!file.dir) {
        console.log(`- ${filename} (${file._data.compressedSize} bytes)`);
        files.push(filename);
      } else {
        console.log(`- ${filename} (directory)`);
      }
    }
    
    // Check for important files
    console.log('\nLooking for key configuration files:');
    
    // Check for config.json (unified format)
    if (zipContents.files['config.json']) {
      console.log('✅ Found config.json (unified format)');
      const content = await zipContents.files['config.json'].async('string');
      try {
        const config = JSON.parse(content);
        console.log('\nConfig structure:');
        
        // Print metadata
        if (config.metadata) {
          console.log('- metadata:');
          console.log(`  - name: ${config.metadata.name}`);
          console.log(`  - version: ${config.metadata.version}`);
        }
        
        // Print fields count
        if (config.fields) {
          const fieldsCount = typeof config.fields === 'object' ? 
            Object.keys(config.fields).length : 
            (Array.isArray(config.fields) ? config.fields.length : 0);
          console.log(`- fields: ${fieldsCount} items`);
          
          // Print first field as example
          const firstField = typeof config.fields === 'object' ? 
            config.fields[Object.keys(config.fields)[0]] : 
            (Array.isArray(config.fields) ? config.fields[0] : null);
          
          if (firstField) {
            console.log('  Sample field:');
            console.log(`  - ${JSON.stringify(firstField).substring(0, 200)}...`);
          }
        }
        
        // Print presets count
        if (config.presets) {
          const presetsCount = typeof config.presets === 'object' ? 
            Object.keys(config.presets).length : 
            (Array.isArray(config.presets) ? config.presets.length : 0);
          console.log(`- presets: ${presetsCount} items`);
        }
        
        // Print translations
        if (config.translations) {
          const locales = Object.keys(config.translations);
          console.log(`- translations: ${locales.length} languages (${locales.join(', ')})`);
        }
      } catch (error) {
        console.error('❌ Error parsing config.json:', error.message);
      }
    } else {
      console.log('❌ config.json not found, checking for individual files');
      
      // Check for individual files
      const configFiles = [
        'metadata.json',
        'presets.json',
        'fields.json',
        'translations.json',
        'icons.json'
      ];
      
      // Object to store the parsed components to later create a unified config
      const configComponents = {};
      
      for (const configFile of configFiles) {
        if (zipContents.files[configFile]) {
          console.log(`✅ Found ${configFile}`);
          const content = await zipContents.files[configFile].async('string');
          try {
            const data = JSON.parse(content);
            // Save the component for later unification
            configComponents[configFile.replace('.json', '')] = data;
            
            // Show detailed information about the component
            if (configFile === 'metadata.json') {
              console.log(`  - name: ${data.name}`);
              console.log(`  - version: ${data.version}`);
              console.log(`  - description: ${data.description || 'N/A'}`);
            }
            else if (configFile === 'presets.json') {
              const count = Array.isArray(data) ? data.length : Object.keys(data).length;
              console.log(`  - Contains ${count} items`);
              
              // Show the first preset as an example
              if (Array.isArray(data) && data.length > 0) {
                const preset = data[0];
                console.log("  - Sample preset:");
                console.log(`    id: ${preset.id}`);
                console.log(`    name: ${preset.name}`);
                console.log(`    geometry: ${preset.geometry?.join(', ') || 'N/A'}`);
                console.log(`    icon: ${preset.icon || 'N/A'}`);
                console.log(`    fields: ${preset.fields?.length || 0} references`);
              } else if (typeof data === 'object') {
                const presetId = Object.keys(data)[0];
                if (presetId) {
                  const preset = data[presetId];
                  console.log(`  - Sample preset (${presetId}):`);
                  console.log(`    name: ${preset.name}`);
                  console.log(`    geometry: ${preset.geometry?.join(', ') || 'N/A'}`);
                  console.log(`    icon: ${preset.icon || 'N/A'}`);
                  console.log(`    fields: ${preset.fields?.length || 0} references`);
                }
              }
            }
            else if (configFile === 'fields.json') {
              const count = Array.isArray(data) ? data.length : Object.keys(data).length;
              console.log(`  - Contains ${count} items`);
              
              // Show the first field as an example
              if (Array.isArray(data) && data.length > 0) {
                const field = data[0];
                console.log("  - Sample field:");
                console.log(`    id: ${field.id}`);
                console.log(`    key: ${field.key || field.tagKey}`);
                console.log(`    type: ${field.type}`);
                if (field.options) {
                  console.log(`    options: ${field.options.length} options`);
                }
              } else if (typeof data === 'object') {
                const fieldId = Object.keys(data)[0];
                if (fieldId) {
                  const field = data[fieldId];
                  console.log(`  - Sample field (${fieldId}):`);
                  console.log(`    key: ${field.key || field.tagKey}`);
                  console.log(`    type: ${field.type}`);
                  if (field.options) {
                    const optionsCount = Array.isArray(field.options) ? 
                      field.options.length : Object.keys(field.options).length;
                    console.log(`    options: ${optionsCount} options`);
                  }
                }
              }
            }
            else if (configFile === 'translations.json') {
              const locales = Object.keys(data);
              console.log(`  - Contains translations for ${locales.length} languages: ${locales.join(', ')}`);
              
              // Show a sample translation for the first locale
              if (locales.length > 0) {
                const locale = locales[0];
                const localeData = data[locale];
                console.log(`  - Sample translations for ${locale}:`);
                const categories = Object.keys(localeData);
                console.log(`    Categories: ${categories.join(', ')}`);
              }
            }
            else if (configFile === 'icons.json') {
              console.log(`  - Contains ${Object.keys(data).length} icon definitions`);
            }
          } catch (error) {
            console.error(`❌ Error parsing ${configFile}:`, error.message);
          }
        } else {
          console.log(`❌ ${configFile} not found`);
        }
      }
      
      // Print a summary of the reconstructed config
      console.log('\nReconstructed Configuration Summary:');
      if (Object.keys(configComponents).length > 0) {
        for (const component in configComponents) {
          console.log(`- Found ${component} component`);
        }
        
        // Detecting format (Mapeo vs CoMapeo)
        if (configComponents.metadata) {
          const isMapeo = configComponents.metadata.hasOwnProperty('dataset_id');
          console.log(`\nFormat detected: ${isMapeo ? 'Mapeo' : 'CoMapeo'}`);
          
          if (isMapeo) {
            console.log('Note: This appears to be a Mapeo configuration that needs conversion to CoMapeo format.');
          }
        }
      }
    }
    
    // Check for icons
    console.log('\nChecking for icon files:');
    const iconFiles = files.filter(file => file.startsWith('icons/') && file.endsWith('.svg'));
    console.log(`Found ${iconFiles.length} icon files`);
    if (iconFiles.length > 0) {
      console.log('Icon examples:');
      for (let i = 0; i < Math.min(3, iconFiles.length); i++) {
        console.log(`- ${iconFiles[i]}`);
      }
    }
    
  } catch (error) {
    console.error('Error processing file:', error);
  }
}

// Run the analysis
analyzeComapeoCat(comapeocatFilePath)
  .then(() => console.log('Analysis complete'))
  .catch(err => console.error('Analysis failed:', err));