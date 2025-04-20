import { useState } from 'react';
import { useConfigStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { FieldDialog } from '@/components/dialogs/field-dialog';
import { CoMapeoField } from '@shared/schema';
import { nanoid } from 'nanoid';

export default function FieldsTab() {
  const { config, addField, updateField, deleteField } = useConfigStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [selectedField, setSelectedField] = useState<CoMapeoField | null>(null);

  // Ensure fields is an array before filtering
  const fields = Array.isArray(config?.fields) ? config.fields : [];
  const filteredFields = fields.filter(field => 
    field.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    field.tagKey.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddField = () => {
    setSelectedField(null);
    setShowDialog(true);
  };

  const handleEditField = (field: CoMapeoField) => {
    setSelectedField(field);
    setShowDialog(true);
  };

  const handleDeleteField = (id: string) => {
    if (window.confirm('Are you sure you want to delete this field?')) {
      deleteField(id);
    }
  };

  const handleSaveField = (field: CoMapeoField) => {
    if (selectedField) {
      // Update existing field
      updateField(selectedField.id, field);
    } else {
      // Add new field
      addField({ ...field, id: nanoid(8) });
    }
    setShowDialog(false);
  };

  if (!config) return null;

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Fields</h2>
            <Button onClick={handleAddField} className="flex items-center">
              <Plus className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          </div>
          
          <div className="mb-4">
            <Input
              placeholder="Search fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Tag Key</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Universal</TableHead>
                  <TableHead>Options</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFields.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                      No fields found. Add your first field to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFields.map((field) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">{field.name}</TableCell>
                      <TableCell>{field.tagKey}</TableCell>
                      <TableCell>{field.type}</TableCell>
                      <TableCell>
                        {field.universal ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell>
                        {field.options ? `${field.options.length} options` : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEditField(field)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteField(field.id)}
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
        <FieldDialog
          field={selectedField}
          onSave={handleSaveField}
          onCancel={() => setShowDialog(false)}
        />
      )}
    </>
  );
}
