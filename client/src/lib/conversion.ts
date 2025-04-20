import { 
  MapeoConfig, 
  CoMapeoConfig, 
  MapeoField, 
  CoMapeoField,
  MapeoPreset,
  CoMapeoPreset,
  OptionType
} from '@shared/schema';

/**
 * Converts a Mapeo configuration to CoMapeo format
 */
export function convertMapeoToCoMapeo(mapeoConfig: MapeoConfig): CoMapeoConfig {
  return {
    metadata: convertMetadata(mapeoConfig.metadata),
    fields: convertFields(mapeoConfig.fields),
    presets: convertPresets(mapeoConfig.presets),
    translations: convertTranslations(mapeoConfig.translations),
    icons: mapeoConfig.icons
  };
}

/**
 * Converts Mapeo metadata to CoMapeo metadata
 */
function convertMetadata(mapeoMetadata: MapeoConfig['metadata']): CoMapeoConfig['metadata'] {
  // Convert version format (remove 'v' prefix if present)
  const version = mapeoMetadata.version.startsWith('v') 
    ? mapeoMetadata.version.substring(1) 
    : mapeoMetadata.version;
  
  return {
    name: mapeoMetadata.name || 'converted-mapeo-config',
    version: version,
    fileVersion: '1',
    buildDate: new Date().toISOString()
  };
}

/**
 * Converts Mapeo fields to CoMapeo fields
 */
function convertFields(mapeoFields: MapeoField[]): CoMapeoField[] {
  return mapeoFields.map(field => {
    // Convert field type format (e.g., 'select_one' to 'selectOne')
    let type = field.type;
    if (type === 'select_one') type = 'selectOne';
    if (type === 'select_many') type = 'selectMany';
    
    const coMapeoField: CoMapeoField = {
      id: field.id,
      name: field.id, // Use id as name if no other name is available
      tagKey: field.key, // 'key' in Mapeo becomes 'tagKey' in CoMapeo
      type: type,
      universal: false,
      helperText: field.placeholder || '' // 'placeholder' in Mapeo becomes 'helperText' in CoMapeo
    };
    
    // Convert options format if present
    if (field.options && Array.isArray(field.options)) {
      coMapeoField.options = field.options.map(opt => {
        return { label: opt, value: opt.toLowerCase().replace(/\s+/g, '_') };
      });
    }
    
    return coMapeoField;
  });
}

/**
 * Converts Mapeo presets to CoMapeo presets
 */
function convertPresets(mapeoPresets: MapeoPreset[]): CoMapeoPreset[] {
  return mapeoPresets.map(preset => {
    // Generate a default color based on the preset id
    // This is a simple hash function to generate a color
    const hash = preset.id.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const color = `#${(hash & 0x00FFFFFF).toString(16).padStart(6, '0')}`;
    
    return {
      id: preset.id,
      name: preset.name,
      tags: preset.tags || {},
      color: color,
      icon: preset.icon || 'default',
      fieldRefs: preset.fields || [],
      geometry: preset.geometry || ['point']
    };
  });
}

/**
 * Converts Mapeo translations to CoMapeo translations
 */
function convertTranslations(mapeoTranslations: Record<string, Record<string, string>>): Record<string, Record<string, string>> {
  const coMapeoTranslations: Record<string, Record<string, string>> = {};
  
  // Process each language
  for (const [lang, translations] of Object.entries(mapeoTranslations)) {
    coMapeoTranslations[lang] = {};
    
    // Process each translation key
    for (const [key, value] of Object.entries(translations)) {
      // Handle odd quote keys which may be present in Mapeo translations
      const cleanKey = key.replace(/["']/g, '');
      coMapeoTranslations[lang][cleanKey] = value;
    }
  }
  
  return coMapeoTranslations;
}
