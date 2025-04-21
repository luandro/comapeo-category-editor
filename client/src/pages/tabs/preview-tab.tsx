
import { useState, useEffect } from 'react';
import { useConfigStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { X, ArrowLeft, Circle } from 'lucide-react';
import { sanitizeSvgForReact } from '@/lib/svg-utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PreviewTab() {
  const { config, rawFiles } = useConfigStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [presetsByCategory, setPresetsByCategory] = useState<{[key: string]: any[]}>({});
  const [iconMap, setIconMap] = useState<{[key: string]: string}>({});
  const [selectedPreset, setSelectedPreset] = useState<any | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedField, setSelectedField] = useState<any | null>(null);
  const [showFieldDetails, setShowFieldDetails] = useState(false);
  const [currentFieldIndex, setCurrentFieldIndex] = useState<number>(0);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

  // Function to get translated text based on the selected language
  const getTranslatedText = (defaultText: string, section: string, id: string, field: string, language: string): string => {
    if (!config || !config.translations || !language || language === 'en') {
      return defaultText || '';
    }

    try {
      const langTranslations = config.translations[language];
      if (!langTranslations) return defaultText || '';

      // Handle nested paths like 'options.value1'
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        if (langTranslations[section] &&
            langTranslations[section][id] &&
            langTranslations[section][id][parent] &&
            langTranslations[section][id][parent][child]) {
          return langTranslations[section][id][parent][child];
        }
      } else if (langTranslations[section] &&
                 langTranslations[section][id] &&
                 langTranslations[section][id][field]) {
        return langTranslations[section][id][field];
      }
    } catch (error) {
      console.error('Error getting translation:', error);
    }

    return defaultText || '';
  };

  useEffect(() => {
    if (!config) return;

    // Extract presets from config
    const presets = Array.isArray(config?.presets) ? config.presets : [];

    // Get all categories from presets
    const allCategories = new Set<string>();
    presets.forEach(preset => {
      const category = preset.tags?.category || 'uncategorized';
      allCategories.add(category);
    });

    // Sort and set categories
    const sortedCategories = Array.from(allCategories).sort();
    setCategories(sortedCategories);

    // Group presets by category
    const grouped: {[key: string]: any[]} = {};
    presets.forEach(preset => {
      const category = preset.tags?.category || 'uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(preset);
    });

    // Sort presets within each category by name
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => a.name.localeCompare(b.name));
    });

    setPresetsByCategory(grouped);

    // Extract icon SVGs from raw files
    const extractedIcons: {[key: string]: string} = {};
    rawFiles.forEach(file => {
      if (file.path.startsWith('icons/') && file.path.endsWith('.svg')) {
        const iconName = file.path.split('/').pop()?.replace('.svg', '') || '';
        if (typeof file.content === 'string') {
          // Sanitize SVG content for React
          extractedIcons[iconName] = sanitizeSvgForReact(file.content);
        }
      }
    });
    setIconMap(extractedIcons);
  }, [config, rawFiles]);

  // Filter presets based on search query
  const filterPresets = () => {
    if (!searchQuery.trim()) return presetsByCategory;

    const filtered: {[key: string]: any[]} = {};

    Object.keys(presetsByCategory).forEach(category => {
      const matchingPresets = presetsByCategory[category].filter(preset =>
        preset.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      if (matchingPresets.length > 0) {
        filtered[category] = matchingPresets;
      }
    });

    return filtered;
  };

  const filteredPresetsByCategory = filterPresets();

  // Function to render icon for a preset
  const renderPresetIcon = (preset: any) => {
    // Find appropriate icon file - check for PNG files first
    const findMatchingIconFile = (iconName: string) => {
      // Looking for medium size icons as they fit best in our design
      const mediumSizePattern = `-medium@`;
      const preferredFiles = rawFiles.filter(file =>
        file.path.startsWith('icons/') &&
        file.path.includes(iconName) &&
        file.path.includes(mediumSizePattern) &&
        file.path.endsWith('.png')
      );

      // If medium size exists, use the first one (usually @1x)
      if (preferredFiles.length > 0) {
        return preferredFiles[0];
      }

      // Otherwise look for any PNG with this icon name
      const anyPngFiles = rawFiles.filter(file =>
        file.path.startsWith('icons/') &&
        file.path.includes(iconName) &&
        file.path.endsWith('.png')
      );

      return anyPngFiles.length > 0 ? anyPngFiles[0] : null;
    };

    if (preset.icon) {
      const iconName = preset.icon.replace('.png', '');

      // First check if we have a PNG file for this icon
      const iconFile = findMatchingIconFile(iconName);

      if (iconFile) {
        // For PNG files, we need to create a proper URL
        // This approach works for both string and binary content
        try {
          // Convert the content to a blob
          const content = iconFile.content;
          let blob;

          if (typeof content === 'string') {
            // Create a Uint8Array from the string content
            const binaryString = window.atob(content);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            blob = new Blob([bytes], { type: 'image/png' });
          } else if (content instanceof ArrayBuffer) {
            blob = new Blob([new Uint8Array(content)], { type: 'image/png' });
          } else {
            // Fallback for other content types
            blob = new Blob([content], { type: 'image/png' });
          }

          // Create a URL for the blob
          const imageUrl = URL.createObjectURL(blob);

          return (
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={imageUrl}
                alt={preset.name}
                className="w-3/4 h-3/4 object-contain"
                onLoad={() => URL.revokeObjectURL(imageUrl)} // Clean up the URL on load
              />
            </div>
          );
        } catch (error) {
          console.error("Error displaying icon:", error);
          // Fallback display if image fails to load
          return (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-icons text-gray-400">image_not_supported</span>
            </div>
          );
        }
      }

      // If no PNG, check for SVG in iconMap
      if (iconMap[preset.icon]) {
        try {
          // Use the sanitized SVG content
          const svgContent = iconMap[preset.icon];
          // Create a data URL with the sanitized SVG content
          const svgBase64 = btoa(svgContent);
          return (
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={`data:image/svg+xml;base64,${svgBase64}`}
                alt={typeof preset.name === 'string' ? preset.name : 'icon'}
                className="w-3/4 h-3/4 object-contain"
              />
            </div>
          );
        } catch (error) {
          console.error("Error displaying SVG icon:", error);
          // Fallback display if SVG fails to load
          return (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-icons text-gray-400">image_not_supported</span>
            </div>
          );
        }
      }

      // Fall back to material icon
      return (
        <div className="w-full h-full flex items-center justify-center">
          <span
            className="material-icons"
            style={{
              color: preset.color || '#000',
              fontSize: '24px'
            }}
          >
            {typeof iconName === 'string' ? iconName : 'category'}
          </span>
        </div>
      );
    } else {
      // If no icon, use first letter of preset name as fallback
      let firstLetter = 'A';
      try {
        if (typeof preset.name === 'string') {
          firstLetter = preset.name.charAt(0).toUpperCase();
        } else if (preset.name && typeof preset.name === 'object') {
          // Handle case where name might be an object
          firstLetter = 'P';
        }
      } catch (error) {
        console.error("Error getting preset name:", error);
      }

      return (
        <div
          className="w-full h-full rounded-full flex items-center justify-center"
          style={{ backgroundColor: preset.color || '#808080' }}
        >
          <span className="text-white text-sm font-bold">
            {firstLetter}
          </span>
        </div>
      );
    }
  };

  if (!config) return null;

  return (
    <>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center justify-between">
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Search presets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <Select
                value={selectedLanguage}
                onValueChange={setSelectedLanguage}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                  {config && config.translations &&
                    Object.keys(config.translations)
                      .filter(lang => !['en', 'es', 'pt'].includes(lang))
                      .map(lang => (
                        <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mx-auto max-w-[375px]">
            <div className="relative bg-white rounded-lg shadow-md overflow-hidden">
              {/* Mobile-like header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                {showFieldDetails ? (
                  <>
                    <div className="flex items-center">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setShowFieldDetails(false);
                        setSelectedField(null);
                      }} className="mr-2">
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <div className="text-xl font-semibold">Question {selectedField?.questionNumber || 1} of {selectedPreset?.fieldRefs?.length || 1}</div>
                    </div>
                    <div
                      className="text-blue-500 font-medium cursor-pointer"
                      onClick={() => {
                        // If there are more fields, go to the next one
                        if (selectedPreset?.fieldRefs && currentFieldIndex < selectedPreset.fieldRefs.length - 1) {
                          const nextIndex = currentFieldIndex + 1;
                          setCurrentFieldIndex(nextIndex);
                          const nextFieldId = selectedPreset.fieldRefs[nextIndex];
                          const nextField = config?.fields.find(f => f.id === nextFieldId);
                          if (nextField) {
                            setSelectedField({ ...nextField, questionNumber: nextIndex + 1 });
                          }
                        } else {
                          // If this is the last field, go back to the preset details
                          setShowFieldDetails(false);
                          setSelectedField(null);
                          setCurrentFieldIndex(0);
                        }
                      }}
                    >
                      Next
                    </div>
                  </>
                ) : showDetails ? (
                  <>
                    <div className="flex items-center">
                      <Button variant="ghost" size="icon" onClick={() => setShowDetails(false)} className="mr-2">
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <div className="text-xl font-semibold">Details</div>
                    </div>
                  </>
                ) : (
                  <>
                    <X className="h-6 w-6 mr-3" />
                    <div className="text-xl font-semibold">Choose what is happening</div>
                  </>
                )}
              </div>

              {showFieldDetails && selectedField ? (
                <div className="p-4 overflow-y-auto max-h-[70vh]">
                  {/* Field details view */}
                  <div className="border-b pb-4 mb-4">
                    <h2 className="text-xl font-bold mb-1">{getTranslatedText(selectedField.name, 'fields', selectedField.id, 'label', selectedLanguage)}</h2>
                    <p className="text-gray-700">{getTranslatedText(selectedField.helperText, 'fields', selectedField.id, 'helperText', selectedLanguage)}</p>
                  </div>

                  {/* Field input */}
                  <div className="space-y-4">
                    {selectedField.type === 'select' && selectedField.options && (
                      <div className="space-y-4">
                        {selectedField.options.map((option: any, idx: number) => {
                          const optionLabel = getTranslatedText(option.label, 'fields', selectedField.id, `options.${option.value}`, selectedLanguage);
                          return (
                            <div key={idx} className="flex items-center">
                              <div className="w-6 h-6 border border-gray-300 rounded-full mr-3 flex items-center justify-center">
                                {idx === 0 && <Circle className="h-3 w-3 text-gray-400" />}
                              </div>
                              <span className="text-lg">{optionLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {selectedField.type === 'text' && (
                      <div className="h-12 border border-gray-300 rounded-md px-3 flex items-center text-gray-400">Text input</div>
                    )}
                    {selectedField.type === 'textarea' && (
                      <div className="h-24 border border-gray-300 rounded-md p-3 text-gray-400">Text area</div>
                    )}
                    {selectedField.type === 'number' && (
                      <div className="h-12 border border-gray-300 rounded-md px-3 flex items-center text-gray-400">Number input</div>
                    )}
                  </div>
                </div>
              ) : showDetails && selectedPreset ? (
                <div className="p-4 overflow-y-auto max-h-[70vh]">
                  {/* Preset details view */}
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-white rounded-full shadow-md overflow-hidden border border-gray-100 p-2 mr-4">
                      {renderPresetIcon(selectedPreset)}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{getTranslatedText(selectedPreset.name, 'presets', selectedPreset.id, 'name', selectedLanguage)}</h2>
                      <p className="text-gray-500 text-sm capitalize">{selectedPreset.tags?.category || 'uncategorized'}</p>
                    </div>
                  </div>

                  {/* Fields section */}
                  <div className="mb-6">
                    <div className="space-y-4">
                      {config && selectedPreset.fieldRefs && selectedPreset.fieldRefs.length > 0 ? (
                        selectedPreset.fieldRefs.map((fieldId: string, index: number) => {
                          const field = config.fields.find(f => f.id === fieldId);
                          if (!field) return null;

                          // Add question number to field for display in field details view
                          const fieldWithNumber = { ...field, questionNumber: index + 1 };

                          return (
                            <div
                              key={fieldId}
                              className="p-4 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
                              onClick={() => {
                                setSelectedField(fieldWithNumber);
                                setShowFieldDetails(true);
                                setCurrentFieldIndex(index);
                              }}
                            >
                              <h4 className="font-medium">{getTranslatedText(field.name, 'fields', field.id, 'label', selectedLanguage)}</h4>
                              {field.helperText && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {getTranslatedText(field.helperText, 'fields', field.id, 'helperText', selectedLanguage)}
                                </p>
                              )}

                              {/* Show options for fields that have them */}
                              {field.type === 'select' && field.options && field.options.length > 0 && (
                                <div className="mt-2 pl-2 border-l-2 border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Options:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {field.options.map((option: any, optIdx: number) => (
                                      <span key={optIdx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                        {getTranslatedText(option.label, 'fields', field.id, `options.${option.value}`, selectedLanguage)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-gray-500">No fields for this preset</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 overflow-y-auto max-h-[70vh]">
                  {/* Display presets by category */}
                  {Object.keys(filteredPresetsByCategory).length > 0 ? (
                    Object.keys(filteredPresetsByCategory).map((category) => (
                      <div key={category} className="mb-6">
                        <h3 className="text-lg font-semibold mb-3 capitalize">{category}</h3>
                        <div className="grid grid-cols-3 gap-6">
                          {filteredPresetsByCategory[category].map((preset, index) => (
                            <div
                              key={index}
                              className="flex flex-col items-center cursor-pointer"
                              onClick={() => {
                                setSelectedPreset(preset);
                                // If the preset has fields, show the first field directly
                                if (preset.fieldRefs && preset.fieldRefs.length > 0 && config) {
                                  const firstFieldId = preset.fieldRefs[0];
                                  const firstField = config.fields.find(f => f.id === firstFieldId);
                                  if (firstField) {
                                    setSelectedField({ ...firstField, questionNumber: 1 });
                                    setShowFieldDetails(true);
                                    setCurrentFieldIndex(0);
                                  } else {
                                    setShowDetails(true);
                                  }
                                } else {
                                  setShowDetails(true);
                                }
                              }}
                            >
                              <div className="w-16 h-16 bg-white rounded-full shadow-md mb-2 overflow-hidden border border-gray-100 p-2">
                                {renderPresetIcon(preset)}
                              </div>
                              <span className="text-sm text-center">{getTranslatedText(preset.name, 'presets', preset.id, 'name', selectedLanguage)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No presets found matching your search
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 text-sm text-gray-500 text-center">
            <p>This preview shows how presets will appear in the CoMapeo mobile app.</p>
            <p>The actual appearance may vary slightly based on the device and CoMapeo version.</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
