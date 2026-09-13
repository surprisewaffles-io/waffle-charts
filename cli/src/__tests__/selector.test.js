import { describe, it, expect } from 'vitest';
import selector, { recommend, recommendByData, getDecisionTree, getChartCatalog } from '../selector.js';
import { registry } from '../registry.js';

/** Builds n {label, value} points — the 1D categorical shape most charts take. */
function categories(count) {
  return Array.from({ length: count }, (_, i) => ({ label: `Category ${i + 1}`, value: (i + 1) * 10 }));
}

describe('recommend — decision tree cases', () => {
  it('should recommend BarChart when comparing 8 data points', () => {
    const result = recommend({ relationship: 'comparison', dataPoints: 8, interactive: true, dimensions: 1 });

    expect(result.primary).toBe('BarChart');
    expect(result.charts).toEqual(['BarChart', 'RadarChart']);
    expect(result.confidence).toBe(1);
    expect(result.rationale).toBe('Best for comparing 8 categories with interactive features');
  });

  it('should recommend LineChart or AreaChart when the data is a time series', () => {
    const result = recommend({ timeSeries: true, dataPoints: 24, dimensions: 1 });

    expect(result.primary).toBe('LineChart');
    expect(result.charts).toEqual(['LineChart', 'AreaChart']);
    expect(result.rationale).toContain('over time');
  });

  it('should recommend PieChart for part-to-whole with 5 categories', () => {
    const result = recommend({ relationship: 'composition', dataPoints: 5 });

    expect(result.primary).toBe('PieChart');
    expect(result.charts).toEqual(['PieChart', 'WaffleChart', 'FunnelChart']);
  });

  it('should recommend HeatmapChart for a large dataset', () => {
    const result = recommend({ dataPoints: 120 });

    expect(result.primary).toBe('HeatmapChart');
    expect(result.charts).toContain('HeatmapChart');
    expect(result.charts).not.toContain('PieChart');
  });

  it('should recommend HeatmapChart for a large 2D distribution', () => {
    const result = recommend({ relationship: 'distribution', dataPoints: 120, dimensions: '2d' });

    expect(result.primary).toBe('HeatmapChart');
    expect(result.confidence).toBe(1);
  });

  it('should recommend TreemapChart for hierarchical data', () => {
    const result = recommend({ dimensions: 'hierarchical', dataPoints: 60 });

    expect(result.primary).toBe('TreemapChart');
    expect(result.charts).toContain('TreemapChart');
  });

  it('should recommend SankeyChart for flow', () => {
    const result = recommend({ relationship: 'flow' });

    expect(result.primary).toBe('SankeyChart');
    expect(result.charts).toEqual(['SankeyChart', 'ChordChart']);
  });

  it('should recommend CandlestickChart for financial data', () => {
    const result = recommend({ relationship: 'financial', dataPoints: 30 });

    expect(result.primary).toBe('CandlestickChart');
  });

  it.each([
    ['compare', 'comparison'],
    ['part-to-whole', 'composition'],
    ['relationship', 'correlation'],
    ['trend', 'distribution'],
  ])('should accept "%s" as an alias for the %s relationship', (alias, canonical) => {
    expect(recommend({ relationship: alias }).criteria.relationship).toBe(canonical);
  });

  it.each([
    [1, '1d'],
    ['2D', '2d'],
    ['multi-series', 'multiSeries'],
    ['tree', 'hierarchical'],
  ])('should accept %s as the %s dimension', (input, canonical) => {
    expect(recommend({ dimensions: input }).criteria.dimensions).toBe(canonical);
  });

  it('should rank a chart built for the volume above one that merely tolerates it', () => {
    // HeatmapChart is designed for 51+ points; ScatterChart only tolerates them,
    // so it earns partial credit and falls below the selection threshold.
    const result = recommend({ dataPoints: 200, limit: 16 });

    expect(result.candidates[0]).toMatchObject({ chart: 'HeatmapChart', confidence: 1 });
    expect(result.charts).not.toContain('ScatterChart');
  });

  it('should report a tie when several charts score identically', () => {
    const result = recommend({ relationship: 'comparison', dataPoints: 8 });

    expect(result.tie).toBe(true);
    expect(result.candidates.map((c) => c.confidence)).toEqual([1, 1]);
  });

  it('should cap the returned charts at `limit`', () => {
    expect(recommend({ relationship: 'composition', dataPoints: 5, limit: 1 }).charts).toEqual(['PieChart']);
  });

  it('should attach the registry key and label to every candidate', () => {
    const [top] = recommend({ relationship: 'comparison', dataPoints: 8 }).candidates;

    expect(top).toMatchObject({ chart: 'BarChart', registryKey: 'bar-chart', label: 'Bar Chart' });
    expect(top.reasons.length).toBeGreaterThan(0);
  });
});

