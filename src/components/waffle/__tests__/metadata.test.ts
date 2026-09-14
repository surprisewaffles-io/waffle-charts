/**
 * Why: the metadata catalog exists to be read by callers who cannot inspect the
 * components themselves — an agent picking a chart, a validator checking data.
 * Those callers trust the shape without checking it, so the shape has to be
 * guaranteed here.
 *
 * What: covers the catalog's completeness, its per-entry shape, its use of the
 * declared tag vocabulary, and the four lookups.
 *
 * Test: this file.
 */
import { describe, expect, it } from 'vitest';
import {
  CHART_CAPABILITIES,
  CHART_CATEGORIES,
  CHART_COMPLEXITY_LEVELS,
  CHART_DATA_KINDS,
  COMPONENT_NAMES,
  ComponentMetadata,
  getComponentMeta,
  getComponentsByCapability,
  getComponentsByCategory,
  getComponentsByComplexity,
  getComponentsForRowCount,
  isComponentName,
} from '../metadata';

const EXPECTED_COMPONENTS = [
  'AreaChart',
  'BarChart',
  'BubbleChart',
  'CandlestickChart',
  'ChordChart',
  'CompositeChart',
  'FunnelChart',
  'HeatmapChart',
  'LineChart',
  'PieChart',
  'RadarChart',
  'RadialBarChart',
  'SankeyChart',
  'ScatterChart',
  'TreemapChart',
  'WaffleChart',
];

const entries = Object.entries(ComponentMetadata);

describe('ComponentMetadata', () => {
  it('exports metadata for all 16 components', () => {
    expect(Object.keys(ComponentMetadata)).toHaveLength(16);
  });

  it('covers exactly the expected component names', () => {
    expect(Object.keys(ComponentMetadata).sort()).toEqual(EXPECTED_COMPONENTS);
  });

  it('has consistent shape across all components', () => {
    for (const [, meta] of entries) {
      expect(meta).toHaveProperty('name');
      expect(meta).toHaveProperty('category');
      expect(meta).toHaveProperty('description');
      expect(meta).toHaveProperty('dataRequirements');
      expect(meta).toHaveProperty('capabilities');
      expect(meta).toHaveProperty('complexity');
      expect(meta).toHaveProperty('accessibility');
      expect(meta).toHaveProperty('performance');
    }
  });

  it.each(entries)('%s keys itself by its own component name', (key, meta) => {
    expect(meta.name).toBe(key);
  });

  it.each(entries)('%s uses a declared category and complexity', (_key, meta) => {
    expect(CHART_CATEGORIES).toContain(meta.category);
    expect(CHART_COMPLEXITY_LEVELS).toContain(meta.complexity);
  });

  it.each(entries)('%s tags only declared capabilities', (_key, meta) => {
    expect(meta.capabilities.length).toBeGreaterThan(0);
    for (const capability of meta.capabilities) {
      expect(CHART_CAPABILITIES).toContain(capability);
    }
  });

  it.each(entries)('%s declares a coherent data contract', (_key, meta) => {
    const req = meta.dataRequirements;
    expect(CHART_DATA_KINDS).toContain(req.kind);
    expect(req.minRows).toBeGreaterThanOrEqual(1);
    expect(req.maxRecommended).toBeGreaterThanOrEqual(req.minRows);
    expect(req.shape.length).toBeGreaterThan(0);
    expect(req.requiredProps).toContain('data');
    expect(typeof req.fixedFieldNames).toBe('boolean');
    expect(req.notes.length).toBeGreaterThan(0);
  });

  it.each(entries)('%s never lists a prop as both required and optional', (_key, meta) => {
    const req = meta.dataRequirements;
    const overlap = req.requiredProps.filter(prop =>
      (req.optionalProps as readonly string[]).includes(prop),
    );
    expect(overlap).toEqual([]);
  });

  it.each(entries)('%s states its accessibility and memoisation', (_key, meta) => {
    expect(meta.accessibility.wcagLevel).toBe('AA');
    expect(meta.accessibility.keyboardNavigable).toBe(true);
    expect(meta.accessibility.screenReaderSupported).toBe(true);
    expect(meta.performance.memoized).toBe(true);
  });

  it('names a fixed field contract only where there are no accessor props', () => {
    const fixed = entries
      .filter(([, meta]) => meta.dataRequirements.fixedFieldNames)
      .map(([name]) => name);

    // These three read `data` directly; every other chart routes through *Key props.
    expect(fixed.sort()).toEqual(['HeatmapChart', 'SankeyChart', 'TreemapChart']);

    for (const name of fixed) {
      const req = ComponentMetadata[name as keyof typeof ComponentMetadata].dataRequirements;
      expect(req.requiredProps).toEqual(['data']);
      expect(req.requiredFields.length).toBeGreaterThan(0);
    }
  });
});

