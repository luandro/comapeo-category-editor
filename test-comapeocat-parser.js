import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the test file
const comapeocatFilePath = path.join(__dirname, 'test_files', 'sample.comapeocat');

/**
 * Extract and analyze the contents of a .comapeocat file
 */
async function analyzeComapeoCat(filePath) {
  console.log(`Analyzing file: ${filePath}`);
  
  try {
    // Read the file
    const fileData = fs.readFileSync(filePath);
    console.log(`File size: ${fileData.length} bytes`);
    
    // Extract using JSZip
    const zip = new JSZip();
    const zipContents = await zip.loadAsync(fileData);
    
    console.log('Zip structure:');
    const files = [];
    
    // List all files in the ZIP
    for (const filename in zipContents.files) {
      const file = zipContents.files[filename];
      if (!file.dir) {
        const size = file._data ? file._data.compressedSize : 'unknown';
        console.log(`- ${filename} (${size} bytes)`);
        files.push(filename);
      } else {
        console.log(`- ${filename} (directory)`);
      }
    }
    
    // Check for important files
    console.log('\nExtracting configuration files:');
    
    // The component files we're looking for
    const configComponents = {};
    
    // Check if there's a unified config.json
    if (zipContents.files['config.json']) {
      console.log('✅ Found config.json (unified format)');
      const content = await zipContents.files['config.json'].async('string');
      try {
        configComponents.unified = JSON.parse(content);
      } catch (error) {
        console.error('Error parsing config.json:', error.message);
      }
    }
    
    // Check for individual component files
    const componentFiles = [
      'metadata.json',
      'presets.json',
      'fields.json',
      'translations.json',
      'icons.json'
    ];
    
    for (const file of componentFiles) {
      if (zipContents.files[file]) {
        console.log(`✅ Found ${file}`);
        const content = await zipContents.files[file].async('string');
        try {
          configComponents[file.replace('.json', '')] = JSON.parse(content);
        } catch (error) {
          console.error(`Error parsing ${file}:`, error.message);
        }
      } else {
        console.log(`❌ ${file} not found`);
      }
    }
    
    // Check VERSION file
    if (zipContents.files.VERSION) {
      console.log('✅ Found VERSION file');
      const content = await zipContents.files.VERSION.async('string');
      console.log(`  Version: ${content.trim()}`);
    }
    
    // Analyze icon files
    const pngIcons = files.filter(file => file.startsWith('icons/') && file.endsWith('.png'));
    const svgIcons = files.filter(file => file.startsWith('icons/') && file.endsWith('.svg'));
    
    console.log(`\nIcon files: ${pngIcons.length} PNG icons, ${svgIcons.length} SVG icons`);
    
    // Extract unique icon names (without size and extension)
    const iconNames = new Set();
    
    for (const icon of pngIcons) {
      // Extract the icon name without size and extension
      // Format is typically: icons/name-size@resolution.png
      const match = icon.match(/icons\/([a-z-]+)-(?:small|medium|large)@\d+x\.png/);
      if (match?.[1]) {
        iconNames.add(match[1]);
      }
    }
    
    console.log(`Found ${iconNames.size} unique icons:`);
    console.log(Array.from(iconNames).join(', '));
    
    // Check if we have necessary components to create a unified config
    const hasComponents = Object.keys(configComponents).some(k => k !== 'unified');
    
    if (hasComponents) {
      console.log('\nCreating unified configuration from components...');
      
      // Create the unified config
      const unifiedConfig = {
        metadata: configComponents.metadata || {},
        presets: configComponents.presets || [],
        fields: configComponents.fields || [],
        translations: configComponents.translations || {},
        icons: configComponents.icons || {}
      };
      
      // Detect if it's a Mapeo or CoMapeo format
      const isMapeo = configComponents.metadata?.hasOwnProperty('dataset_id');
      console.log(`Format detected: ${isMapeo ? 'Mapeo' : 'CoMapeo'}`);
      
      // If it's Mapeo, mark for conversion
      if (isMapeo) {
        console.log('This is a Mapeo configuration that needs to be converted to CoMapeo format');
      }
      
      // Check preset structure - if it's an object, convert to array
      if (configComponents.presets && !Array.isArray(configComponents.presets)) {
        console.log('Converting presets from object to array format...');
        const presetsArray = [];
        for (const id in configComponents.presets) {
          presetsArray.push({
            id,
            ...configComponents.presets[id]
          });
        }
        unifiedConfig.presets = presetsArray;
      }
      
      // Check fields structure - if it's an object, convert to array
      if (configComponents.fields && !Array.isArray(configComponents.fields)) {
        console.log('Converting fields from object to array format...');
        const fieldsArray = [];
        for (const id in configComponents.fields) {
          fieldsArray.push({
            id,
            ...configComponents.fields[id]
          });
        }
        unifiedConfig.fields = fieldsArray;
      }
      
      // Extract all JSON files for inspection
      console.log('\nExtracting JSON files for inspection...');
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      for (const jsonFile of jsonFiles) {
        const content = await zipContents.files[jsonFile].async('string');
        const outputPath = path.join(__dirname, 'test_files', path.basename(jsonFile));
        fs.writeFileSync(outputPath, content);
        console.log(`  Extracted ${jsonFile} to test_files/${path.basename(jsonFile)}`);
      }
      
      // Create a config file that can be used for testing
      console.log('\nWriting unified config to test_files/test-config.json...');
      fs.writeFileSync(
        path.join(__dirname, 'test_files', 'test-config.json'), 
        JSON.stringify(unifiedConfig, null, 2)
      );
      
      // Create icons array to help with debugging
      const iconFiles = [];
      for (const icon of svgIcons) {
        const content = await zipContents.files[icon].async('text');
        iconFiles.push({
          name: path.basename(icon),
          path: icon,
          content
        });
      }
      
      if (pngIcons.length > 0 && pngIcons.length < 10) {
        // Only extract a few PNGs for testing if there aren't too many
        for (const icon of pngIcons.slice(0, 5)) {
          const content = await zipContents.files[icon].async('arraybuffer');
          iconFiles.push({
            name: path.basename(icon),
            path: icon,
            content
          });
        }
      }
      
      console.log(`Collected ${iconFiles.length} icon files for testing`);
      
      // Return data for further processing/fixes
      return {
        config: unifiedConfig,
        iconFiles,
        isMapeo,
        iconNames: Array.from(iconNames)
      };
    }
    
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
}

// Run the analysis
analyzeComapeoCat(comapeocatFilePath)
  .then(result => {
    if (result) {
      console.log('\nAnalysis complete with unified config created');
      
      // Create a fix summary based on the findings
      console.log('\n=== FIXES NEEDED ===');
      
      // 1. Check if file-handling.ts needs to handle separate JSON files
      console.log('1. Update file-handling.ts to reconstruct a unified config from separate files');
      
      // 2. Check if icon handling needs updates
      console.log('2. Handle both SVG and PNG icons in different sizes (@1x, @2x, @3x)');
      
      // 3. Check for missing fields.json
      if (!result.config.fields || result.config.fields.length === 0) {
        console.log('3. Handle missing fields.json by creating an empty fields array');
      }
      
      // 4. Format conversion if needed
      if (result.isMapeo) {
        console.log('4. Ensure proper conversion from Mapeo to CoMapeo format');
      }
    }
  })
  .catch(err => console.error('Analysis failed:', err));