import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Image, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

interface IconDialogProps {
  onSave: (name: string, content: string, fileType?: string) => void;
  onCancel: () => void;
}

export function IconDialog({ onSave, onCancel }: IconDialogProps) {
  const [iconName, setIconName] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    // Accept SVG and PNG files
    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');

    if (!isSvg && !isPng) {
      alert('Please upload an SVG or PNG file.');
      return;
    }

    // Set the icon name from file name (remove extension)
    const fileName = file.name.replace(/\.(svg|png)$/i, '');
    setIconName(fileName);
    setIconFile(file);

    // Create a preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setIconPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async () => {
    if (!iconFile || !iconName) {
      alert('Please select a file and provide a name.');
      return;
    }

    try {
      const isSvg =
        iconFile.type === 'image/svg+xml' || iconFile.name.toLowerCase().endsWith('.svg');
      const fileType = isSvg ? 'svg' : 'png';

      if (isSvg) {
        // For SVG, read as text
        const content = await iconFile.text();
        onSave(iconName, content, fileType);
      } else {
        // For PNG, read as base64
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            // Convert to base64 string without the data URL prefix
            const base64Content = (e.target.result as string).split(',')[1];
            onSave(iconName, base64Content, fileType);
          }
        };
        reader.readAsDataURL(iconFile);
      }
    } catch (error) {
      console.error('Error reading icon file:', error);
      alert('Failed to process the icon file.');
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Icon</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                triggerFileInput();
              }
            }}
            role="button"
            tabIndex={0}
          >
            {iconPreview ? (
              <div className="flex flex-col items-center">
                <img src={iconPreview} alt="Icon preview" className="w-16 h-16 mb-2" />
                <p className="text-sm font-medium text-gray-700">{iconFile?.name}</p>
                <p className="text-xs text-gray-500 mt-1">Click or drag to replace</p>
              </div>
            ) : (
              <>
                <Image className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700 mb-2">Drag and drop an icon here</p>
                <p className="text-gray-500 text-xs mb-4">or</p>
                <Button size="sm" variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Browse Files
                </Button>
                <p className="mt-2 text-xs text-gray-500">
                  SVG or PNG formats accepted (SVG recommended)
                </p>
              </>
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept=".svg,.png,image/svg+xml,image/png"
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>

          <div>
            <Label htmlFor="iconName">Icon Name</Label>
            <Input
              id="iconName"
              value={iconName}
              onChange={(e) => setIconName(e.target.value)}
              placeholder="E.g., park, tree, river (no spaces, no extension)"
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              Will be saved in the icons directory with the appropriate extension
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!iconFile || !iconName}>
            Upload Icon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
