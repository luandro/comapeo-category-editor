import { useState } from 'react';
import { useConfigStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, RefreshCw } from 'lucide-react';
import { LanguageDialog } from '@/components/dialogs/language-dialog';

export default function TranslationsTab() {
  const { config, updateTranslation, addLanguage } = useConfigStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('presets');
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);

  // Get available locales
  const locales = config ? Object.keys(config.translations) : [];

  // Function to flatten nested translations
  const flattenTranslations = (obj: any, prefix: string = ''): Record<string, string> => {
    let result: Record<string, string> = {};

    for (const key in obj) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof obj[key] === 'object' && obj[key] !== null) {
        // If it's an object with a 'label' property, it's likely a field or option
        if (obj[key].label) {
          result[`${newKey}.label`] = obj[key].label;

          // Also add other properties like helperText if they exist
          if (obj[key].helperText) {
            result[`${newKey}.helperText`] = obj[key].helperText;
          }
          if (obj[key].placeholder) {
            result[`${newKey}.placeholder`] = obj[key].placeholder;
          }

          // Handle options if they exist
          if (obj[key].options && typeof obj[key].options === 'object') {
            for (const optKey in obj[key].options) {
              if (obj[key].options[optKey].label) {
                result[`${newKey}.options.${optKey}.label`] = obj[key].options[optKey].label;
              }
            }
          }
        } else {
          // Recursively flatten nested objects
          const nested = flattenTranslations(obj[key], newKey);
          result = { ...result, ...nested };
        }
      } else if (typeof obj[key] === 'string') {
        // It's a simple string value
        result[newKey] = obj[key];
      }
    }

    return result;
  };

  // Flatten translations for display
  const flatTranslations: Record<string, Record<string, string>> = {};
  if (config) {
    for (const locale of locales) {
      if (config.translations[locale]) {
        flatTranslations[locale] = flattenTranslations(config.translations[locale]);
      } else {
        flatTranslations[locale] = {};
      }
    }
  }

  // Get all unique keys from all locales
  const allKeys = new Set<string>();
  for (const locale of locales) {
    Object.keys(flatTranslations[locale] || {}).forEach(key => allKeys.add(key));
  }

  // Filter and categorize translation keys
  const filteredKeys = !config ? [] : Array.from(allKeys)
    .filter(key => {
      // Filter by search query
      if (searchQuery && !key.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Filter by category
      if (category === 'presets' && key.startsWith('presets')) return true;
      if (category === 'fields' && key.startsWith('fields') && !key.includes('options')) return true;
      if (category === 'options' && key.includes('options')) return true;
      if (category === 'other' && !key.startsWith('presets') && !key.startsWith('fields')) return true;

      return false;
    })
    .sort();

  const handleTranslationChange = (locale: string, key: string, value: string) => {
    // Split the key into parts to handle nested structure
    const keyParts = key.split('.');
    updateTranslation(locale, key, value, keyParts);
  };

  const handleAddLanguage = (locale: string) => {
    addLanguage(locale);
    setShowLanguageDialog(false);
  };

  const refreshTranslationKeys = () => {
    if (!config || locales.length === 0) return;

    // Get all unique keys from all locales
    const allTranslationKeys = new Set<string>();
    for (const locale of locales) {
      Object.keys(flatTranslations[locale] || {}).forEach(key => allTranslationKeys.add(key));
    }

    // Ensure all keys exist in all locales
    for (const locale of locales) {
      for (const key of allTranslationKeys) {
        if (!flatTranslations[locale]?.[key]) {
          // If key doesn't exist in this locale, add it with empty value
          const keyParts = key.split('.');
          updateTranslation(locale, key, '', keyParts);
        }
      }
    }

    // Show success message
    alert(`Translation keys refreshed. All ${allTranslationKeys.size} keys are now available in all ${locales.length} languages.`);
  };

  if (!config) return null;

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Translations</h2>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowLanguageDialog(true)}
                className="flex items-center"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Language
              </Button>
              <Button
                onClick={refreshTranslationKeys}
                className="flex items-center"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Keys
              </Button>
            </div>
          </div>

          <div className="mb-4 flex space-x-4">
            <Select
              value={category}
              onValueChange={setCategory}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="presets">Presets</SelectItem>
                <SelectItem value="fields">Fields</SelectItem>
                <SelectItem value="options">Field Options</SelectItem>
                <SelectItem value="other">Other UI Elements</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Search translation keys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  {locales.map(locale => (
                    <TableHead key={locale}>{locale}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKeys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={locales.length + 1} className="text-center py-6 text-gray-500">
                      No translation keys found for this category.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredKeys.map((key) => (
                    <TableRow key={key}>
                      <TableCell className="font-medium">{key}</TableCell>
                      {locales.map(locale => (
                        <TableCell key={`${locale}-${key}`}>
                          <Input
                            value={flatTranslations[locale]?.[key] || ''}
                            onChange={(e) => handleTranslationChange(locale, key, e.target.value)}
                            className="w-full"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {showLanguageDialog && (
        <LanguageDialog
          existingLocales={locales}
          onAddLanguage={handleAddLanguage}
          onCancel={() => setShowLanguageDialog(false)}
        />
      )}
    </>
  );
}
