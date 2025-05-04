import { cn } from '@/lib/utils';
import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from './button';

interface FileDropZoneProps {
  onFileDrop: (file: File) => void;
  acceptedFileTypes: string[];
  fileTypesText: string;
  className?: string;
}

export function FileDropZone({
  onFileDrop,
  acceptedFileTypes,
  fileTypesText,
  className,
}: FileDropZoneProps) {
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
      validateAndProcessFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndProcessFile(files[0]);
    }
  };

  const validateAndProcessFile = (file: File) => {
    const fileName = file.name.toLowerCase();
    // Check if the file name ends with any of the accepted file extensions
    const extensionMatch = acceptedFileTypes.some((type) => fileName.endsWith(type));

    if (extensionMatch) {
      onFileDrop(file);
    } else {
      alert(`Invalid file type. Please upload a ${fileTypesText} file.`);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
        isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:bg-gray-50',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerFileInput}
    >
      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <p className="text-lg font-medium text-gray-700 mb-2">Drag and drop your file here</p>
      <p className="text-gray-500 mb-6">or</p>

      <Button variant="default">Browse Files</Button>

      <p className="mt-4 text-sm text-gray-500">Accepted formats: {fileTypesText}</p>

      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileInputChange} />
    </div>
  );
}
