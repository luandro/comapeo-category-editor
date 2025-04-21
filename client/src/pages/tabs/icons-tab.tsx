import { useState, useMemo } from 'react';
import { useConfigStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Eye, Wand2, Trash2 } from 'lucide-react';
import { IconDialog } from '@/components/dialogs/icon-dialog';
import { ConfigFile } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { sanitizeSvgForReact } from '@/lib/svg-utils';

export default function IconsTab() {
  const { rawFiles, config, addIcon, deleteIcon } = useConfigStore();
  const [showIconDialog, setShowIconDialog] = useState(false);
  const { toast } = useToast();

  // Function to extract base name from icon path
  const getIconBaseName = (path: string): string => {
    const filename = path.split('/').pop() || '';
    // Remove file extension
    let baseName = filename.replace(/\.(svg|png)$/, '');
    // Remove resolution suffixes like -medium@2x
    baseName = baseName.replace(/-(small|medium|large)@\d+x$/, '');
    return baseName;
  };

  // Group icons by base name and select the best resolution
  const uniqueIconFiles = useMemo(() => {
    // Get all icon files
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
    return Object.values(iconGroups).map(group => {
      // Prefer SVG files if available
      const svgFile = group.find(file => file.path.endsWith('.svg'));
      if (svgFile) return svgFile;

      // Otherwise, look for medium size PNG
      const mediumFile = group.find(file =>
        file.path.includes('-medium@') && file.path.endsWith('.png')
      );
      if (mediumFile) return mediumFile;

      // Fall back to any PNG
      return group.find(file => file.path.endsWith('.png')) || group[0];
    });
  }, [rawFiles]);

  // Find preset color for an icon
  const getPresetColorForIcon = (iconName: string): string => {
    if (!config || !config.presets) return '#cccccc';

    // Extract base name without extension
    const baseName = getIconBaseName(iconName);

    // Find matching preset
    const preset = Array.isArray(config.presets)
      ? config.presets.find(p => p.icon === baseName)
      : null;

    return preset?.color || '#cccccc';
  };

  const handleUploadIcon = () => {
    setShowIconDialog(true);
  };

  const handleIconSave = (name: string, content: string, fileType: string = 'svg') => {
    addIcon(name, content, fileType);
    setShowIconDialog(false);

    toast({
      title: "Icon uploaded",
      description: `${name}.${fileType} has been added to your configuration.`
    });
  };

  const handleDeleteIcon = (name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      deleteIcon(name);

      toast({
        title: "Icon deleted",
        description: `${name} has been removed from your configuration.`
      });
    }
  };

  const handleGenerateSprite = () => {
    toast({
      title: "Sprite generation",
      description: "Sprite files will be automatically generated on export."
    });
  };

  const handleViewIcon = (iconFile: ConfigFile) => {
    const content = typeof iconFile.content === 'string' ? iconFile.content : '';
    const blob = new Blob([content], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    window.open(url, '_blank');

    // Clean up URL object after a delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Icons</h2>
            <div className="flex space-x-2">
              <Button
                onClick={handleUploadIcon}
                className="flex items-center"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Icon
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerateSprite}
                className="flex items-center"
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Sprite
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="md:w-1/2">
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Individual Icon Files</h3>
                <p className="text-xs text-gray-500 mb-3">Upload or replace individual icon SVGs in the icons directory</p>

                {uniqueIconFiles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No icon files found.</p>
                    <p className="text-sm mt-2">Upload your first icon to get started.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {uniqueIconFiles.map((file, index) => {
                      const name = getIconBaseName(file.path);
                      const presetColor = getPresetColorForIcon(name);

                      return (
                        <div key={index} className="relative group">
                          <div
                            className="w-16 h-16 bg-white rounded-full shadow-sm p-2 flex flex-col items-center justify-center cursor-pointer"
                            style={{ border: `2px solid ${presetColor}` }}
                            onClick={() => handleViewIcon(file)}
                          >
                          <div className="w-10 h-10 flex items-center justify-center">
                            {typeof file.content === 'string' ? (
                              file.content.trim().startsWith('<svg') ? (
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="w-3/4 h-3/4" dangerouslySetInnerHTML={{ __html: sanitizeSvgForReact(file.content as string) }} />
                                </div>
                              ) : (
                                <img
                                  src={`data:image/png;base64,${file.content}`}
                                  alt={name}
                                  className="w-full h-full object-contain"
                                />
                              )
                            ) : file.content instanceof ArrayBuffer ? (
                              <img
                                src={URL.createObjectURL(new Blob([file.content], { type: 'image/png' }))}
                                alt={name}
                                className="w-full h-full object-contain"
                                onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                              />
                            ) : (
                              <span className="material-icons text-gray-800">{name}</span>
                            )}
                          </div>
                          </div>
                          <button
                            className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteIcon(name);
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="md:w-1/2">
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Icon Sprites</h3>
                <p className="text-xs text-gray-500 mb-3">The sprite files will be automatically generated from individual icons</p>

                <div className="space-y-3">
                  {['icons.svg', 'icons.png', 'icons.json'].map((filename, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm border border-gray-200">
                      <div className="flex items-center">
                        <span className="material-icons text-gray-600 mr-2">
                          {filename.endsWith('.svg') ? 'insert_drive_file' :
                           filename.endsWith('.png') ? 'image' : 'code'}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{filename}</p>
                          <p className="text-xs text-gray-500">
                            {filename.endsWith('.svg') ? 'SVG sprite file' :
                             filename.endsWith('.png') ? 'PNG sprite file' : 'Icon mapping data'}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showIconDialog && (
        <IconDialog
          onSave={handleIconSave}
          onCancel={() => setShowIconDialog(false)}
        />
      )}
    </>
  );
}