describe('recommend — edge cases', () => {
  it('should return an explicit no-match when given no criteria', () => {
    const result = recommend({});

    expect(result.matched).toBe(false);
    expect(result.primary).toBeNull();
    expect(result.charts).toEqual([]);
    expect(result.confidence).toBe(0);
    expect(result.rationale).toContain('No criteria given');
  });

  it('should treat a missing argument the same as empty criteria', () => {
    expect(recommend().matched).toBe(false);
  });

  it('should throw on an unknown relationship rather than guess', () => {
    expect(() => recommend({ relationship: 'vibes' })).toThrow(/Unknown relationship "vibes"/);
  });

  it('should throw on an unknown dimension', () => {
    expect(() => recommend({ dimensions: '7d' })).toThrow(/Unknown dimensions/);
  });

  it.each([0, -5, Number.NaN, '12'])('should reject dataPoints %p', (value) => {
    expect(() => recommend({ dataPoints: value })).toThrow(/`dataPoints` must be a positive finite number/);
  });

  it('should reject a non-integer limit', () => {
    expect(() => recommend({ limit: 0 })).toThrow(/`limit` must be a positive integer/);
  });

  it('should reject criteria that are not an object', () => {
    expect(() => recommend('comparison')).toThrow(/`criteria` must be an object/);
  });

  it('should treat interactive:false as no preference, not a penalty', () => {
    const indifferent = recommend({ relationship: 'comparison', dataPoints: 8, interactive: false });

    expect(indifferent.criteria.traits).toEqual([]);
    expect(indifferent.primary).toBe('BarChart');
  });
});

describe('recommendByData', () => {
  it('should recommend BarChart for labelled values compared across categories', () => {
    const result = recommendByData({ data: categories(4), goal: 'compare categories' });

    expect(result.primary).toBe('BarChart');
    expect(result.inferred).toMatchObject({ relationship: 'comparison', dimensions: '1d', dataPoints: 4 });
  });

  it('should infer the relationship from the data when no goal is given', () => {
    const result = recommendByData({ data: categories(6) });

    expect(result.primary).toBe('BarChart');
    expect(result.inferred.relationship).toBe('comparison');
  });

  it('should recommend LineChart for a dated series', () => {
    const data = Array.from({ length: 12 }, (_, i) => ({ date: `2024-${i + 1}`, value: i * 3 }));
    const result = recommendByData({ data, goal: 'show the trend over time' });

    expect(result.primary).toBe('LineChart');
    expect(result.charts).toContain('AreaChart');
    expect(result.inferred.timeSeries).toBe(true);
  });

  it('should recommend TreemapChart for nested children', () => {
    const data = [{ name: 'root', children: categories(4).map((c) => ({ name: c.label, value: c.value })) }];
    const result = recommendByData({ data, goal: 'show the breakdown' });

    expect(result.primary).toBe('TreemapChart');
    expect(result.inferred.dimensions).toBe('hierarchical');
  });

  it('should count every node in a hierarchy, not just the roots', () => {
    const data = [{ name: 'root', children: categories(4).map((c) => ({ name: c.label, value: c.value })) }];

    expect(recommendByData({ data }).inferred.dataPoints).toBe(5);
  });

  it('should recommend SankeyChart for source/target links', () => {
    const data = Array.from({ length: 15 }, (_, i) => ({ source: `s${i}`, target: `t${i}`, value: i + 1 }));
    const result = recommendByData({ data, goal: 'show flow between stages' });

    expect(result.primary).toBe('SankeyChart');
    expect(result.inferred).toMatchObject({ relationship: 'flow', dimensions: 'network', networks: true });
  });

  it('should recommend ScatterChart for x/y pairs', () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ x: i, y: i * 2 }));
    const result = recommendByData({ data, goal: 'find the correlation' });

    expect(result.primary).toBe('ScatterChart');
    expect(result.charts).toContain('BubbleChart');
  });

  it('should recommend CandlestickChart for OHLC rows', () => {
    const data = Array.from({ length: 30 }, (_, i) => ({ date: `d${i}`, open: 1, high: 2, low: 0, close: 1.5 }));
    const result = recommendByData({ data });

    expect(result.primary).toBe('CandlestickChart');
    expect(result.inferred.relationship).toBe('financial');
  });

  it('should let the goal override the shape-inferred relationship', () => {
    const data = Array.from({ length: 200 }, (_, i) => ({ x: i % 20, y: Math.floor(i / 20), value: i }));
    const result = recommendByData({ data, goal: 'show the distribution' });

    expect(result.primary).toBe('HeatmapChart');
    expect(result.inferred.notes).toContainEqual(expect.stringContaining('read as distribution'));
  });

  it('should keep the shape-inferred relationship and say so when the goal matches nothing', () => {
    const result = recommendByData({ data: categories(4), goal: 'make it pop' });

    expect(result.inferred.relationship).toBe('comparison');
    expect(result.inferred.notes).toContainEqual(expect.stringContaining('matched no known phrase'));
  });

  it.each([
    [undefined, /non-empty `data` array/],
    [[], /non-empty `data` array/],
    ['not-an-array', /non-empty `data` array/],
    [[1, 2, 3], /`data` to contain objects/],
  ])('should throw for data %p', (data, message) => {
    expect(() => recommendByData({ data })).toThrow(message);
  });

  it('should reject a non-string goal', () => {
    expect(() => recommendByData({ data: categories(3), goal: 42 })).toThrow(/`goal` must be a string/);
  });
});