describe('metadata lookups', () => {
  it('returns the same object the component exports', () => {
    expect(getComponentMeta('BarChart')).toBe(ComponentMetadata.BarChart);
  });

  it('lists names in the same order as the catalog', () => {
    expect(COMPONENT_NAMES).toEqual(Object.keys(ComponentMetadata));
  });

  it('narrows an arbitrary string to a component name', () => {
    expect(isComponentName('BarChart')).toBe(true);
    expect(isComponentName('bar-chart')).toBe(false);
    // Guards against a prototype key being mistaken for a catalog entry.
    expect(isComponentName('toString')).toBe(false);
  });

  it('groups by category', () => {
    expect(getComponentsByCategory('composition').sort()).toEqual([
      'FunnelChart',
      'PieChart',
      'TreemapChart',
      'WaffleChart',
    ]);
    expect(getComponentsByCategory('flow')).toEqual(['SankeyChart']);
  });

  it('assigns every component to a category, and every category a component', () => {
    const grouped = CHART_CATEGORIES.flatMap(category => getComponentsByCategory(category));
    // 'utility' holds ChartLegend, which is not a chart and not in this catalog.
    expect(grouped.sort()).toEqual(EXPECTED_COMPONENTS);
    expect(getComponentsByCategory('utility')).toEqual([]);
  });

  it('groups by capability', () => {
    expect(getComponentsByCapability('dual-axis')).toEqual(['CompositeChart']);
    expect(getComponentsByCapability('part-to-whole').sort()).toEqual([
      'FunnelChart',
      'PieChart',
      'TreemapChart',
      'WaffleChart',
    ]);
  });

  it('reports every chart as responsive and none as absent from the tag set', () => {
    expect(getComponentsByCapability('responsive')).toHaveLength(16);
  });

  it('groups by complexity', () => {
    const total = CHART_COMPLEXITY_LEVELS.reduce(
      (sum, level) => sum + getComponentsByComplexity(level).length,
      0,
    );
    expect(total).toBe(16);
    expect(getComponentsByComplexity('complex').sort()).toEqual([
      'CandlestickChart',
      'ChordChart',
      'CompositeChart',
      'SankeyChart',
    ]);
  });

  it('finds charts whose row range covers a count, tightest fit first', () => {
    const forSeven = getComponentsForRowCount(7);
    expect(forSeven).toContain('PieChart');
    expect(forSeven).toContain('BarChart');
    // PieChart tops out at 7 and BarChart at 50, so PieChart is the tighter fit.
    expect(forSeven.indexOf('PieChart')).toBeLessThan(forSeven.indexOf('BarChart'));
  });

  it('excludes charts that cannot hold the row count at either end', () => {
    // RadarChart needs 3 spokes; ScatterChart tops out at 1000.
    expect(getComponentsForRowCount(2)).not.toContain('RadarChart');
    expect(getComponentsForRowCount(900)).toEqual(['ScatterChart']);
    expect(getComponentsForRowCount(5000)).toEqual([]);
  });
});
