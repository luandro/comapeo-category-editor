import { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X, Plus, Search, Loader2, Palette } from 'lucide-react';
import { CoMapeoPreset, CoMapeoField, ConfigFile } from '@shared/schema';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useConfigStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { sanitizeSvgForReact } from '@/lib/svg-utils';

interface PresetDialogProps {
  preset: CoMapeoPreset | null;
  fields: CoMapeoField[];
  onSave: (preset: CoMapeoPreset) => void;
  onCancel: () => void;
}

export function PresetDialog({ preset, fields, onSave, onCancel }: PresetDialogProps) {
  const { rawFiles, addIcon } = useConfigStore();
  const { toast } = useToast();
  const [formData, setFormData] = useState<CoMapeoPreset>({
    id: '',
    name: '',
    tags: {},
    color: '#EA5545',
    icon: 'place',
    fieldRefs: [],
    geometry: ['point']
  });

  const [newTagKey, setNewTagKey] = useState('');
  const [newTagValue, setNewTagValue] = useState('');
  const [iconSearchTerm, setIconSearchTerm] = useState('');
  const [iconSearchResults, setIconSearchResults] = useState<string[]>([]);
  const [isSearchingIcons, setIsSearchingIcons] = useState(false);
  const [iconSearchPage, setIconSearchPage] = useState(1);
  const [iconSearchLanguage, setIconSearchLanguage] = useState('en');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [hasMoreIcons, setHasMoreIcons] = useState(true);
  const [selectedIconUrl, setSelectedIconUrl] = useState<string | null>(null);
  const [selectedIconName, setSelectedIconName] = useState<string>('');
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to extract base name from icon path
  const getIconBaseName = (path: string): string => {
    const filename = path.split('/').pop() || '';
    // Remove file extension
    let baseName = filename.replace(/\.(svg|png)$/, '');
    // Remove resolution suffixes like -medium@2x
    baseName = baseName.replace(/-(small|medium|large)@\d+x$/, '');
    return baseName;
  };

  // State to hold the icon map
  const [iconMap, setIconMap] = useState<{[key: string]: ConfigFile}>({});

  // Build icon map from raw files
  useEffect(() => {
    const buildIconMap = () => {
      const newIconMap: {[key: string]: ConfigFile} = {};

      // Group icons by base name and select the best resolution
      const allIconFiles = rawFiles.filter(file =>
        file.path.startsWith('icons/') &&
        (file.path.endsWith('.svg') || file.path.endsWith('.png'))
      );

      // Group by base name
      const iconGroups: Record<string, ConfigFile[]> = {};
      allIconFiles.forEach(file => {
        const baseName = getIconBaseName(file.path);
        if (!iconGroups[baseName]) {
          iconGroups[baseName] = [];
        }
        iconGroups[baseName].push(file);
      });

      // Select best resolution from each group
      Object.entries(iconGroups).forEach(([baseName, group]) => {
        // Prefer SVG files if available
        const svgFile = group.find(file => file.path.endsWith('.svg'));
        if (svgFile) {
          newIconMap[baseName] = svgFile;
          return;
        }

        // Otherwise, look for medium size PNG
        const mediumFile = group.find(file =>
          file.path.includes('-medium@') && file.path.endsWith('.png')
        );
        if (mediumFile) {
          newIconMap[baseName] = mediumFile;
          return;
        }

        // Fall back to any PNG
        const pngFile = group.find(file => file.path.endsWith('.png'));
        if (pngFile) {
          newIconMap[baseName] = pngFile;
        }
      });

      setIconMap(newIconMap);
    };

    buildIconMap();
  }, [rawFiles]);

  useEffect(() => {
    if (preset) {
      setFormData(preset);
      // Clear any selected icon URL when editing an existing preset
      setSelectedIconUrl(null);
      setSelectedIconName('');
    }
  }, [preset]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      color: e.target.value
    }));
  };

  const handleTagAdd = () => {
    if (newTagKey && newTagValue) {
      setFormData(prev => ({
        ...prev,
        tags: {
          ...prev.tags,
          [newTagKey]: newTagValue
        }
      }));
      setNewTagKey('');
      setNewTagValue('');
    }
  };

  const handleTagRemove = (key: string) => {
    const newTags = { ...formData.tags };
    delete newTags[key];

    setFormData(prev => ({
      ...prev,
      tags: newTags
    }));
  };

  const handleFieldAdd = (fieldId: string) => {
    if (!formData.fieldRefs.includes(fieldId)) {
      setFormData(prev => ({
        ...prev,
        fieldRefs: [...prev.fieldRefs, fieldId]
      }));
    }
  };

  const handleFieldRemove = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fieldRefs: prev.fieldRefs.filter(id => id !== fieldId)
    }));
  };

  const searchIcons = async (term: string, page: number = 1, language: string = 'en', append: boolean = false) => {
    if (!term.trim()) {
      setIconSearchResults([]);
      return;
    }

    setIsSearchingIcons(true);
    try {
      const response = await fetch(`https://icons.earthdefenderstoolkit.com/api/search?s=${encodeURIComponent(term)}&l=${language}&p=${page}`);
      if (!response.ok) throw new Error('Failed to fetch icons');

      const icons = await response.json();

      if (icons.length === 0) {
        setHasMoreIcons(false);
      } else {
        setHasMoreIcons(true);
      }

      setIconSearchResults(prev => append ? [...prev, ...icons] : icons);
      setIconSearchPage(page);
    } catch (error) {
      console.error('Error searching icons:', error);
    } finally {
      setIsSearchingIcons(false);
    }
  };

  const handleIconSearch = (term: string) => {
    setIconSearchTerm(term);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout to debounce search
    searchTimeoutRef.current = setTimeout(() => {
      searchIcons(term, 1, iconSearchLanguage);
    }, 500);
  };

  const handleLoadMoreIcons = () => {
    searchIcons(iconSearchTerm, iconSearchPage + 1, iconSearchLanguage, true);
  };

  const generateColoredIcon = async (iconUrl: string, color: string) => {
    try {
      setIsGeneratingIcon(true);

      // Ensure color is a valid hex color with # prefix
      let colorHex = color;
      if (!colorHex.startsWith('#')) {
        colorHex = '#' + colorHex;
      }

      // Remove the # for the API call
      const apiColorHex = colorHex.replace('#', '');

      console.log(`Generating icon with URL: ${iconUrl} and color: ${apiColorHex}`);

      // Call the API to generate a colored icon
      const response = await fetch(`https://icons.earthdefenderstoolkit.com/api/generate?image=${encodeURIComponent(iconUrl)}&color=${apiColorHex}`);

      if (!response.ok) {
        throw new Error('Failed to generate colored icon');
      }

      const data = await response.json();
      console.log('API response:', data);

      if (data && data.length > 0 && data[0].svg) {
        // Extract the SVG content from the data URL
        const svgDataUrl = data[0].svg;

        // Convert the data URL to actual SVG content
        // Handle both formats: data:image/svg+xml, and data:image/svg+xml,%3csvg
        let svgContent;
        try {
          if (svgDataUrl.includes('%3csvg')) {
            // Handle URL-encoded format
            svgContent = decodeURIComponent(svgDataUrl)
              .replace('data:image/svg+xml,', '')
              .replace(/\%3c/g, '<')
              .replace(/\%3e/g, '>')
              .replace(/\%20/g, ' ')
              .replace(/\%22/g, '"')
              .replace(/\%27/g, "'")
              .replace(/\%2F/g, '/');
          } else {
            // Handle regular format
            svgContent = decodeURIComponent(svgDataUrl.replace('data:image/svg+xml,', ''));
          }

          // Ensure the SVG content is valid
          if (!svgContent.trim().startsWith('<svg')) {
            svgContent = `<svg xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
          }

          // Sanitize SVG content for React
          svgContent = sanitizeSvgForReact(svgContent);

          // Log the SVG content for debugging
          console.log('Processed SVG content:', svgContent.substring(0, 100) + '...');
        } catch (error) {
          console.error('Error processing SVG content:', error);
          throw new Error('Failed to process SVG content');
        }

        // Create a friendly icon name using the search term
        let iconName = '';
        if (selectedIconName && selectedIconName.trim() !== '') {
          // Use the search term as the base name
          iconName = selectedIconName.toLowerCase().replace(/\s+/g, '-');
        } else {
          // Fallback to extracting from URL
          iconName = iconUrl.split('/').pop()?.split('-')[0] || 'icon';
        }

        console.log(`Generated icon name: ${iconName}`);

        // Add the icon to the store
        addIcon(iconName, svgContent, 'svg');

        // Update the form data with the new icon name and color
        setFormData(prev => ({
          ...prev,
          icon: iconName,
          color: colorHex // Ensure the color in the form matches what was used
        }));

        toast({
          title: "Icon generated",
          description: `${iconName}.svg has been colored and added to your configuration.`
        });

        // Close the picker after successful generation
        setShowIconPicker(false);
      } else {
        throw new Error('Invalid response from icon generation API');
      }
    } catch (error) {
      console.error('Error generating colored icon:', error);
      toast({
        title: "Error",
        description: "Failed to generate colored icon. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingIcon(false);
    }
  };

  const handleIconSelect = (iconUrl: string) => {
    // Store the selected icon URL for later use
    setSelectedIconUrl(iconUrl);

    // Use the search term as part of the icon name for better identification
    // Only use non-empty search terms
    if (iconSearchTerm && iconSearchTerm.trim() !== '') {
      setSelectedIconName(iconSearchTerm.trim());
    } else {
      // If no search term, extract from URL
      const baseName = iconUrl.split('/').pop()?.split('-')[0] || 'icon';
      setSelectedIconName(baseName);
    }

    // Use the current form color to generate the icon
    generateColoredIcon(iconUrl, formData.color);
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{preset ? 'Edit Preset' : 'Add Preset'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.id.split('/')[0] || ''}
                onValueChange={(value) => {
                  setFormData(prev => ({
                    ...prev,
                    id: `${value}/${prev.id.split('/')[1] || prev.name.toLowerCase().replace(/\s+/g, '_')}`
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="environment">Environment</SelectItem>
                  <SelectItem value="wildlife">Wildlife</SelectItem>
                  <SelectItem value="threats">Threats</SelectItem>
                  <SelectItem value="infrastructure">Infrastructure</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="color">Color</Label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                id="colorPicker"
                value={formData.color}
                onChange={(e) => {
                  const newColor = e.target.value;
                  // Update form data first
                  setFormData(prev => ({
                    ...prev,
                    color: newColor
                  }));
                }}
                className="h-10 w-12 rounded cursor-pointer"
              />
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => {
                  const newColor = e.target.value;
                  // Update form data
                  setFormData(prev => ({
                    ...prev,
                    color: newColor
                  }));
                }}
                className="w-32"
              />
              <p className="text-sm text-gray-500">CoMapeo specific</p>
              {selectedIconUrl && (
                <Button
                  variant="outline"
                  onClick={() => {
                    // Make sure we're using the current color from the form
                    generateColoredIcon(selectedIconUrl, formData.color);
                  }}
                  disabled={isGeneratingIcon}
                  title="Apply color to icon"
                  className="flex items-center gap-2"
                >
                  <Palette className="h-4 w-4" />
                  {isGeneratingIcon ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Applying...</span>
                    </>
                  ) : (
                    <span>Apply color to icon</span>
                  )}
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="icon">Icon</Label>
            <div className="flex items-center space-x-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center bg-white overflow-hidden"
                style={{ border: `2px solid ${formData.color}` }}
              >
                {iconMap[formData.icon] ? (
                  <div className="w-8 h-8 flex items-center justify-center">
                    {typeof iconMap[formData.icon].content === 'string' ? (
                      iconMap[formData.icon].content.trim().startsWith('<svg') ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-3/4 h-3/4" dangerouslySetInnerHTML={{ __html: sanitizeSvgForReact(iconMap[formData.icon].content as string) }} />
                        </div>
                      ) : (
                        <img
                          src={`data:image/png;base64,${iconMap[formData.icon].content}`}
                          alt={formData.name}
                          className="w-full h-full object-contain"
                        />
                      )
                    ) : iconMap[formData.icon].content instanceof ArrayBuffer ? (
                      <img
                        src={URL.createObjectURL(new Blob([iconMap[formData.icon].content as ArrayBuffer], { type: 'image/png' }))}
                        alt={formData.name}
                        className="w-full h-full object-contain"
                        onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                      />
                    ) : (
                      <span className="material-icons text-sm">{formData.icon}</span>
                    )}
                  </div>
                ) : (
                  <span className="material-icons" style={{ color: formData.color }}>{formData.icon}</span>
                )}
              </div>
              <div className="flex-1 flex space-x-2">
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={handleChange}
                  className="w-full"
                  placeholder="e.g. place, park, spa"
                />
                <Popover open={showIconPicker} onOpenChange={setShowIconPicker}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Search className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <div className="p-4 border-b">
                      <div className="flex items-center space-x-2 mb-2">
                        <Input
                          placeholder="Search icons..."
                          value={iconSearchTerm}
                          onChange={(e) => handleIconSearch(e.target.value)}
                          className="flex-1"
                        />
                        <Select
                          value={iconSearchLanguage}
                          onValueChange={setIconSearchLanguage}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue placeholder="Lang" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">EN</SelectItem>
                            <SelectItem value="es">ES</SelectItem>
                            <SelectItem value="pt">PT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto p-2">
                      {isSearchingIcons && iconSearchResults.length === 0 ? (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                      ) : iconSearchResults.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          {iconSearchTerm ? 'No icons found' : 'Type to search icons'}
                        </div>
                      ) : isGeneratingIcon ? (
                        <div className="flex flex-col justify-center items-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">Generating colored icon...</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {iconSearchResults.map((icon, idx) => (
                            <div
                              key={`${icon}-${idx}`}
                              className="p-2 border rounded-md hover:bg-gray-50 cursor-pointer flex items-center justify-center"
                              onClick={() => handleIconSelect(icon)}
                            >
                              <img
                                src={icon}
                                alt="icon"
                                className="w-8 h-8 object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {iconSearchResults.length > 0 && hasMoreIcons && (
                      <div className="p-2 border-t text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleLoadMoreIcons}
                          disabled={isSearchingIcons}
                          className="w-full"
                        >
                          {isSearchingIcons ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            'Load more'
                          )}
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <div>
            <Label>Tags</Label>
            <div className="p-3 border border-gray-300 rounded-md">
              <div className="flex flex-wrap gap-2 mb-2">
                {Object.entries(formData.tags).map(([key, value]) => (
                  <div key={key} className="bg-gray-100 rounded-full px-3 py-1 text-sm flex items-center">
                    <span className="mr-1">{key}={value}</span>
                    <button
                      className="text-gray-500 hover:text-red-500"
                      onClick={() => handleTagRemove(key)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center mt-2">
                <Input
                  placeholder="Key"
                  value={newTagKey}
                  onChange={(e) => setNewTagKey(e.target.value)}
                  className="w-1/2 rounded-r-none"
                />
                <Input
                  placeholder="Value"
                  value={newTagValue}
                  onChange={(e) => setNewTagValue(e.target.value)}
                  className="w-1/2 rounded-l-none border-l-0"
                />
                <Button
                  size="icon"
                  variant="default"
                  onClick={handleTagAdd}
                  className="ml-2"
                  disabled={!newTagKey || !newTagValue}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label>Fields</Label>
            <div className="p-3 border border-gray-300 rounded-md">
              <div className="max-h-48 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.fieldRefs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                          No fields added to this preset.
                        </TableCell>
                      </TableRow>
                    ) : (
                      formData.fieldRefs.map((fieldId) => {
                        const field = fields.find(f => f.id === fieldId);
                        return (
                          <TableRow key={fieldId}>
                            <TableCell>{field?.name || fieldId}</TableCell>
                            <TableCell className="text-gray-500">{field?.tagKey || fieldId}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleFieldRemove(fieldId)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <Select
                  onValueChange={handleFieldAdd}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add Field" />
                  </SelectTrigger>
                  <SelectContent>
                    {fields
                      .filter(field => !formData.fieldRefs.includes(field.id))
                      .map(field => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.name} ({field.tagKey})
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
