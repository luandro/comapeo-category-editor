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
  updateTranslation: (locale: string, key: string, value: string) => void;
  
  // Icon management
  addIcon: (name: string, content: string) => void;
  deleteIcon: (name: string) => void;
  updateIconsJson: (iconsJson: Record<string, unknown>) => void;
  
  // Export functions
  generateShareableHash: () => string;
  saveConfigToServer: () => Promise<string>;
  createZipForExport: () => Promise<Blob>;
}

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
        let presets = [] as CoMapeoPreset[];
        let fields = [] as CoMapeoField[];
        let translations = {} as Record<string, Record<string, string>>;
        let icons = {} as Record<string, unknown>;
        
        for (const file of files) {
          const content = typeof file.content === 'string' ? file.content : '';
          
          if (file.path.endsWith('metadata.json')) {
            metadata = JSON.parse(content);
          } else if (file.path.endsWith('presets.json')) {
            presets = JSON.parse(content);
          } else if (file.path.endsWith('fields.json')) {
            fields = JSON.parse(content);
          } else if (file.path.endsWith('translations.json')) {
            translations = JSON.parse(content);
          } else if (file.path.endsWith('icons.json')) {
            icons = JSON.parse(content);
          }
        }
        
        let config: CoMapeoConfig = {
          metadata,
          presets: Array.isArray(presets) ? presets : [],
          fields: Array.isArray(fields) ? fields : [],
          translations: translations || {},
          icons: icons || {}
        };
        
        // Convert if it's a Mapeo configuration
        if (isMapeo) {
          const mapeoConfig: MapeoConfig = config as unknown as MapeoConfig;
          config = convertMapeoToCoMapeo(mapeoConfig);
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
      
      updateTranslation: (locale: string, key: string, value: string) => {
        set((state) => {
          if (!state.config) return state;
          
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
        });
      },
      
      addIcon: (name: string, content: string) => {
        set((state) => {
          if (!state.config) return state;
          
          // Add to raw files
          const newRawFiles = [...state.rawFiles, {
            name: `${name}.svg`,
            content,
            path: `icons/${name}.svg`
          }];
          
          return {
            rawFiles: newRawFiles
          };
        });
      },
      
      deleteIcon: (name: string) => {
        set((state) => {
          // Remove from raw files
          const newRawFiles = state.rawFiles.filter(
            file => file.path !== `icons/${name}.svg`
          );
          
          return {
            rawFiles: newRawFiles
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
    }
  )
);
