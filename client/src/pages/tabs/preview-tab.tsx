
import { useState, useEffect } from 'react';
import { useConfigStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

export default function PreviewTab() {
  const { config, rawFiles } = useConfigStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [presetsByCategory, setPresetsByCategory] = useState<{[key: string]: any[]}>({});
  const [iconMap, setIconMap] = useState<{[key: string]: string}>({});

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
          extractedIcons[iconName] = file.content;
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
    if (preset.icon && iconMap[preset.icon]) {
      // Convert SVG string to base64 for display
      const svgBase64 = btoa(iconMap[preset.icon]);
      return (
        <div 
          className="w-full h-full flex items-center justify-center"
          style={{ 
            backgroundImage: `url(data:image/svg+xml;base64,${svgBase64})`,
            backgroundSize: '60%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      );
    } else if (preset.icon && preset.icon.endsWith('.png')) {
      // Handle PNG icons
      const iconName = preset.icon.replace('.png', '');
      // Check if we have PNG files in the raw files
      const pngFiles = rawFiles.filter(file => 
        file.path.includes(iconName) && file.path.endsWith('.png')
      );
      
      if (pngFiles.length > 0) {
        const pngFile = pngFiles[0]; // Use the first match
        const content = typeof pngFile.content === 'string' ? pngFile.content : '';
        const base64Data = btoa(content);
        
        return (
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{ 
              backgroundImage: `url(data:image/png;base64,${base64Data})`,
              backgroundSize: '60%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
        );
      }
      
      // Fallback for material icons
      return (
        <span 
          className="material-icons text-3xl"
          style={{ color: preset.color || '#000' }}
        >
          {preset.icon.replace('.png', '')}
        </span>
      );
    } else if (preset.icon) {
      // Fall back to material icon if we have an icon name but no SVG content
      return (
        <span 
          className="material-icons text-3xl" 
          style={{ color: preset.color || '#000' }}
        >
          {preset.icon}
        </span>
      );
    } else {
      // If no icon, use first letter of preset name as fallback
      return (
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: preset.color || '#808080' }}
        >
          <span className="text-white text-sm font-bold">
            {preset.name.charAt(0).toUpperCase()}
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
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center">
            <div className="w-full">
              <Input
                placeholder="Search presets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </div>

          <div className="mx-auto max-w-[375px]">
            <div className="relative bg-white rounded-lg shadow-md overflow-hidden">
              {/* Mobile-like header */}
              <div className="p-4 border-b border-gray-200 flex items-center">
                <X className="h-6 w-6 mr-3" />
                <div className="text-xl font-semibold">Choose what is happening</div>
              </div>

              {/* Display presets by category */}
              <div className="p-4 overflow-y-auto max-h-[70vh]">
                {Object.keys(filteredPresetsByCategory).length > 0 ? (
                  Object.keys(filteredPresetsByCategory).map((category) => (
                    <div key={category} className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 capitalize">{category}</h3>
                      <div className="grid grid-cols-3 gap-6">
                        {filteredPresetsByCategory[category].map((preset, index) => (
                          <div key={index} className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-2 overflow-hidden border border-gray-100">
                              <div className="w-12 h-12 flex items-center justify-center">
                                {renderPresetIcon(preset)}
                              </div>
                            </div>
                            <span className="text-sm text-center">{preset.name}</span>
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
