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
export function convertMapeoToCoMapeo(mapeoConfig: MapeoConfig | Record<string, any>): CoMapeoConfig {
  // Handle presets.json format where fields and presets are in the same file
  let fields = mapeoConfig.fields;
  let presets = mapeoConfig.presets;

  // Special case for Mapeo format where presets.json contains both fields and presets
  if (!fields && !presets && mapeoConfig.presets && mapeoConfig.presets.fields) {
    fields = mapeoConfig.presets.fields;
    presets = mapeoConfig.presets.presets;
    console.log('Detected Mapeo format with fields and presets in presets.json');
  }

  return {
    metadata: convertMetadata(mapeoConfig.metadata),
    fields: convertFields(fields),
    presets: convertPresets(presets),
    translations: convertTranslations(mapeoConfig.translations),
    icons: mapeoConfig.icons || {}
  };
}

/**
 * Converts Mapeo metadata to CoMapeo metadata
 */
function convertMetadata(mapeoMetadata: MapeoConfig['metadata']): CoMapeoConfig['metadata'] {
  // Handle missing or undefined version
  let version = '1.0.0'; // Default version if none is provided

  if (mapeoMetadata && mapeoMetadata.version) {
    // Convert version format (remove 'v' prefix if present)
    version = typeof mapeoMetadata.version === 'string' && mapeoMetadata.version.startsWith('v')
      ? mapeoMetadata.version.substring(1)
      : mapeoMetadata.version;
  }

  return {
    name: mapeoMetadata && mapeoMetadata.name ? mapeoMetadata.name : 'converted-mapeo-config',
    version: version,
    fileVersion: '1',
    buildDate: new Date().toISOString(),
    description: mapeoMetadata && mapeoMetadata.dataset_id
      ? `Converted from Mapeo dataset: ${mapeoMetadata.dataset_id}`
      : 'Converted from Mapeo configuration'
  };
}

/**
 * Converts Mapeo fields to CoMapeo fields
 */
function convertFields(mapeoFields: MapeoField[] | Record<string, any>): CoMapeoField[] {
  // Handle both array and object formats
  if (!mapeoFields) return [];

  // If mapeoFields is an object map, convert it to an array
  const fieldsArray = Array.isArray(mapeoFields)
    ? mapeoFields
    : Object.entries(mapeoFields).map(([id, field]) => ({
        id,
        ...field
      }));

  return fieldsArray.map(field => {
    // Convert field type format (e.g., 'select_one' to 'selectOne')
    let type = field.type || 'text';
    if (type === 'select_one') type = 'selectOne';
    if (type === 'select_many') type = 'selectMany';

    const coMapeoField: CoMapeoField = {
      id: field.id,
      name: field.label || field.id, // Use label if available, otherwise id
      tagKey: field.key || field.id, // 'key' in Mapeo becomes 'tagKey' in CoMapeo
      type: type,
      universal: !!field.universal,
      helperText: field.placeholder || '' // 'placeholder' in Mapeo becomes 'helperText' in CoMapeo
    };

    // Convert options format if present
    if (field.options) {
      if (Array.isArray(field.options)) {
        coMapeoField.options = field.options.map((opt: string) => {
          return { label: opt, value: opt.toLowerCase().replace(/\s+/g, '_') };
        });
      } else if (typeof field.options === 'object') {
        // Handle object format options
        coMapeoField.options = Object.entries(field.options).map(([value, label]) => {
          // Handle quoted keys in Mapeo format
          const cleanValue = value.replace(/^\"|\"$/g, '');
          // Handle case where label is an object with a label property
          let labelText = cleanValue;
          if (typeof label === 'string') {
            labelText = label;
          } else if (label && typeof label === 'object' && 'label' in label && typeof label.label === 'string') {
            labelText = label.label;
          }

          return {
            label: labelText,
            value: cleanValue.toLowerCase().replace(/\s+/g, '_')
          };
        });
      }
    }

    return coMapeoField;
  });
}

/**
 * Converts Mapeo presets to CoMapeo presets
 */
function convertPresets(mapeoPresets: MapeoPreset[] | Record<string, any>): CoMapeoPreset[] {
  // Handle both array and object formats
  if (!mapeoPresets) return [];

  // If mapeoPresets is an object map, convert it to an array
  const presetsArray = Array.isArray(mapeoPresets)
    ? mapeoPresets
    : Object.entries(mapeoPresets).map(([id, preset]) => ({
        id,
        ...preset
      }));

  return presetsArray.map(preset => {
    // Generate a default color based on the preset id
    // This is a simple hash function to generate a color
    const hash = preset.id.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const color = `#${(hash & 0x00FFFFFF).toString(16).padStart(6, '0')}`;

    return {
      id: preset.id,
      name: preset.name || preset.id,
      tags: preset.tags || {},
      color: color,
      icon: preset.icon || 'default',
      fieldRefs: preset.fields || [],
      removeTags: preset.removeTags || {},
      addTags: preset.addTags || {},
      geometry: preset.geometry || ['point']
    };
  });
}

/**
 * Converts Mapeo translations to CoMapeo translations
 */
function convertTranslations(mapeoTranslations: Record<string, any>): Record<string, Record<string, any>> {
  if (!mapeoTranslations) return {};

  const coMapeoTranslations: Record<string, Record<string, any>> = {};

  // Process each language
  for (const [lang, translations] of Object.entries(mapeoTranslations)) {
    coMapeoTranslations[lang] = {};

    // Check if translations is a flat object or has nested structure
    if (translations && typeof translations === 'object') {
      if (translations.fields || translations.presets) {
        // It's already in the nested format we want
        coMapeoTranslations[lang] = JSON.parse(JSON.stringify(translations));

        // Clean up any quoted keys in options
        if (translations.fields) {
          for (const fieldKey in translations.fields) {
            const field = translations.fields[fieldKey];
            if (field && field.options) {
              const cleanOptions: Record<string, any> = {};
              for (const optKey in field.options) {
                // Remove quotes from keys
                const cleanKey = optKey.replace(/^\"|\"/g, '');
                // Handle case where option value is an object with a label property
                const optValue = field.options[optKey];
                if (typeof optValue === 'string') {
                  cleanOptions[cleanKey] = optValue;
                } else if (optValue && typeof optValue === 'object' && 'label' in optValue) {
                  cleanOptions[cleanKey] = { label: optValue.label };
                } else {
                  cleanOptions[cleanKey] = optValue;
                }
              }
              field.options = cleanOptions;
            }
          }
        }
      } else {
        // It's a flat structure, process each key
        for (const [key, value] of Object.entries(translations)) {
          // Handle odd quote keys which may be present in Mapeo translations
          const cleanKey = key.replace(/["']/g, '');

          // Check if this is a nested path (e.g., 'fields/building-type/label')
          if (cleanKey.includes('/')) {
            const parts = cleanKey.split('/');
            let current = coMapeoTranslations[lang];

            // Create nested structure
            for (let i = 0; i < parts.length - 1; i++) {
              const part = parts[i];
              if (!current[part]) {
                current[part] = {};
              }
              current = current[part];
            }

            // Set the value at the final key
            current[parts[parts.length - 1]] = value;
          } else {
            // Simple key-value pair
            coMapeoTranslations[lang][cleanKey] = value;
          }
        }
      }
    }
  }

  return coMapeoTranslations;
}
