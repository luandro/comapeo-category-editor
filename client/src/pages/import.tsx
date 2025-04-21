import { useState } from 'react';
import { useLocation } from 'wouter';
import { useConfigStore } from '@/lib/store';
import { FileDropZone } from '@/components/ui/file-drop-zone';
import { Header } from '@/components/header';
import { PageContainer } from '@/components/ui/page-container';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { extractZipFile, extractTarFile } from '@/lib/file-handling';
import { createSampleConfig, createSampleIconFiles } from '@/lib/createSampleConfig';

export default function ImportPage() {
  const [, setLocation] = useLocation();
  const { importConfig } = useConfigStore();
  const [processingState, setProcessingState] = useState<'idle' | 'processing' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [fileSize, setFileSize] = useState<string>('');
  const [isMapeoFile, setIsMapeoFile] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileDrop = async (file: File) => {
    try {
      setProcessingState('processing');
      setProgress(0);

      // Format file size for display
      const fileSizeInKB = file.size / 1024;
      const fileSizeFormatted = fileSizeInKB > 1024
        ? `${(fileSizeInKB / 1024).toFixed(2)} MB`
        : `${fileSizeInKB.toFixed(2)} KB`;
      setFileSize(fileSizeFormatted);

      setStatusText(`Reading ${file.name} (${fileSizeFormatted})...`);

      // Determine file type
      const isMapeo = file.name.toLowerCase().endsWith('.mapeosettings');
      setIsMapeoFile(isMapeo);

      // Create a progress callback function
      const updateProgress = (progress: number, message: string) => {
        setProgress(progress);
        setStatusText(message);
      };

      // Extract files based on file type
      let extractedFiles;

      if (isMapeo) {
        extractedFiles = await extractTarFile(file, updateProgress);
      } else {
        extractedFiles = await extractZipFile(file, updateProgress);
      }

      setProgress(96);
      setStatusText('Importing configuration...');

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

  const handleUseSampleConfig = () => {
    try {
      setProcessingState('processing');
      setProgress(0);
      setStatusText('Initializing sample configuration...');
      setFileSize('Sample configuration');

      // Simulate progress for better user experience
      const simulateProgress = async () => {
        // Step 1: Creating configuration
        setProgress(10);
        setStatusText('Creating sample configuration...');
        await new Promise(resolve => setTimeout(resolve, 300));

        // Step 2: Generate sample config
        setProgress(30);
        setStatusText('Generating configuration structure...');
        const sampleConfig = createSampleConfig();
        await new Promise(resolve => setTimeout(resolve, 300));

        // Step 3: Create sample icons
        setProgress(50);
        setStatusText('Creating sample icons...');
        const sampleIconFiles = createSampleIconFiles();
        await new Promise(resolve => setTimeout(resolve, 300));

        // Step 4: Process configuration
        setProgress(70);
        setStatusText('Processing sample configuration...');
        await new Promise(resolve => setTimeout(resolve, 300));

        // Step 5: Import configuration
        setProgress(90);
        setStatusText('Importing sample configuration...');
        importConfig([
          {
            name: 'config.json',
            path: 'config.json',
            content: JSON.stringify(sampleConfig)
          },
          ...sampleIconFiles
        ], false);

        // Complete
        setProgress(100);
        setStatusText('Completed!');

        // Navigate to the editor after a short delay
        setTimeout(() => {
          setLocation('/editor');
        }, 500);
      };

      // Execute the progress simulation
      simulateProgress().catch(error => {
        console.error('Error in sample config creation:', error);
        setProcessingState('error');
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error creating sample config.');
      });
    } catch (error) {
      console.error('Sample config creation error:', error);
      setProcessingState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error creating sample config.');
    }
  };

  const resetProcess = () => {
    setProcessingState('idle');
    setProgress(0);
    setStatusText('');
    setIsMapeoFile(false);
    setErrorMessage('');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <PageContainer>
        <Card className="max-w-3xl mx-auto">
          <CardContent className="pt-6 pb-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold text-center flex-grow">Import Configuration</h1>
              {processingState !== 'idle' && (
                <Button
                  variant="outline"
                  onClick={resetProcess}
                  className="flex items-center"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>

            <div className="text-center mb-8">
              <p className="text-gray-600 mb-2">Upload a .comapeocat (zip) or .mapeosettings (tar) file to begin editing</p>
              <p className="text-sm text-gray-500">Your file will be processed entirely in your browser</p>
            </div>

            {processingState === 'idle' ? (
              <>
                <FileDropZone
                  onFileDrop={handleFileDrop}
                  acceptedFileTypes={['.comapeocat', '.mapeosettings']}
                  fileTypesText=".comapeocat, .mapeosettings"
                />

                <div className="mt-8 text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="text-gray-500 mb-2">- OR -</div>
                    <Button
                      onClick={handleUseSampleConfig}
                      variant="outline"
                      className="w-full max-w-xs"
                    >
                      Use Sample Configuration
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-8">
                <div className="flex flex-col items-center">
                  <div className="w-full max-w-md mb-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{statusText}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="w-full h-2 mb-1" />
                    {fileSize && (
                      <p className="text-xs text-gray-500 text-right">File size: {fileSize}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isMapeoFile && processingState === 'processing' && (
              <Alert className="mt-8 bg-amber-50 border-amber-500 text-amber-800">
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
