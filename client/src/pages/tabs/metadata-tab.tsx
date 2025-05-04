import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useConfigStore } from '@/lib/store';
import { useEffect, useState } from 'react';

export default function MetadataTab() {
  const { config, updateMetadata } = useConfigStore();
  const [formData, setFormData] = useState({
    name: '',
    version: '',
    fileVersion: '',
    buildDate: '',
    description: '',
  });

  useEffect(() => {
    if (config) {
      setFormData({
        name: config.metadata.name || '',
        version: config.metadata.version || '',
        fileVersion: config.metadata.fileVersion || '',
        buildDate: config.metadata.buildDate || '',
        description: config.metadata.description || '',
      });
    }
  }, [config]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));

    // Update the store (except for buildDate which is read-only)
    if (id !== 'buildDate') {
      updateMetadata({ [id]: value });
    }
  };

  if (!config) return null;

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-6">Configuration Metadata</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-1">
                Configuration Name
              </Label>
              <Input id="name" value={formData.name} onChange={handleChange} className="w-full" />
              <p className="mt-1 text-sm text-gray-500">Unique identifier (npm package style)</p>
            </div>

            <div>
              <Label htmlFor="version" className="text-sm font-medium text-gray-700 mb-1">
                Version
              </Label>
              <Input
                id="version"
                value={formData.version}
                onChange={handleChange}
                className="w-full"
              />
              <p className="mt-1 text-sm text-gray-500">Semantic version (e.g., 1.0.0)</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="fileVersion" className="text-sm font-medium text-gray-700 mb-1">
                File Version
              </Label>
              <Input
                id="fileVersion"
                value={formData.fileVersion}
                onChange={handleChange}
                className="w-full"
              />
              <p className="mt-1 text-sm text-gray-500">CoMapeo format version</p>
            </div>

            <div>
              <Label htmlFor="buildDate" className="text-sm font-medium text-gray-700 mb-1">
                Build Date
              </Label>
              <Input
                id="buildDate"
                value={formData.buildDate}
                readOnly
                className="w-full bg-gray-50 cursor-not-allowed"
              />
              <p className="mt-1 text-sm text-gray-500">Automatically updated on export</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Label htmlFor="description" className="text-sm font-medium text-gray-700 mb-1">
            Configuration Description
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}