describe('getDecisionTree', () => {
  it('should expose all four questions in order', () => {
    const tree = getDecisionTree();
    const volume = tree.options[0].next;
    const dimensions = volume.options[0].next;
    const factors = dimensions.options[0].next;

    expect([tree.criterion, volume.criterion, dimensions.criterion, factors.criterion])
      .toEqual(['relationship', 'dataPoints', 'dimensions', 'factors']);
    expect(factors.options[0].next).toBeUndefined();
  });

  it('should list every relationship branch from the decision tree', () => {
    const values = getDecisionTree().options.map((option) => option.value);

    expect(values).toEqual(['comparison', 'distribution', 'composition', 'flow', 'correlation', 'financial']);
  });

  it('should name charts on every option', () => {
    const tree = getDecisionTree();
    const nodes = [tree, tree.options[0].next, tree.options[0].next.options[0].next];

    for (const node of nodes) {
      for (const option of node.options) {
        expect(option.charts.length).toBeGreaterThan(0);
      }
    }
  });

  it('should agree with recommend() on the comparison branch', () => {
    const comparison = getDecisionTree().options.find((option) => option.value === 'comparison');

    expect(comparison.charts.slice(0, 2)).toEqual(recommend({ relationship: 'comparison', dataPoints: 8 }).charts);
  });

  it('should return a copy the caller cannot use to mutate the tree', () => {
    const first = getDecisionTree();
    first.options.length = 0;

    expect(getDecisionTree().options.length).toBe(6);
  });
});

describe('registry integration', () => {
  it('should map every catalogued chart onto a registry entry', () => {
    for (const chart of getChartCatalog()) {
      expect(registry[chart.registryKey], `${chart.name} -> ${chart.registryKey}`).toBeDefined();
      expect(chart.label).toBe(registry[chart.registryKey].label);
    }
  });

  it('should cover every registry chart except the non-chart legend', () => {
    const catalogued = new Set(getChartCatalog().map((chart) => chart.registryKey));
    const missing = Object.keys(registry).filter((key) => key !== 'chart-legend' && !catalogued.has(key));

    expect(missing).toEqual([]);
  });

  it('should derive interactivity from the registry tooltip dependency', () => {
    for (const chart of getChartCatalog()) {
      expect(chart.interactive).toBe(registry[chart.registryKey].dependencies.includes('@visx/tooltip'));
    }
  });

  it('should expose the same four functions on the default export', () => {
    expect(selector).toEqual({ recommend, recommendByData, getDecisionTree, getChartCatalog });
  });
});
