import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

interface LanguageDialogProps {
  existingLocales: string[];
  onAddLanguage: (locale: string) => void;
  onCancel: () => void;
}

// List of available languages
const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English (en)' },
  { code: 'es', name: 'Spanish (es)' },
  { code: 'pt', name: 'Portuguese (pt)' },
  { code: 'fr', name: 'French (fr)' },
  { code: 'de', name: 'German (de)' },
  { code: 'it', name: 'Italian (it)' },
  { code: 'ru', name: 'Russian (ru)' },
  { code: 'zh', name: 'Chinese (zh)' },
  { code: 'ja', name: 'Japanese (ja)' },
  { code: 'ko', name: 'Korean (ko)' },
  { code: 'ar', name: 'Arabic (ar)' },
];

export function LanguageDialog({ existingLocales, onAddLanguage, onCancel }: LanguageDialogProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [autoTranslate, setAutoTranslate] = useState(false);

  // Filter out languages that already exist
  const availableLanguages = AVAILABLE_LANGUAGES.filter(
    (lang) => !existingLocales.includes(lang.code)
  );

  const handleSubmit = () => {
    if (selectedLanguage) {
      onAddLanguage(selectedLanguage);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Language</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="language">Language</Label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger id="language">
                <SelectValue placeholder="Select a language..." />
              </SelectTrigger>
              <SelectContent>
                {availableLanguages.length === 0 ? (
                  <SelectItem value="" disabled>
                    All languages already added
                  </SelectItem>
                ) : (
                  availableLanguages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="sourceLanguage">Source Language for Auto-Translation</Label>
            <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
              <SelectTrigger id="sourceLanguage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {existingLocales.map((locale) => {
                  const language = AVAILABLE_LANGUAGES.find((lang) => lang.code === locale);
                  return (
                    <SelectItem key={locale} value={locale}>
                      {language?.name || locale}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoTranslate"
              checked={autoTranslate}
              onCheckedChange={(checked) => setAutoTranslate(!!checked)}
            />
            <Label htmlFor="autoTranslate">Attempt auto-translation of empty strings</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedLanguage}>
            Add Language
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
