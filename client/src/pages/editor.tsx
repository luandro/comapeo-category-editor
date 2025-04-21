import { useEffect, useState } from 'react';
import { useConfigStore } from '@/lib/store';
import { Header } from '@/components/header';
import { PageContainer } from '@/components/ui/page-container';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  InfoIcon, 
  TagIcon, 
  FormInput, 
  Globe, 
  Image, 
  Code,
  Eye
} from 'lucide-react';

import MetadataTab from './tabs/metadata-tab';
import PresetsTab from './tabs/presets-tab';
import FieldsTab from './tabs/fields-tab';
import TranslationsTab from './tabs/translations-tab';
import IconsTab from './tabs/icons-tab';
import AdvancedTab from './tabs/advanced-tab';
import PreviewTab from './tabs/preview-tab';

export default function EditorPage() {
  const { config, setActiveTab, activeTab } = useConfigStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // If no config is loaded, redirect to import page
  useEffect(() => {
    if (!config) {
      toast({
        title: "No configuration loaded",
        description: "Please import a configuration file first.",
        variant: "destructive"
      });
      setLocation('/');
    }
  }, [config, setLocation, toast]);

  if (!config) return null;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <div className="bg-gray-50 border-b py-2">
        <div className="container mx-auto px-4 flex justify-end">
          <Button 
            variant="outline"
            onClick={() => setLocation('/')}
            className="flex items-center text-sm"
          >
            <span className="mr-2">Start Over</span>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 0.875C5.49797 0.875 3.875 2.49797 3.875 4.5C3.875 4.77614 3.65114 5 3.375 5C3.09886 5 2.875 4.77614 2.875 4.5C2.875 1.94365 4.94365 -0.125 7.5 -0.125C10.0563 -0.125 12.125 1.94365 12.125 4.5C12.125 7.05635 10.0563 9.125 7.5 9.125C6.49791 9.125 5.55914 8.79203 4.80577 8.2049C4.57386 8.01436 4.24547 8.04426 4.05493 8.27618C3.86439 8.50809 3.89429 8.83647 4.12621 9.02701C5.05151 9.75202 6.22544 10.125 7.5 10.125C10.5952 10.125 13.125 7.59524 13.125 4.5C13.125 1.40476 10.5952 -1.125 7.5 -1.125C4.40476 -1.125 1.875 1.40476 1.875 4.5C1.875 4.77614 1.65114 5 1.375 5C1.09886 5 0.875 4.77614 0.875 4.5C0.875 0.848241 3.84824 -2.125 7.5 -2.125C11.1518 -2.125 14.125 0.848241 14.125 4.5C14.125 8.15175 11.1518 11.125 7.5 11.125C5.78443 11.125 4.20787 10.4954 3.04529 9.45388C2.8311 9.2592 2.469 9.28393 2.27432 9.49812C2.07964 9.71231 2.10437 10.0744 2.31856 10.2691C3.67349 11.4758 5.52188 12.125 7.5 12.125C11.7016 12.125 15.125 8.70165 15.125 4.5C15.125 0.298348 11.7016 -3.125 7.5 -3.125C3.29835 -3.125 -0.125 0.298348 -0.125 4.5C-0.125 4.77614 -0.34886 5 -0.625 5C-0.90114 5 -1.125 4.77614 -1.125 4.5C-1.125 -0.253349 2.74665 -4.125 7.5 -4.125C12.2533 -4.125 16.125 -0.253349 16.125 4.5C16.125 9.25335 12.2533 13.125 7.5 13.125C5.18322 13.125 3.06731 12.3652 1.45792 11.0209C1.2508 10.8188 0.887755 10.8333 0.685704 11.0404C0.483653 11.2475 0.498072 11.6106 0.705183 11.8126C2.51977 13.3449 4.91533 14.125 7.5 14.125C12.8057 14.125 17.125 9.8057 17.125 4.5C17.125 -0.805698 12.8057 -5.125 7.5 -5.125C2.1943 -5.125 -2.125 -0.805698 -2.125 4.5C-2.125 4.77614 -2.34886 5 -2.625 5C-2.90114 5 -3.125 4.77614 -3.125 4.5C-3.125 -1.35808 1.64192 -6.125 7.5 -6.125C13.3581 -6.125 18.125 -1.35808 18.125 4.5C18.125 10.3581 13.3581 15.125 7.5 15.125C4.58387 15.125 1.9037 14.2266 -0.0687559 12.5947C-0.288158 12.4016 -0.656721 12.4323 -0.84978 12.6518C-1.04284 12.8712 -1.01221 13.2398 -0.792754 13.4338C2.27286 15.2239 5.17289 16.125 8.5 16.125C14.9036 16.125 20.125 10.9036 20.125 4.5C20.125 -1.90356 14.9036 -7.125 8.5 -7.125C2.09644 -7.125 -3.125 -1.90356 -3.125 4.5C-3.125 4.77614 -3.34886 5 -3.625 5C-3.90114 5 -4.125 4.77614 -4.125 4.5C-4.125 -2.45599 1.04401 -8.125 8.5 -8.125C15.956 -8.125 21.125 -2.45599 21.125 4.5C21.125 11.456 15.956 17.125 8.5 17.125C4.84772 17.125 1.60189 16.1186 -1.06282 14.2177C-1.2915 14.0308 -1.66264 14.0695 -1.84957 14.2982C-2.0365 14.5269 -1.99782 14.898 -1.76915 15.0849C1.09459 17.0838 4.65024 18.125 8.5 18.125C16.5081 18.125 22.125 12.5081 22.125 4.5C22.125 -3.50812 16.5081 -9.125 8.5 -9.125C0.49187 -9.125 -5.125 -3.50812 -5.125 4.5C-5.125 4.77614 -5.34886 5 -5.625 5C-5.90114 5 -6.125 4.77614 -6.125 4.5C-6.125 -4.06055 0.43945 -10.125 8.5 -10.125C16.5605 -10.125 23.125 -4.06055 23.125 4.5C23.125 13.0605 16.5605 19.125 8.5 19.125C4.33474 19.125 0.507753 17.9992 -2.43143 16.0143C-2.66607 15.8342 -3.03436 15.8815 -3.21443 16.1161C-3.39451 16.3508 -3.34729 16.7191 -3.11265 16.8991C0.977787 19.0092 5.03235 20.125 9.5 20.125C18.1127 20.125 25.125 13.1127 25.125 4.5C25.125 -4.11269 18.1127 -11.125 9.5 -11.125C0.887314 -11.125 -6.125 -4.11269 -6.125 4.5C-6.125 4.77614 -6.34886 5 -6.625 5C-6.90114 5 -7.125 4.77614 -7.125 4.5C-7.125 -4.66513 0.334867 -12.125 9.5 -12.125C18.6651 -12.125 26.125 -4.66513 26.125 4.5C26.125 13.6651 18.6651 21.125 9.5 21.125C4.73599 21.125 0.400751 19.9246 -3.21943 17.7143C-3.4587 17.5395 -3.83073 17.5943 -4.0055 17.8336C-4.18027 18.0728 -4.12553 18.4449 -3.88626 18.6196C0.885935 20.9321 5.43538 22.125 10.5 22.125C20.2173 22.125 28.125 14.2173 28.125 4.5C28.125 -5.21731 20.2173 -13.125 10.5 -13.125C0.782695 -13.125 -7.125 -5.21731 -7.125 4.5Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/>
            </svg>
          </Button>
        </div>
      </div>

      <PageContainer>
        <Tabs 
          defaultValue="preview" 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-6 border-b border-gray-200 w-full justify-start rounded-none pb-0 h-auto overflow-x-auto flex flex-nowrap">
            <TabsTrigger 
              value="preview" 
              className="px-3 md:px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none whitespace-nowrap flex-shrink-0"
            >
              <Eye className="mr-1 md:mr-2 h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger 
              value="presets" 
              className="px-3 md:px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none whitespace-nowrap flex-shrink-0"
            >
              <TagIcon className="mr-1 md:mr-2 h-4 w-4" />
              Presets
            </TabsTrigger>
            <TabsTrigger 
              value="fields" 
              className="px-3 md:px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none whitespace-nowrap flex-shrink-0"
            >
              <FormInput className="mr-1 md:mr-2 h-4 w-4" />
              Fields
            </TabsTrigger>
            <TabsTrigger 
              value="translations" 
              className="px-3 md:px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none whitespace-nowrap flex-shrink-0"
            >
              <Globe className="mr-1 md:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Translations</span>
              <span className="sm:hidden">Trans</span>
            </TabsTrigger>
            <TabsTrigger 
              value="icons" 
              className="px-3 md:px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none whitespace-nowrap flex-shrink-0"
            >
              <Image className="mr-1 md:mr-2 h-4 w-4" />
              Icons
            </TabsTrigger>
            <TabsTrigger 
              value="metadata" 
              className="px-3 md:px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none whitespace-nowrap flex-shrink-0"
            >
              <InfoIcon className="mr-1 md:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Metadata</span>
              <span className="sm:hidden">Meta</span>
            </TabsTrigger>

            <TabsTrigger 
              value="advanced" 
              className="px-3 md:px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none whitespace-nowrap flex-shrink-0"
            >
              <Code className="mr-1 md:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Advanced</span>
              <span className="sm:hidden">Adv</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="metadata">
            <MetadataTab />
          </TabsContent>

          <TabsContent value="presets">
            <PresetsTab />
          </TabsContent>

          <TabsContent value="fields">
            <FieldsTab />
          </TabsContent>

          <TabsContent value="translations">
            <TranslationsTab />
          </TabsContent>

          <TabsContent value="icons">
            <IconsTab />
          </TabsContent>

          <TabsContent value="advanced">
            <AdvancedTab />
          </TabsContent>

          <TabsContent value="preview">
            <PreviewTab />
          </TabsContent>
        </Tabs>
      </PageContainer>
    </div>
  );
}