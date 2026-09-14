import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  registry,
  resolveComponent,
  metadataImportPath,
  CATEGORIES,
  COMPLEXITY_LEVELS,
  CAPABILITIES,
} from '../index.js';
import { registry as registryViaShim } from '../../registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '../../../templates');

/** The slugs the CLI shipped before the catalog expansion. None may be lost. */
const LEGACY_KEYS = [
  'bar-chart',
  'line-chart',
  'area-chart',
  'pie-chart',
  'radar-chart',
  'bubble-chart',
  'heatmap-chart',
  'treemap-chart',
  'scatter-chart',
  'sankey-chart',
  'composite-chart',
  'chord-chart',
  'candlestick-chart',
  'chart-legend',
  'funnel-chart',
  'radial-bar-chart',
  'waffle-chart',
];

const entries = Object.entries(registry);

describe('registry - backward compatibility', () => {
  it('should expose every slug the CLI shipped before the catalog expansion', () => {
    expect(Object.keys(registry).sort()).toEqual([...LEGACY_KEYS].sort());
  });

  it('should keep resolving through the src/registry.js shim', () => {
    expect(registryViaShim).toBe(registry);
  });

  it.each(entries)('should keep the fields add.js reads for %s', (_slug, entry) => {
    expect(typeof entry.file).toBe('string');
    expect(typeof entry.label).toBe('string');
    expect(Array.isArray(entry.dependencies)).toBe(true);
    expect(entry.dependencies.length).toBeGreaterThan(0);
  });

  it.each(entries)('should point %s at a template that exists on disk', (_slug, entry) => {
    expect(fs.existsSync(path.join(TEMPLATES_DIR, entry.file))).toBe(true);
  });
});

describe('registry - catalog metadata', () => {
  it.each(entries)('should classify %s with known vocabulary values', (_slug, entry) => {
    expect(CATEGORIES).toContain(entry.category);
    expect(COMPLEXITY_LEVELS).toContain(entry.complexity);
    expect(entry.capabilities.length).toBeGreaterThan(0);
    entry.capabilities.forEach((capability) => expect(CAPABILITIES).toContain(capability));
  });

  it.each(entries)('should describe %s with prose, use cases, and a data shape', (_slug, entry) => {
    expect(entry.description.length).toBeGreaterThan(20);
    expect(entry.dataShape.length).toBeGreaterThan(0);
    expect(entry.useCases.length).toBeGreaterThanOrEqual(3);
    expect(entry.name).toBe(entry.file.replace('.tsx', ''));
  });

  it.each(entries)('should state coherent data requirements for %s', (_slug, entry) => {
    const { minRows, maxRecommended, requiredProps } = entry.dataRequirements;
    expect(minRows).toBeGreaterThanOrEqual(1);
    expect(maxRecommended).toBeGreaterThanOrEqual(minRows);
    expect(requiredProps.length).toBeGreaterThan(0);
  });

  it.each(entries)('should give %s an example that calls the component', (_slug, entry) => {
    expect(entry.example.scenario.length).toBeGreaterThan(0);
    expect(entry.example.code).toContain(`<${entry.name}`);
    expect(entry.example.data).toBeTruthy();
  });

  it.each(entries)('should size %s with a supported mode', (_slug, entry) => {
    expect(['self', 'parent', 'inline']).toContain(entry.sizing.mode);
  });

  it('should supply enough example rows to satisfy each chart’s own minRows', () => {
    entries
      .filter(([, entry]) => Array.isArray(entry.example.data))
      .forEach(([slug, entry]) => {
        expect(
          entry.example.data.length,
          `${slug} example has fewer rows than its stated minRows`,
        ).toBeGreaterThanOrEqual(entry.dataRequirements.minRows);
      });
  });
});

describe('resolveComponent', () => {
  it.each(entries)('should resolve %s by slug, component name, and label', (slug, entry) => {
    expect(resolveComponent(slug)).toBe(slug);
    expect(resolveComponent(entry.name)).toBe(slug);
    expect(resolveComponent(entry.label)).toBe(slug);
  });

  it.each([
    ['BarChart', 'bar-chart'],
    ['barchart', 'bar-chart'],
    ['BAR_CHART', 'bar-chart'],
    ['Radial Bar Chart', 'radial-bar-chart'],
    ['ChordChart', 'chord-chart'],
  ])('should ignore case and separators when resolving %s', (query, expected) => {
    expect(resolveComponent(query)).toBe(expected);
  });

  it.each([['no-such-chart'], [''], ['---'], [null], [undefined], [42]])(
    'should return null for the unresolvable input %s',
    (query) => {
      expect(resolveComponent(query)).toBeNull();
    },
  );

  it('should not resolve inherited Object properties as components', () => {
    expect(resolveComponent('constructor')).toBeNull();
    expect(resolveComponent('toString')).toBeNull();
  });
});

describe('metadataImportPath', () => {
  it('should point at the component’s own metadata export', () => {
    expect(metadataImportPath('bar-chart')).toBe('@/components/waffle/BarChart#BarChartMeta');
    expect(metadataImportPath('radial-bar-chart')).toBe(
      '@/components/waffle/RadialBarChart#RadialBarChartMeta',
    );
  });

  it.each(entries.filter(([, entry]) => entry.category !== 'utility'))(
    'should derive a path from the file and name of %s',
    (slug, entry) => {
      expect(metadataImportPath(slug)).toBe(
        `@/components/waffle/${entry.file.replace(/\.tsx$/, '')}#${entry.name}Meta`,
      );
    },
  );

  it('should return null for a utility component, which publishes no metadata', () => {
    expect(metadataImportPath('chart-legend')).toBeNull();
  });

  it.each([['no-such-chart'], [''], ['constructor'], ['toString']])(
    'should return null for the unresolvable slug %s',
    (slug) => {
      expect(metadataImportPath(slug)).toBeNull();
    },
  );
});
