import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { buildComapeoCatFile, createZipFile } from '@/lib/file-handling';
import { useConfigStore } from '@/lib/store';
import { FileDown } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { ExportDialog } from './dialogs/export-dialog';

export function Header() {
  const { config, rawFiles } = useConfigStore();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [location] = useLocation();
  const { toast } = useToast();

  const handleExport = async () => {
    if (!config) {
      toast({
        title: 'No configuration',
        description: 'Please import a configuration file first.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      // Create a zip file from the current configuration
      const zipBlob = await createZipFile(config, rawFiles);

      // Build the .comapeocat file using the API
      const comapeoCatBlob = await buildComapeoCatFile(zipBlob);

      // Create URL for download
      const url = URL.createObjectURL(comapeoCatBlob);
      setExportUrl(url);

      // Save to server for sharing
      const hashId = await useConfigStore.getState().saveConfigToServer();

      // Create share URL
      const host = window.location.origin;
      setShareUrl(`${host}/#/config/${hashId}`);

      // Show export dialog
      setShowExportDialog(true);
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const closeExportDialog = () => {
    setShowExportDialog(false);
    if (exportUrl) {
      URL.revokeObjectURL(exportUrl);
      setExportUrl(null);
    }
  };

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center">
          <span className="text-xl font-semibold text-primary">CoMapeo Config Editor</span>
        </div>
        <div>
          {location !== '/' && (
            <Button
              onClick={handleExport}
              disabled={!config || isExporting}
              className="flex items-center"
            >
              <FileDown className="mr-2 h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export .comapeocat'}
            </Button>
          )}
        </div>
      </div>

      {showExportDialog && exportUrl && shareUrl && (
        <ExportDialog downloadUrl={exportUrl} shareUrl={shareUrl} onClose={closeExportDialog} />
      )}
    </header>
  );
}
