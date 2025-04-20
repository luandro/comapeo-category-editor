import { useState, useEffect } from 'react';
import { useConfigStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlignLeft, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdvancedTab() {
  const { config } = useConfigStore();
  const [selectedFile, setSelectedFile] = useState('presets');
  const [jsonContent, setJsonContent] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (config) {
      updateJsonContent(selectedFile);
    }
  }, [config, selectedFile]);

  const updateJsonContent = (fileType: string) => {
    if (!config) return;
    
    let content = '';
    
    switch (fileType) {
      case 'presets':
        content = JSON.stringify(config.presets, null, 2);
        break;
      case 'fields':
        content = JSON.stringify(config.fields, null, 2);
        break;
      case 'metadata':
        content = JSON.stringify(config.metadata, null, 2);
        break;
      case 'icons':
        content = JSON.stringify(config.icons, null, 2);
        break;
      case 'translations':
        content = JSON.stringify(config.translations, null, 2);
        break;
      case 'style':
        // Placeholder for style.css content
        content = '/* CSS stylesheet for the configuration */';
        break;
      default:
        content = '';
    }
    
    setJsonContent(content);
  };

  const handleFileChange = (value: string) => {
    setSelectedFile(value);
  };

  const formatJson = () => {
    try {
      const obj = JSON.parse(jsonContent);
      setJsonContent(JSON.stringify(obj, null, 2));
      
      toast({
        title: "JSON formatted",
        description: "The JSON content has been properly formatted.",
      });
    } catch (error) {
      toast({
        title: "Format error",
        description: "Invalid JSON content. Please check for syntax errors.",
        variant: "destructive"
      });
    }
  };

  const copyJson = () => {
    navigator.clipboard.writeText(jsonContent);
    
    toast({
      title: "Copied to clipboard",
      description: "The JSON content has been copied to your clipboard.",
    });
  };

  const applyChanges = () => {
    // In a real implementation, this would parse the JSON and update the config store
    toast({
      title: "Changes applied",
      description: "Your changes have been applied to the configuration.",
    });
  };

  if (!config) return null;

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Advanced JSON Editing</h2>
            <p className="text-gray-600">Edit configuration files directly in JSON format. Use with caution.</p>
          </div>
          
          <div className="mb-4">
            <Select
              value={selectedFile}
              onValueChange={handleFileChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select file" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="presets">presets.json</SelectItem>
                <SelectItem value="fields">fields.json</SelectItem>
                <SelectItem value="metadata">metadata.json</SelectItem>
                <SelectItem value="icons">icons.json</SelectItem>
                <SelectItem value="translations">translations.json</SelectItem>
                <SelectItem value="style">style.css</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="border border-gray-300 rounded-md overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-b border-gray-300">
              <h3 className="text-sm font-medium text-gray-700">{selectedFile}.json</h3>
              <div className="flex space-x-2">
                <Button variant="ghost" size="icon" onClick={formatJson}>
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={copyJson}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="bg-white p-4">
              <textarea
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                className="font-mono text-sm w-full h-96 focus:outline-none resize-none"
              />
            </div>
          </div>
          
          <div className="mt-4 text-right">
            <Button onClick={applyChanges}>
              Apply Changes
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Additional Files</h2>
            <p className="text-gray-600">Manage other configuration files</p>
          </div>
          
          <div className="space-y-3">
            {['VERSION', 'style.css'].map((filename, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md shadow-sm">
                <div className="flex items-center">
                  <span className="material-icons text-gray-600 mr-2">
                    {filename === 'VERSION' ? 'text_snippet' : 'code'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{filename}</p>
                    <p className="text-xs text-gray-500">
                      {filename === 'VERSION' 
                        ? 'File version information' 
                        : 'Custom styling for the configuration'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-primary">
                  <span className="material-icons">edit</span>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
