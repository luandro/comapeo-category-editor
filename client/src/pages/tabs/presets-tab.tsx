import { useState, useEffect } from 'react';
import { useConfigStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { PresetDialog } from '@/components/dialogs/preset-dialog';
import { CoMapeoPreset } from '@shared/schema';
import { nanoid } from 'nanoid';

export default function PresetsTab() {
  const { config, addPreset, updatePreset, deletePreset } = useConfigStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<CoMapeoPreset | null>(null);

  // Ensure presets is an array before filtering
  const presets = Array.isArray(config?.presets) ? config.presets : [];
  const filteredPresets = presets.filter(preset => 
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
                          className="w-8 h-8 rounded-md flex items-center justify-center text-white overflow-hidden"
                          style={{ backgroundColor: preset.color || '#808080' }}
                        >
                          {preset.icon ? (
                            <img 
                              src={typeof preset.icon === 'string' ? preset.icon : `data:image/svg+xml;base64,${btoa(preset.icon)}`}
                              alt={preset.name}
                              className="w-3/4 h-3/4 object-contain"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.parentElement.innerHTML = `<span class="material-icons text-sm">${preset.icon}</span>`;
                              }}
                            />
                          ) : (
                            <span className="text-white text-sm font-bold">
                              {preset.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{preset.name}</TableCell>
                      <TableCell>{preset.fieldRefs.length} fields</TableCell>
                      <TableCell>
                        {Object.entries(preset.tags).map(([key, value], index) => (
                          <Badge key={index} variant="outline" className="mr-1 bg-primary/10 text-primary">
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
