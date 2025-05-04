import { extractTarFile } from '../file-handling';
import { convertMapeoToCoMapeo } from '../conversion';

// Mock the File API
global.File = class MockFile {
  name: string;
  type: string;
  arrayBuffer: () => Promise<ArrayBuffer>;

  constructor(_bits: BlobPart[], name: string, options?: FilePropertyBag) {
    this.name = name;
    this.type = options?.type || '';
    
    // Create a simple ArrayBuffer from the mock tar content
    this.arrayBuffer = async () => {
      return new ArrayBuffer(0); // This will be replaced in tests
    };
  }
};

// Mock TextDecoder
global.TextDecoder = class MockTextDecoder {
  decode(_buffer: ArrayBuffer): string {
    // Return mock content based on the test case
    return ''; // This will be replaced in tests
  }
};

describe('Mapeo Import', () => {
  // Test the conversion of Mapeo fields to CoMapeo fields
  test('should convert Mapeo fields to CoMapeo fields without errors', () => {
    // Sample Mapeo config with problematic field structure
    const mapeoConfig = {
      metadata: {
        dataset_id: 'test-dataset',
        version: 'v1.0.0',
        name: 'Test Mapeo Config'
      },
      presets: {
        fields: {
          'building-type': {
            key: 'building-type',
            type: 'select_one',
            label: 'Building type',
            placeholder: 'School/hospital/etc',
            options: {
              'School': { label: 'School', value: 'school' },
              'Hospital': { label: 'Hospital', value: 'hospital' }
            }
          }
        },
        presets: {
          building: {
            icon: 'building',
            fields: ['building-type'],
            geometry: ['point'],
            tags: { type: 'building' },
            terms: ['medical'],
            name: 'Building'
          }
        }
      },
      translations: {
        en: {
          fields: {
            'building-type': {
              label: 'Building type',
              options: {
                'School': 'School',
                'Hospital': 'Hospital'
              },
              placeholder: 'School/hospital/etc'
            }
          }
        }
      }
    };

    // Convert the Mapeo config to CoMapeo format
    const coMapeoConfig = convertMapeoToCoMapeo(mapeoConfig);

    // Verify the conversion was successful
    expect(coMapeoConfig).toBeDefined();
    expect(coMapeoConfig.metadata).toBeDefined();
    expect(coMapeoConfig.fields).toBeDefined();
    expect(coMapeoConfig.presets).toBeDefined();
    expect(coMapeoConfig.translations).toBeDefined();

    // Check that fields were properly converted
    expect(Array.isArray(coMapeoConfig.fields)).toBe(true);
    
    // Verify each field has the required properties and they are of the correct type
    coMapeoConfig.fields.forEach(field => {
      expect(typeof field.id).toBe('string');
      expect(typeof field.name).toBe('string');
      expect(typeof field.tagKey).toBe('string');
      expect(typeof field.type).toBe('string');
      expect(typeof field.universal).toBe('boolean');
      expect(typeof field.helperText).toBe('string');
      
      // If options exist, verify they are properly formatted
      if (field.options) {
        expect(Array.isArray(field.options)).toBe(true);
        field.options.forEach(option => {
          expect(typeof option.label).toBe('string');
          expect(typeof option.value).toBe('string');
        });
      }
    });

    // Check that presets were properly converted
    expect(Array.isArray(coMapeoConfig.presets)).toBe(true);
    
    // Verify each preset has the required properties
    coMapeoConfig.presets.forEach(preset => {
      expect(typeof preset.id).toBe('string');
      expect(typeof preset.name).toBe('string');
      expect(typeof preset.color).toBe('string');
      expect(typeof preset.icon).toBe('string');
      expect(Array.isArray(preset.fieldRefs)).toBe(true);
      expect(Array.isArray(preset.geometry)).toBe(true);
    });

    // Check that translations were properly converted
    expect(typeof coMapeoConfig.translations).toBe('object');
    expect(coMapeoConfig.translations.en).toBeDefined();
    
    // Verify translations don't contain any objects that would cause React rendering issues
    const checkForObjects = (obj: any) => {
      for (const key in obj) {
        const value = obj[key];
        if (value !== null && typeof value === 'object') {
          // If it's an object, it should have a specific structure
          if ('fields' in value || 'presets' in value) {
            // This is a valid structure, check its children
            checkForObjects(value);
          } else if ('label' in value || 'value' in value) {
            // This is a valid option structure
            expect(typeof value.label).toBe('string');
            if ('value' in value) {
              expect(typeof value.value).toBe('string');
            }
          } else if ('options' in value) {
            // This is a valid field structure
            checkForObjects(value.options);
          } else {
            // Any other object should be a nested structure
            checkForObjects(value);
          }
        } else if (value !== null) {
          // Non-object values should be primitive types
          expect(['string', 'number', 'boolean', 'undefined']).toContain(typeof value);
        }
      }
    };
    
    checkForObjects(coMapeoConfig.translations);
  });
});
