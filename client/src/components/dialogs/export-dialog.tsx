import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Copy, Download } from 'lucide-react';
import { useState } from 'react';

interface ExportDialogProps {
  downloadUrl: string;
  shareUrl: string;
  onClose: () => void;
}

export function ExportDialog({ downloadUrl, shareUrl, onClose }: ExportDialogProps) {
  const [_isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);

      toast({
        title: 'Link copied',
        description: 'The share URL has been copied to your clipboard.',
      });

      setTimeout(() => setIsCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      toast({
        title: 'Copy failed',
        description: 'Could not copy the URL to clipboard.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold">Export Successful!</h3>
          <p className="text-gray-600 mt-2">Your .comapeocat file is ready for download.</p>
        </div>

        <div className="flex flex-col space-y-4">
          <a
            href={downloadUrl}
            download="config.comapeocat"
            className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <Download className="mr-2 h-5 w-5" />
            Download .comapeocat File
          </a>

          <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
            <p className="text-sm font-medium text-gray-800 mb-2">Share this configuration</p>
            <div className="flex items-center">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1 bg-white border-r-0 rounded-r-none"
              />
              <Button
                variant="outline"
                className="rounded-l-none border-l-0"
                onClick={handleCopyShareUrl}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Anyone with this link can view and edit this configuration
            </p>
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
