import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X, Plus } from 'lucide-react';
import { CoMapeoPreset, CoMapeoField } from '@shared/schema';

interface PresetDialogProps {
  preset: CoMapeoPreset | null;
  fields: CoMapeoField[];
  onSave: (preset: CoMapeoPreset) => void;
  onCancel: () => void;
}

export function PresetDialog({ preset, fields, onSave, onCancel }: PresetDialogProps) {
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

  useEffect(() => {
    if (preset) {
      setFormData(preset);
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
                onChange={handleColorChange}
                className="h-10 w-12 rounded cursor-pointer"
              />
              <Input 
                id="color" 
                value={formData.color} 
                onChange={handleChange} 
                className="w-32"
              />
              <p className="text-sm text-gray-500">CoMapeo specific</p>
            </div>
          </div>
          
          <div>
            <Label htmlFor="icon">Icon</Label>
            <div className="flex items-center space-x-4">
              <div 
                className="w-12 h-12 rounded-md flex items-center justify-center text-white"
                style={{ backgroundColor: formData.color }}
              >
                <span className="material-icons">{formData.icon}</span>
              </div>
              <Input 
                id="icon" 
                value={formData.icon} 
                onChange={handleChange} 
                className="w-full"
                placeholder="e.g. place, park, spa"
              />
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
