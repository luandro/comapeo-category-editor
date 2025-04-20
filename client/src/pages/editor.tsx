import { useEffect, useState } from 'react';
import { useConfigStore } from '@/lib/store';
import { Header } from '@/components/header';
import { PageContainer } from '@/components/ui/page-container';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  InfoIcon, 
  TagIcon, 
  FormInput, 
  Globe, 
  Image, 
  Code 
} from 'lucide-react';

import MetadataTab from './tabs/metadata-tab';
import PresetsTab from './tabs/presets-tab';
import FieldsTab from './tabs/fields-tab';
import TranslationsTab from './tabs/translations-tab';
import IconsTab from './tabs/icons-tab';
import AdvancedTab from './tabs/advanced-tab';

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
      
      <PageContainer>
        <Tabs 
          defaultValue={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-6 border-b border-gray-200 w-full justify-start rounded-none pb-0 h-auto">
            <TabsTrigger 
              value="metadata" 
              className="px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <InfoIcon className="mr-2 h-4 w-4" />
              Metadata
            </TabsTrigger>
            <TabsTrigger 
              value="presets" 
              className="px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <TagIcon className="mr-2 h-4 w-4" />
              Presets
            </TabsTrigger>
            <TabsTrigger 
              value="fields" 
              className="px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <FormInput className="mr-2 h-4 w-4" />
              Fields
            </TabsTrigger>
            <TabsTrigger 
              value="translations" 
              className="px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Globe className="mr-2 h-4 w-4" />
              Translations
            </TabsTrigger>
            <TabsTrigger 
              value="icons" 
              className="px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Image className="mr-2 h-4 w-4" />
              Icons
            </TabsTrigger>
            <TabsTrigger 
              value="advanced" 
              className="px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Code className="mr-2 h-4 w-4" />
              Advanced
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
        </Tabs>
      </PageContainer>
    </div>
  );
}
