import { CoMapeoConfig, CoMapeoField, CoMapeoPreset, ConfigFile } from '@shared/schema';
// We need to use a more flexible type for translations since they're nested
type DeepRecord = Record<string, any>;
import { nanoid } from 'nanoid';

/**
 * Creates a sample configuration for testing
 */
export function createSampleConfig(): CoMapeoConfig {
  // Create sample fields
  const fields: CoMapeoField[] = [
    {
      id: 'name',
      name: 'Name',
      tagKey: 'name',
      type: 'text',
      universal: true,
      helperText: 'The name of this place'
    },
    {
      id: 'building-type',
      name: 'Building Type',
      tagKey: 'building-type',
      type: 'selectOne',
      universal: false,
      helperText: 'School/hospital/etc',
      options: [
        { label: 'School', value: 'school' },
        { label: 'Hospital', value: 'hospital' },
        { label: 'Community Center', value: 'community' }
      ]
    }
  ];

  // Create sample presets
  const presets: CoMapeoPreset[] = [
    {
      id: 'building',
      name: 'Building',
      tags: { type: 'building' },
      color: '#B209B2',
      icon: 'building',
      fieldRefs: ['name', 'building-type'],
      geometry: ['point']
    },
    {
      id: 'school',
      name: 'School',
      tags: { type: 'building', building: 'school' },
      color: '#0033CC',
      icon: 'school',
      fieldRefs: ['name'],
      addTags: { 'building-type': 'school' },
      geometry: ['point']
    }
  ];

  // Create sample translations
  const translations = {
    'en': {
      'fields': {
        'name': {
          'label': 'Name',
          'helperText': 'The name of this place'
        },
        'building-type': {
          'label': 'Building Type',
          'helperText': 'School/hospital/etc',
          'options': {
            'school': { 'label': 'School' },
            'hospital': { 'label': 'Hospital' },
            'community': { 'label': 'Community Center' }
          }
        }
      },
      'presets': {
        'building': { 'name': 'Building' },
        'school': { 'name': 'School' }
      }
    },
    'es': {
      'fields': {
        'name': {
          'label': 'Nombre',
          'helperText': 'El nombre de este lugar'
        },
        'building-type': {
          'label': 'Tipo de Edificio',
          'helperText': 'Escuela/hospital/etc',
          'options': {
            'school': { 'label': 'Escuela' },
            'hospital': { 'label': 'Hospital' },
            'community': { 'label': 'Centro Comunitario' }
          }
        }
      },
      'presets': {
        'building': { 'name': 'Edificio' },
        'school': { 'name': 'Escuela' }
      }
    }
  };

  // Create sample icons
  const icons = {
    'building': { 'src': 'icons/building.svg' },
    'school': { 'src': 'icons/school.svg' }
  };

  // Create sample metadata
  const metadata = {
    name: 'Sample Configuration',
    version: '1.0.0',
    fileVersion: '1',
    description: 'A sample configuration for testing',
    buildDate: new Date().toISOString()
  };

  return {
    fields,
    presets,
    translations,
    icons,
    metadata
  };
}

/**
 * Creates sample icon files
 */
export function createSampleIconFiles(): ConfigFile[] {
  return [
    {
      name: 'building.svg',
      path: 'icons/building.svg',
      content: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>'
    },
    {
      name: 'school.svg',
      path: 'icons/school.svg',
      content: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>'
    }
  ];
}