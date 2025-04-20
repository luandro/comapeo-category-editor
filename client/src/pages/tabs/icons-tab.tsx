import { useState } from 'react';
import { useConfigStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Eye, Wand2 } from 'lucide-react';
import { IconDialog } from '@/components/dialogs/icon-dialog';
import { ConfigFile } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

export default function IconsTab() {
  const { rawFiles, addIcon, deleteIcon } = useConfigStore();
  const [showIconDialog, setShowIconDialog] = useState(false);
  const { toast } = useToast();

  // Extract icon files from raw files
  const iconFiles = rawFiles.filter(file => 
    file.path.startsWith('icons/') && file.path.endsWith('.svg')
  );

  const handleUploadIcon = () => {
    setShowIconDialog(true);
  };

  const handleIconSave = (name: string, content: string) => {
    addIcon(name, content);
    setShowIconDialog(false);
    
    toast({
      title: "Icon uploaded",
      description: `${name}.svg has been added to your configuration.`
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
                
                {iconFiles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No icon files found.</p>
                    <p className="text-sm mt-2">Upload your first icon to get started.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {iconFiles.map((file, index) => {
                      const name = file.path.split('/').pop()?.replace('.svg', '') || '';
                      
                      return (
                        <div 
                          key={index}
                          className="w-16 h-16 bg-white rounded-md shadow-sm p-2 flex flex-col items-center justify-center border border-gray-200 hover:border-primary cursor-pointer"
                          onClick={() => handleViewIcon(file)}
                        >
                          <div className="w-8 h-8 flex items-center justify-center">
                            {typeof file.content === 'string' ? (
                              <img 
                                src={`data:image/svg+xml;base64,${btoa(file.content)}`}
                                alt={name}
                                className="w-full h-full object-contain"
                                onError={() => {
                                  // Fallback to material icon if SVG fails to load
                                  return <span className="material-icons text-gray-800">{name}</span>;
                                }}
                              />
                            ) : (
                              <span className="material-icons text-gray-800">{name}</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-600 mt-1 truncate w-full text-center">
                            {name}.svg
                          </span>
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
