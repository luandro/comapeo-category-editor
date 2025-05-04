import { PresetDialog } from '@/components/dialogs/preset-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useConfigStore } from '@/lib/store';
import { sanitizeSvgForReact } from '@/lib/svg-utils';
import type { CoMapeoPreset, ConfigFile } from '@shared/schema';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useEffect, useMemo, useState } from 'react';

export default function PresetsTab() {
  const { config, rawFiles, addPreset, updatePreset, deletePreset } = useConfigStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<CoMapeoPreset | null>(null);
  const [iconMap, setIconMap] = useState<{ [key: string]: ConfigFile }>({});

  // Function to extract base name from icon path
  const getIconBaseName = (path: string): string => {
    const filename = path.split('/').pop() || '';
    // Remove file extension
    let baseName = filename.replace(/\.(svg|png)$/, '');
    // Remove resolution suffixes like -medium@2x
    baseName = baseName.replace(/-(small|medium|large)@\d+x$/, '');
    return baseName;
  };

  // Build icon map from raw files
  useEffect(() => {
    const newIconMap: { [key: string]: ConfigFile } = {};

    // Group icons by base name and select the best resolution
    const allIconFiles = rawFiles.filter(
      (file) =>
        file.path.startsWith('icons/') && (file.path.endsWith('.svg') || file.path.endsWith('.png'))
    );

    // Group by base name
    const iconGroups: Record<string, ConfigFile[]> = {};
    allIconFiles.forEach((file) => {
      const baseName = getIconBaseName(file.path);
      if (!iconGroups[baseName]) {
        iconGroups[baseName] = [];
      }
      iconGroups[baseName].push(file);
    });

    // Select best resolution from each group
    Object.entries(iconGroups).forEach(([baseName, group]) => {
      // Prefer SVG files if available
      const svgFile = group.find((file) => file.path.endsWith('.svg'));
      if (svgFile) {
        newIconMap[baseName] = svgFile;
        return;
      }

      // Otherwise, look for medium size PNG
      const mediumFile = group.find(
        (file) => file.path.includes('-medium@') && file.path.endsWith('.png')
      );
      if (mediumFile) {
        newIconMap[baseName] = mediumFile;
        return;
      }

      // Fall back to any PNG
      const pngFile = group.find((file) => file.path.endsWith('.png'));
      if (pngFile) {
        newIconMap[baseName] = pngFile;
      }
    });

    setIconMap(newIconMap);
  }, [rawFiles]);

  // Ensure presets is an array before filtering
  const presets = Array.isArray(config?.presets) ? config.presets : [];
  const filteredPresets = presets.filter((preset) =>
    preset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddPreset = () => {
    setSelectedPreset(null);
    setShowDialog(true);
  };

  const handleEditPreset = (preset: CoMapeoPreset) => {
    setSelectedPreset(preset);
    setShowDialog(true);
  };

  const handleDeletePreset = (id: string) => {
    if (window.confirm('Are you sure you want to delete this preset?')) {
      deletePreset(id);
    }
  };

  const handleSavePreset = (preset: CoMapeoPreset) => {
    if (selectedPreset) {
      // Update existing preset
      updatePreset(selectedPreset.id, preset);
    } else {
      // Add new preset
      addPreset({ ...preset, id: nanoid(8) });
    }
    setShowDialog(false);
  };

  if (!config) return null;

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Presets</h2>
            <Button onClick={handleAddPreset} className="flex items-center">
              <Plus className="mr-2 h-4 w-4" />
              Add Preset
            </Button>
          </div>

          <div className="mb-4">
            <Input
              placeholder="Search presets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Icon</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPresets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                      No presets found. Add your first preset to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPresets.map((preset) => (
                    <TableRow key={preset.id}>
                      <TableCell>
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center bg-white overflow-hidden"
                          style={{ border: `2px solid ${preset.color || '#808080'}` }}
                        >
                          {preset.icon ? (
                            <div className="w-6 h-6 flex items-center justify-center">
                              {iconMap[preset.icon] ? (
                                typeof iconMap[preset.icon].content === 'string' ? (
                                  iconMap[preset.icon].content.trim().startsWith('<svg') ? (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <div
                                        className="w-3/4 h-3/4"
                                        dangerouslySetInnerHTML={{
                                          __html: sanitizeSvgForReact(
                                            iconMap[preset.icon].content as string
                                          ),
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <img
                                      src={`data:image/png;base64,${iconMap[preset.icon].content}`}
                                      alt={preset.name}
                                      className="w-full h-full object-contain"
                                    />
                                  )
                                ) : iconMap[preset.icon].content instanceof ArrayBuffer ? (
                                  <img
                                    src={URL.createObjectURL(
                                      new Blob([iconMap[preset.icon].content as ArrayBuffer], {
                                        type: 'image/png',
                                      })
                                    )}
                                    alt={preset.name}
                                    className="w-full h-full object-contain"
                                    onLoad={(e) =>
                                      URL.revokeObjectURL((e.target as HTMLImageElement).src)
                                    }
                                  />
                                ) : (
                                  <span className="material-icons text-sm">{preset.icon}</span>
                                )
                              ) : (
                                <span className="material-icons text-sm">{preset.icon}</span>
                              )}
                            </div>
                          ) : (
                            <span
                              className="text-sm font-bold"
                              style={{ color: preset.color || '#808080' }}
                            >
                              {preset.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{preset.name}</TableCell>
                      <TableCell>{preset.fieldRefs.length} fields</TableCell>
                      <TableCell>
                        {Object.entries(preset.tags).map(([key, value], index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="mr-1 bg-primary/10 text-primary"
                          >
                            {key}={value}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditPreset(preset)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletePreset(preset.id)}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {showDialog && (
        <PresetDialog
          preset={selectedPreset}
          fields={config.fields}
          onSave={handleSavePreset}
          onCancel={() => setShowDialog(false)}
        />
      )}
    </>
  );
}
