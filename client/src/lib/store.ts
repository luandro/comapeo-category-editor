import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import {
  CoMapeoConfig,
  MapeoConfig,
  CoMapeoPreset,
  CoMapeoField,
  OptionType,
  ConfigFile
} from '@shared/schema';
import { convertMapeoToCoMapeo } from './conversion';
import { apiRequest } from './queryClient';

interface ConfigState {
  // Configuration data
  config: CoMapeoConfig | null;
  isMapeo: boolean;
  rawFiles: ConfigFile[];
  activeTab: string;

  // Function to load config from hash ID (for deep linking)
  loadConfigFromHash: (hashId: string) => Promise<void>;

  // Import related functions
  importConfig: (files: ConfigFile[], isMapeo: boolean) => void;

  // Editor state management
  setActiveTab: (tab: string) => void;

  // Metadata editing functions
  updateMetadata: (updates: Partial<CoMapeoConfig['metadata']>) => void;

  // Preset management
  addPreset: (preset: CoMapeoPreset) => void;
  updatePreset: (id: string, updates: Partial<CoMapeoPreset>) => void;
  deletePreset: (id: string) => void;

  // Field management
  addField: (field: CoMapeoField) => void;
  updateField: (id: string, updates: Partial<CoMapeoField>) => void;
  deleteField: (id: string) => void;

  // Translation management
  addLanguage: (locale: string) => void;
  updateTranslation: (locale: string, key: string, value: string, keyParts?: string[]) => void;

  // Icon management
  addIcon: (name: string, content: string, fileType?: string) => void;
  deleteIcon: (name: string) => void;
  updateIconsJson: (iconsJson: Record<string, unknown>) => void;

  // Export functions
  generateShareableHash: () => string;
  saveConfigToServer: () => Promise<string>;
  createZipForExport: () => Promise<Blob>;
}

// Helper function to serialize ArrayBuffer to base64 string
const serializeArrayBuffer = (buffer: ArrayBuffer): string => {
  const uint8Array = new Uint8Array(buffer);
  let binaryString = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binaryString);
};

