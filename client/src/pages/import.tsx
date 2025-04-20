import { useState } from 'react';
import { useLocation } from 'wouter';
import { useConfigStore } from '@/lib/store';
import { FileDropZone } from '@/components/ui/file-drop-zone';
import { Header } from '@/components/header';
import { PageContainer } from '@/components/ui/page-container';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { extractZipFile, extractTarFile } from '@/lib/file-handling';

export default function ImportPage() {
  const [, setLocation] = useLocation();
  const { importConfig } = useConfigStore();
  const [processingState, setProcessingState] = useState<'idle' | 'processing' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [isMapeoFile, setIsMapeoFile] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileDrop = async (file: File) => {
    try {
      setProcessingState('processing');
      setProgress(10);
      setStatusText('Reading file...');

      // Determine file type
      const isMapeo = file.name.toLowerCase().endsWith('.mapeosettings');
      setIsMapeoFile(isMapeo);
      
      // Show conversion warning if it's a Mapeo file
      if (isMapeo) {
        setStatusText('Converting Mapeo Settings to CoMapeo format...');
      }

      // Extract files based on file type
      setProgress(30);
      let extractedFiles;
      
      if (isMapeo) {
        extractedFiles = await extractTarFile(file);
      } else {
        extractedFiles = await extractZipFile(file);
      }

      setProgress(60);
      setStatusText('Processing configuration...');
      
      // Import the configuration
      importConfig(extractedFiles, isMapeo);
      
      setProgress(100);
      setStatusText('Completed!');
      
      // Navigate to the editor after a short delay
      setTimeout(() => {
        setLocation('/editor');
      }, 500);
    } catch (error) {
      console.error('File processing error:', error);
      setProcessingState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <PageContainer>
        <Card className="max-w-3xl mx-auto">
          <CardContent className="pt-6 pb-6">
            <h1 className="text-2xl font-semibold mb-6 text-center">Import Configuration</h1>
            
            <div className="text-center mb-8">
              <p className="text-gray-600 mb-2">Upload a .comapeocat (zip) or .mapeosettings (tar) file to begin editing</p>
              <p className="text-sm text-gray-500">Your file will be processed entirely in your browser</p>
            </div>
            
            {processingState === 'idle' ? (
              <FileDropZone
                onFileDrop={handleFileDrop}
                acceptedFileTypes={['.comapeocat', '.mapeosettings']}
                fileTypesText=".comapeocat, .mapeosettings"
              />
            ) : (
              <div className="mt-8">
                <div className="flex flex-col items-center">
                  <Progress value={progress} className="w-full max-w-md h-2 mb-4" />
                  <p className="text-gray-700">{statusText}</p>
                </div>
              </div>
            )}
            
            {isMapeoFile && processingState === 'processing' && (
              <Alert variant="warning" className="mt-8">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Converting Mapeo Settings</AlertTitle>
                <AlertDescription>
                  We're converting this .mapeosettings file to CoMapeo format for you. Some attributes may be updated to match the CoMapeo specification.
                </AlertDescription>
              </Alert>
            )}
            
            {processingState === 'error' && (
              <Alert variant="destructive" className="mt-8">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Processing File</AlertTitle>
                <AlertDescription>
                  {errorMessage || "Unable to process the file. Please ensure it's a valid .comapeocat or .mapeosettings file."}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </div>
  );
}
