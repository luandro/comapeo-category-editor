import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X, Plus } from 'lucide-react';
import { CoMapeoField, OptionType } from '@shared/schema';

interface FieldDialogProps {
  field: CoMapeoField | null;
  onSave: (field: CoMapeoField) => void;
  onCancel: () => void;
}

export function FieldDialog({ field, onSave, onCancel }: FieldDialogProps) {
  const [formData, setFormData] = useState<CoMapeoField>({
    id: '',
    name: '',
    tagKey: '',
    type: 'text',
    universal: false,
    helperText: '',
    options: []
  });
  
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    if (field) {
      setFormData(field);
      setShowOptions(field.type === 'selectOne' || field.type === 'selectMany');
    }
  }, [field]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleTypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      type: value
    }));
    
    setShowOptions(value === 'selectOne' || value === 'selectMany');
  };

  const handleUniversalChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      universal: checked
    }));
  };

  const handleOptionAdd = () => {
    if (newOptionLabel && newOptionValue) {
      const newOption: OptionType = {
        label: newOptionLabel,
        value: newOptionValue
      };
      
      setFormData(prev => ({
        ...prev,
        options: [...(prev.options || []), newOption]
      }));
      
      setNewOptionLabel('');
      setNewOptionValue('');
    }
  };

  const handleOptionRemove = (value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.filter(opt => opt.value !== value) || []
    }));
  };

  const handleSubmit = () => {
    // Ensure options exist if it's a select type field
    const updatedField = { ...formData };
    
    if (['selectOne', 'selectMany'].includes(updatedField.type) && (!updatedField.options || updatedField.options.length === 0)) {
      updatedField.options = [];
    } else if (!['selectOne', 'selectMany'].includes(updatedField.type)) {
      delete updatedField.options;
    }
    
    onSave(updatedField);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{field ? 'Edit Field' : 'Add Field'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Field Name</Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={handleChange} 
                className="w-full"
              />
            </div>
            
            <div>
              <Label htmlFor="tagKey">Tag Key</Label>
              <Input 
                id="tagKey" 
                value={formData.tagKey} 
                onChange={handleChange} 
                className="w-full"
              />
              <p className="mt-1 text-xs text-gray-500">CoMapeo: tagKey, Mapeo: key</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Field Type</Label>
              <Select
                value={formData.type}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="textarea">Textarea</SelectItem>
                  <SelectItem value="selectOne">Select One</SelectItem>
                  <SelectItem value="selectMany">Select Many</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-gray-500">CoMapeo: selectOne, Mapeo: select_one</p>
            </div>
            
            <div>
              <div className="flex items-center space-x-2 mt-8">
                <Checkbox 
                  id="universal" 
                  checked={formData.universal} 
                  onCheckedChange={handleUniversalChange} 
                />
                <Label htmlFor="universal">
                  Universal (can be used with any preset)
                </Label>
              </div>
              <p className="mt-1 text-xs text-gray-500">CoMapeo specific property</p>
            </div>
          </div>
          
          <div>
            <Label htmlFor="helperText">Helper Text</Label>
            <Input 
              id="helperText" 
              value={formData.helperText || ''} 
              onChange={handleChange} 
              className="w-full"
              placeholder="Instructions or hint for the user"
            />
            <p className="mt-1 text-xs text-gray-500">CoMapeo: helperText, Mapeo: placeholder</p>
          </div>
          
          {showOptions && (
            <div>
              <Label>Options</Label>
              <div className="p-3 border border-gray-300 rounded-md">
                <div className="max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Label</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!formData.options || formData.options.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                            No options added. Add options below.
                          </TableCell>
                        </TableRow>
                      ) : (
                        formData.options.map((option) => (
                          <TableRow key={option.value}>
                            <TableCell>{option.label}</TableCell>
                            <TableCell className="text-gray-500">{option.value}</TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleOptionRemove(option.value)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200 flex">
                  <Input 
                    placeholder="Label" 
                    value={newOptionLabel}
                    onChange={(e) => setNewOptionLabel(e.target.value)}
                    className="flex-1 rounded-r-none"
                  />
                  <Input 
                    placeholder="Value" 
                    value={newOptionValue}
                    onChange={(e) => setNewOptionValue(e.target.value)}
                    className="flex-1 rounded-l-none border-l-0"
                  />
                  <Button 
                    size="icon" 
                    variant="default" 
                    onClick={handleOptionAdd}
                    className="ml-2"
                    disabled={!newOptionLabel || !newOptionValue}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-gray-500">CoMapeo: Array of {"{label, value}"}, Mapeo: Array of strings</p>
              </div>
            </div>
          )}
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