// Helper function to deserialize base64 string to ArrayBuffer
const deserializeArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const uint8Array = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    uint8Array[i] = binaryString.charCodeAt(i);
  }
  return uint8Array.buffer;
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      config: null,
      isMapeo: false,
      rawFiles: [],
      activeTab: 'metadata',

      loadConfigFromHash: async (hashId: string) => {
        try {
          const res = await apiRequest('GET', `/api/configs/${hashId}`, undefined);
          const config = await res.json();

          set({
            config: config.data,
            isMapeo: config.isMapeo,
            rawFiles: [] // We don't store raw files on the server
          });
        } catch (error) {
          console.error('Failed to load config from hash:', error);
          throw error;
        }
      },

      importConfig: (files: ConfigFile[], isMapeo: boolean) => {
        // Parse necessary files to construct a configuration object
        let metadata = {} as CoMapeoConfig['metadata'];
        let presets: CoMapeoPreset[] = [];
        let fields: CoMapeoField[] = [];
        let translations = {} as Record<string, Record<string, string>>;
        let icons = {} as Record<string, unknown>;

        // For Comapeo format, check if there's a main config file first
        const configFile = files.find(file => file.path.endsWith('config.json'));

        if (configFile && !isMapeo) {
          // Parse the main config file
          const content = typeof configFile.content === 'string' ? configFile.content : '';
          try {
            const parsedConfig = JSON.parse(content);
            console.log('Parsed config:', parsedConfig);

            // Extract fields (could be an array or object map)
            if (parsedConfig.fields) {
              if (Array.isArray(parsedConfig.fields)) {
                fields = parsedConfig.fields;
              } else {
                // Convert object map to array
                fields = Object.entries(parsedConfig.fields).map(([id, fieldData]: [string, any]) => ({
                  id,
                  name: fieldData.label || id,
                  tagKey: fieldData.tagKey,
                  type: fieldData.type,
                  universal: !!fieldData.universal,
                  helperText: fieldData.helperText || '',
                  options: Array.isArray(fieldData.options) ? fieldData.options : []
                }));
              }
            }

            // Extract presets (could be an array or object map)
            if (parsedConfig.presets) {
              if (Array.isArray(parsedConfig.presets)) {
                presets = parsedConfig.presets;
              } else {
                // Convert object map to array
                presets = Object.entries(parsedConfig.presets).map(([id, presetData]: [string, any]) => ({
                  id,
                  name: presetData.name || id,
                  tags: presetData.tags || {},
                  color: presetData.color || '#000000',
                  icon: presetData.icon || 'default',
                  fieldRefs: presetData.fields || presetData.fieldRefs || [],
                  removeTags: presetData.removeTags || {},
                  addTags: presetData.addTags || {},
                  geometry: presetData.geometry || ['point']
                }));
              }
            }

            // Extract translations if available
            if (parsedConfig.translations) {
              translations = parsedConfig.translations;
            }

            // Extract metadata if available
            if (parsedConfig.metadata) {
              metadata = parsedConfig.metadata;
            }

            // Extract icons if available
            if (parsedConfig.icons) {
              icons = parsedConfig.icons;
            }
          } catch (error) {
            console.error('Error parsing config.json:', error);
          }
        } else {
          // Parse individual files
          for (const file of files) {
            const content = typeof file.content === 'string' ? file.content : '';

            try {
              if (file.path.endsWith('metadata.json')) {
                metadata = JSON.parse(content);
              } else if (file.path.endsWith('presets.json')) {
                const parsedPresets = JSON.parse(content);

                // Check if it's already an array or an object map
                if (Array.isArray(parsedPresets)) {
                  presets = parsedPresets;
                } else {
                  // Convert object map to array
                  presets = Object.entries(parsedPresets).map(([id, presetData]: [string, any]) => ({
                    id,
                    name: presetData.name || id,
                    tags: presetData.tags || {},
                    color: presetData.color || '#000000',
                    icon: presetData.icon || 'default',
                    fieldRefs: presetData.fields || presetData.fieldRefs || [],
                    removeTags: presetData.removeTags || {},
                    addTags: presetData.addTags || {},
                    geometry: presetData.geometry || ['point']
                  }));
                }
              } else if (file.path.endsWith('fields.json')) {
                const parsedFields = JSON.parse(content);

                // Check if it's already an array or an object map
                if (Array.isArray(parsedFields)) {
                  fields = parsedFields;
                } else {
                  // Convert object map to array
                  fields = Object.entries(parsedFields).map(([id, fieldData]: [string, any]) => ({
                    id,
                    name: fieldData.label || id,
                    tagKey: fieldData.tagKey || fieldData.key || id,
                    type: fieldData.type,
                    universal: !!fieldData.universal,
                    helperText: fieldData.helperText || fieldData.placeholder || '',
                    options: Array.isArray(fieldData.options) ? fieldData.options : []
                  }));
                }
              } else if (file.path.endsWith('translations.json')) {
                translations = JSON.parse(content);
              } else if (file.path.endsWith('icons.json')) {
                icons = JSON.parse(content);
              }
            } catch (error) {
              console.error(`Error parsing ${file.path}:`, error);
            }
          }
        }

        // Ensure all properties have proper default values
        let config: CoMapeoConfig = {
          metadata: metadata || {
            name: 'New Configuration',
            version: '1.0.0',
            fileVersion: '1',
            buildDate: new Date().toISOString(),
            description: ''
          },
          presets: Array.isArray(presets) ? presets : [],
          fields: Array.isArray(fields) ? fields : [],
          translations: translations || {},
          icons: icons || {}
        };

        // Convert if it's a Mapeo configuration
        if (isMapeo) {
          try {
            console.log('Converting Mapeo configuration to CoMapeo format...');
            const mapeoConfig: MapeoConfig = config as unknown as MapeoConfig;
            config = convertMapeoToCoMapeo(mapeoConfig);

            // Ensure fields are properly formatted
            if (config.fields) {
              config.fields = config.fields.map(field => {
                // Ensure field is a proper object with all required properties
                const safeField: CoMapeoField = {
                  id: typeof field.id === 'string' ? field.id : String(field.id || ''),
                  name: typeof field.name === 'string' ? field.name : String(field.name || field.id || ''),
                  tagKey: typeof field.tagKey === 'string' ? field.tagKey : String(field.tagKey || field.id || ''),
                  type: typeof field.type === 'string' ? field.type : 'text',
                  universal: !!field.universal,
                  helperText: typeof field.helperText === 'string' ? field.helperText : ''
                };

                // Handle options if present
                if (field.options) {
                  if (Array.isArray(field.options)) {
                    safeField.options = field.options.map(opt => {
                      if (typeof opt === 'string') {
                        return { label: opt, value: opt.toLowerCase().replace(/\s+/g, '_') };
                      } else if (opt && typeof opt === 'object') {
                        return {
                          label: typeof opt.label === 'string' ? opt.label : String(opt.label || ''),
                          value: typeof opt.value === 'string' ? opt.value : String(opt.value || '').toLowerCase().replace(/\s+/g, '_')
                        };
                      } else {
                        return { label: String(opt || ''), value: String(opt || '').toLowerCase().replace(/\s+/g, '_') };
                      }
                    });
                  } else if (typeof field.options === 'object') {
                    // Convert object options to array
                    safeField.options = Object.entries(field.options).map(([key, value]) => {
                      if (typeof value === 'string') {
                        return { label: value, value: key.toLowerCase().replace(/\s+/g, '_') };
                      } else if (value && typeof value === 'object' && 'label' in value) {
                        return {
                          label: typeof value.label === 'string' ? value.label : String(value.label || key),
                          value: key.toLowerCase().replace(/\s+/g, '_')
                        };
                      } else {
                        return { label: key, value: key.toLowerCase().replace(/\s+/g, '_') };
                      }
                    });
                  }
                }

                return safeField;
              });
            }

            // Ensure translations are properly formatted
            if (config.translations) {
              // Process each language
              for (const lang in config.translations) {
                const langTranslations = config.translations[lang];

                // Process fields section if it exists
                if (langTranslations && langTranslations.fields) {
                  for (const fieldKey in langTranslations.fields) {
                    const fieldTrans = langTranslations.fields[fieldKey];

                    // If fieldTrans is an object with key, type, etc. (the actual field object instead of translations)
                    if (fieldTrans && typeof fieldTrans === 'object' && ('key' in fieldTrans || 'type' in fieldTrans)) {
                      // Convert it to a proper translation object
                      langTranslations.fields[fieldKey] = {
                        label: typeof fieldTrans.label === 'string' ? fieldTrans.label : fieldKey,
                        helperText: typeof fieldTrans.placeholder === 'string' ? fieldTrans.placeholder : '',
                        options: {}
                      };

                      // Add options if they exist
                      if (fieldTrans.options) {
                        if (Array.isArray(fieldTrans.options)) {
                          const optionsObj: Record<string, string> = {};
                          fieldTrans.options.forEach((opt: any) => {
                            if (typeof opt === 'string') {
                              optionsObj[opt] = opt;
                            } else if (opt && typeof opt === 'object' && opt.label) {
                              optionsObj[opt.value || opt.label] = opt.label;
                            }
                          });
                          langTranslations.fields[fieldKey].options = optionsObj;
                        } else if (typeof fieldTrans.options === 'object') {
                          const optionsObj: Record<string, string> = {};
                          for (const optKey in fieldTrans.options) {
                            const optValue = fieldTrans.options[optKey];
                            if (typeof optValue === 'string') {
                              optionsObj[optKey] = optValue;
                            } else if (optValue && typeof optValue === 'object' && optValue.label) {
                              optionsObj[optKey] = optValue.label;
                            } else {
                              optionsObj[optKey] = optKey;
                            }
                          }
                          langTranslations.fields[fieldKey].options = optionsObj;
                        }
                      }
                    }

                    // Ensure options is an object, not an array
                    if (fieldTrans && fieldTrans.options && Array.isArray(fieldTrans.options)) {
                      const optionsObj: Record<string, string> = {};
                      fieldTrans.options.forEach((opt: any) => {
                        if (typeof opt === 'string') {
                          optionsObj[opt] = opt;
                        } else if (opt && typeof opt === 'object') {
                          const key = opt.value || opt.label || String(opt);
                          const value = opt.label || String(opt);
                          optionsObj[key] = value;
                        }
                      });
                      fieldTrans.options = optionsObj;
                    }
                  }
                }
              }
            }

            console.log('Conversion completed successfully');
          } catch (error) {
            console.error('Error converting Mapeo configuration:', error);
            // Provide fallback values if conversion fails
            config = {
              metadata: {
                name: 'Converted Mapeo Configuration',
                version: '1.0.0',
                fileVersion: '1',
                buildDate: new Date().toISOString(),
                description: 'Converted from Mapeo configuration with errors'
              },
              presets: [],
              fields: [],
              translations: {},
              icons: {}
            };
          }
        }

        // Set current date if buildDate is missing
        if (!config.metadata.buildDate) {
          config.metadata.buildDate = new Date().toISOString();
        }

        set({
          config,
          isMapeo,
          rawFiles: files
        });
      },

      setActiveTab: (tab: string) => {
        set({ activeTab: tab });
      },

      updateMetadata: (updates: Partial<CoMapeoConfig['metadata']>) => {
        set((state) => {
          if (!state.config) return state;

          return {
            config: {
              ...state.config,
              metadata: {
                ...state.config.metadata,
                ...updates
              }
            }
          };
        });
      },

      addPreset: (preset: CoMapeoPreset) => {
        set((state) => {
          if (!state.config) return state;

          // Ensure presets is an array
          const currentPresets = Array.isArray(state.config.presets) ? state.config.presets : [];

          return {
            config: {
              ...state.config,
              presets: [...currentPresets, preset]
            }
          };
        });
      },

      updatePreset: (id: string, updates: Partial<CoMapeoPreset>) => {
        set((state) => {
          if (!state.config) return state;

          // Ensure presets is an array
          const currentPresets = Array.isArray(state.config.presets) ? state.config.presets : [];

          const presets = currentPresets.map(preset =>
            preset.id === id ? { ...preset, ...updates } : preset
          );

          return {
            config: {
              ...state.config,
              presets
            }
          };
        });
      },

      deletePreset: (id: string) => {
        set((state) => {
          if (!state.config) return state;

          // Ensure presets is an array
          const currentPresets = Array.isArray(state.config.presets) ? state.config.presets : [];

          return {
            config: {
              ...state.config,
              presets: currentPresets.filter(preset => preset.id !== id)
            }
          };
        });
      },

      addField: (field: CoMapeoField) => {
        set((state) => {
          if (!state.config) return state;

          // Ensure fields is an array
          const currentFields = Array.isArray(state.config.fields) ? state.config.fields : [];

          return {
            config: {
              ...state.config,
              fields: [...currentFields, field]
            }
          };
        });
      },

      updateField: (id: string, updates: Partial<CoMapeoField>) => {
        set((state) => {
          if (!state.config) return state;

          // Ensure fields is an array
          const currentFields = Array.isArray(state.config.fields) ? state.config.fields : [];

          const fields = currentFields.map(field =>
            field.id === id ? { ...field, ...updates } : field
          );

          return {
            config: {
              ...state.config,
              fields
            }
          };
        });
      },

      deleteField: (id: string) => {
        set((state) => {
          if (!state.config) return state;

          // Ensure fields is an array
          const currentFields = Array.isArray(state.config.fields) ? state.config.fields : [];

          return {
            config: {
              ...state.config,
              fields: currentFields.filter(field => field.id !== id)
            }
          };
        });
      },

      addLanguage: (locale: string) => {
        set((state) => {
          if (!state.config) return state;

          // Create a new translations entry for this locale
          const newTranslations = { ...state.config.translations };
          if (!newTranslations[locale]) {
            newTranslations[locale] = {};
          }

          return {
            config: {
              ...state.config,
              translations: newTranslations
            }
          };
        });
      },

      updateTranslation: (locale: string, key: string, value: string, keyParts?: string[]) => {
        set((state) => {
          if (!state.config) return state;

          // If we have key parts, use them to update nested structure
          if (keyParts && keyParts.length > 1) {
            // Create a deep copy of the current translations for this locale
            const localeTranslations = JSON.parse(JSON.stringify(state.config.translations[locale] || {}));

            // Navigate to the correct nested object and update the value
            let current = localeTranslations;
            for (let i = 0; i < keyParts.length - 1; i++) {
              const part = keyParts[i];
              if (!current[part]) {
                current[part] = {};
              }
              current = current[part];
            }

            // Set the value at the final key
            current[keyParts[keyParts.length - 1]] = value;

            const translations = {
              ...state.config.translations,
              [locale]: localeTranslations
            };

            return {
              config: {
                ...state.config,
                translations
              }
            };
          } else {
            // Fall back to flat structure if no key parts provided
            const translations = {
              ...state.config.translations,
              [locale]: {
                ...state.config.translations[locale],
                [key]: value
              }
            };

            return {
              config: {
                ...state.config,
                translations
              }
            };
          }
        });
      },

      addIcon: (name: string, content: string, fileType: string = 'svg') => {
        set((state) => {
          if (!state.config) return state;

          const extension = fileType.toLowerCase();
          const fileName = `${name}.${extension}`;
          const filePath = `icons/${fileName}`;

          // Check if this icon already exists and remove it first
          const existingIconIndex = state.rawFiles.findIndex(file =>
            file.path === filePath || file.path.startsWith(`icons/${name}.`) || file.path.startsWith(`icons/${name}-`)
          );

          let newRawFiles = [...state.rawFiles];
          if (existingIconIndex !== -1) {
            // Remove the existing icon
            newRawFiles.splice(existingIconIndex, 1);
          }

          // Add to raw files
          newRawFiles.push({
            name: fileName,
            content,
            path: filePath
          });

          // Also update the icons object in the config
          const updatedIcons = {
            ...state.config.icons,
            [name]: { src: filePath }
          };

          console.log(`Added icon: ${name} with path ${filePath}`);

          return {
            rawFiles: newRawFiles,
            config: {
              ...state.config,
              icons: updatedIcons
            }
          };
        });
      },

      deleteIcon: (name: string) => {
        set((state) => {
          if (!state.config) return state;

          // Remove from raw files - handle both SVG and PNG files
          const newRawFiles = state.rawFiles.filter(
            file => !file.path.startsWith(`icons/${name}.`) && !file.path.startsWith(`icons/${name}-`)
          );

          // Also remove from the icons object in the config
          const updatedIcons = { ...state.config.icons };
          delete updatedIcons[name];

          return {
            rawFiles: newRawFiles,
            config: {
              ...state.config,
              icons: updatedIcons
            }
          };
        });
      },

      updateIconsJson: (iconsJson: Record<string, unknown>) => {
        set((state) => {
          if (!state.config) return state;

          return {
            config: {
              ...state.config,
              icons: iconsJson
            }
          };
        });
      },

      generateShareableHash: () => {
        return nanoid(10);
      },

      saveConfigToServer: async () => {
        const state = get();
        if (!state.config) throw new Error('No configuration to save');

        const hashId = state.generateShareableHash();

        try {
          // Prepare data for server storage
          const payload = {
            hashId,
            name: state.config.metadata.name,
            version: state.config.metadata.version,
            fileVersion: state.config.metadata.fileVersion,
            buildDate: state.config.metadata.buildDate,
            data: state.config,
            isMapeo: state.isMapeo,
            createdAt: new Date().toISOString()
          };

          // Save to server
          await apiRequest('POST', '/api/configs', payload);

          return hashId;
        } catch (error) {
          console.error('Failed to save config:', error);
          throw error;
        }
      },

      createZipForExport: async () => {
        // This function will create a ZIP blob with all the configuration files
        // We'll implement this with JSZip in the file-handling.ts module
        throw new Error('Not implemented yet');
      }
    }),
    {
      name: 'comapeo-config-storage',
      partialize: (state) => ({
        config: state.config,
        isMapeo: state.isMapeo,
        rawFiles: state.rawFiles
      }),
      // Custom serialization to handle ArrayBuffer content
      serialize: (state) => {
        try {
          // Create a deep copy of the state to avoid modifying the original
          const serializedState = JSON.parse(JSON.stringify(state, (key, value) => {
            // Check if this is an ArrayBuffer (will be detected as an empty object)
            if (value && typeof value === 'object' &&
                Object.keys(value).length === 0 &&
                value.constructor &&
                value.constructor.name === 'ArrayBuffer') {
              // Mark ArrayBuffer with a special type for deserialization
              return { __type: 'ArrayBuffer', data: serializeArrayBuffer(value) };
            }
            return value;
          }));

          // Process rawFiles to handle ArrayBuffer content
          if (serializedState.rawFiles) {
            serializedState.rawFiles = serializedState.rawFiles.map((file: any) => {
              if (file.content && file.content instanceof ArrayBuffer) {
                return {
                  ...file,
                  content: { __type: 'ArrayBuffer', data: serializeArrayBuffer(file.content) }
                };
              }

              // Ensure SVG content is properly serialized
              if (file.path.endsWith('.svg') && typeof file.content === 'string') {
                // Make sure SVG content is valid
                let svgContent = file.content;
                if (!svgContent.trim().startsWith('<svg')) {
                  svgContent = `<svg xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
                }
                return {
                  ...file,
                  content: svgContent
                };
              }

              return file;
            });
          }

          return JSON.stringify(serializedState);
        } catch (error) {
          console.error('Error serializing state:', error);
          // Return a fallback serialized state
          return JSON.stringify(state);
        }
      },
      // Custom deserialization to restore ArrayBuffer content
      deserialize: (str) => {
        try {
          const deserializedState = JSON.parse(str, (key, value) => {
            // Check for our special ArrayBuffer marker
            if (value && typeof value === 'object' && value.__type === 'ArrayBuffer') {
              return deserializeArrayBuffer(value.data);
            }
            return value;
          });

          // Process rawFiles to restore ArrayBuffer content
          if (deserializedState.rawFiles) {
            deserializedState.rawFiles = deserializedState.rawFiles.map((file: any) => {
              if (file.content && typeof file.content === 'object' && file.content.__type === 'ArrayBuffer') {
                return {
                  ...file,
                  content: deserializeArrayBuffer(file.content.data)
                };
              }

              // Ensure SVG content is valid
              if (file.path.endsWith('.svg') && typeof file.content === 'string') {
                let svgContent = file.content;
                if (!svgContent.trim().startsWith('<svg')) {
                  svgContent = `<svg xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
                }
                return {
                  ...file,
                  content: svgContent
                };
              }

              return file;
            });
          }

          return deserializedState;
        } catch (error) {
          console.error('Error deserializing state:', error);
          // Return an empty state as fallback
          return { config: null, isMapeo: false, rawFiles: [] };
        }
      }
    }
  )
);
