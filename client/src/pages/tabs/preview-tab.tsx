
import { useState } from 'react';
import { useConfigStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PreviewTab() {
  const { config, rawFiles } = useConfigStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('mobile');
  const [filterCategory, setFilterCategory] = useState('all');
  
  if (!config) return null;
  
  // Extract presets from config
  const presets = Array.isArray(config?.presets) ? config.presets : [];
  
  // Get categories for filtering
  const categories = ['all', ...new Set(presets.map(preset => 
    preset.tags?.category || 'uncategorized'
  ))];

  // Filter presets based on search query and category
  const filteredPresets = presets.filter(preset => {
    const matchesSearch = preset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || 
                           (preset.tags?.category || 'uncategorized') === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Sample icons data to match the screenshot
  const sampleIcons = [
    { name: 'Airstrip', color: '#f4511e' },
    { name: 'Animal', color: '#6e4c41' },
    { name: 'Boundary', color: '#9575cd' },
    { name: 'Building', color: '#43a047' },
    { name: 'Camp', color: '#2196f3' },
    { name: 'Cave', color: '#212121' },
    { name: 'Clay', color: '#bf5f00' },
    { name: 'Community', color: '#795548' },
    { name: 'Farmland', color: '#8bc34a' },
    { name: 'Fishing Site', color: '#0288d1' },
    { name: 'Gathering Site', color: '#8d6e63' },
    { name: 'Hills', color: '#1b5e20' },
    { name: 'House', color: '#795548' },
    { name: 'Hunting Site', color: '#795548' },
    { name: 'Lake', color: '#29b6f6' },
    { name: 'New point', color: '#ec407a' },
    { name: 'Palm', color: '#4caf50' },
    { name: 'Path', color: '#9e9e9e' }
  ];

  // Use either filtered presets or sample icons depending on what's available
  const displayIcons = filteredPresets.length > 0 && searchQuery === '' && filterCategory === 'all' 
    ? sampleIcons 
    : filteredPresets;

  return (
    <>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center">
            <div className="w-full md:w-auto">
              <Input
                placeholder="Search presets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            <div className="w-full md:w-auto">
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="View mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile">Mobile View</SelectItem>
                  <SelectItem value="tablet">Tablet View</SelectItem>
                  <SelectItem value="desktop">Desktop View</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {categories.length > 1 && (
              <div className="w-full md:w-auto">
                <Tabs value={filterCategory} onValueChange={setFilterCategory} className="w-full">
                  <TabsList className="w-full md:w-auto overflow-x-auto">
                    {categories.map((category) => (
                      <TabsTrigger key={category} value={category} className="capitalize">
                        {category}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}
          </div>
          
          <div className={`mx-auto ${viewMode === 'mobile' ? 'max-w-[375px]' : viewMode === 'tablet' ? 'max-w-[768px]' : 'max-w-full'}`}>
            <div className="relative bg-white rounded-lg shadow-md overflow-hidden">
              {/* Mobile-like header */}
              <div className="p-4 border-b border-gray-200 flex items-center">
                <X className="h-6 w-6 mr-3" />
                <div className="text-xl font-semibold">Choose what is happening</div>
              </div>
              
              {/* Grid of preset icons */}
              <div className={`p-4 grid ${viewMode === 'mobile' ? 'grid-cols-3' : viewMode === 'tablet' ? 'grid-cols-4' : 'grid-cols-6'} gap-6 overflow-y-auto max-h-[70vh]`}>
                {displayIcons.length > 0 ? (
                  displayIcons.map((item, index) => {
                    const name = item.name || '';
                    
                    return (
                      <div key={index} className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-2 overflow-hidden border border-gray-100">
                          {/* Custom icon rendering to match the screenshot */}
                          {item.icon ? (
                            <span className="material-icons text-2xl">{item.icon}</span>
                          ) : (
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center"
                              style={{ 
                                backgroundColor: item.color ? 'white' : '#f5f5f5',
                              }}
                            >
                              {(() => {
                                // Render different icons based on the name
                                if (name === 'Airstrip') return <span style={{color: item.color}} className="material-icons">flight</span>;
                                if (name === 'Animal') return <span style={{color: item.color}} className="material-icons">pets</span>;
                                if (name === 'Boundary') return <span style={{color: item.color}} className="material-icons">timeline</span>;
                                if (name === 'Building') return <span style={{color: item.color}} className="material-icons">domain</span>;
                                if (name === 'Camp') return <span style={{color: item.color}} className="material-icons">cabin</span>;
                                if (name === 'Cave') return <span style={{color: item.color}} className="material-icons">hiking</span>;
                                if (name === 'Clay') return <span style={{color: item.color}} className="material-icons">water_drop</span>;
                                if (name === 'Community') return <span style={{color: item.color}} className="material-icons">location_city</span>;
                                if (name === 'Farmland') return <span style={{color: item.color}} className="material-icons">grass</span>;
                                if (name === 'Fishing Site') return <span style={{color: item.color}} className="material-icons">phishing</span>;
                                if (name === 'Gathering Site') return <span style={{color: item.color}} className="material-icons">people</span>;
                                if (name === 'Hills') return <span style={{color: item.color}} className="material-icons">landscape</span>;
                                if (name === 'House') return <span style={{color: item.color}} className="material-icons">home</span>;
                                if (name === 'Hunting Site') return <span style={{color: item.color}} className="material-icons">sports</span>;
                                if (name === 'Lake') return <span style={{color: item.color}} className="material-icons">water</span>;
                                if (name === 'New point') return <span style={{color: item.color}} className="material-icons">add_location</span>;
                                if (name === 'Palm') return <span style={{color: item.color}} className="material-icons">park</span>;
                                if (name === 'Path') return <span style={{color: item.color}} className="material-icons">alt_route</span>;
                                
                                // Default icon if no match
                                return <span className="text-2xl font-bold" style={{color: item.color || '#9e9e9e'}}>
                                  {name.charAt(0).toUpperCase()}
                                </span>;
                              })()}
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-center">{name}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No presets found matching your search
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-sm text-gray-500 text-center">
            <p>This preview shows how presets will appear in the CoMapeo mobile app.</p>
            <p>The actual appearance may vary slightly based on the device and CoMapeo version.</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
