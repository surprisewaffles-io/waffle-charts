/**
 * Why: the helpers are what an agent calls before rendering, so a false pass
 * ships broken data to a chart and a false failure blocks data that would have
 * drawn. Both directions need covering, and the four data kinds need covering
 * separately because each counts rows differently.
 *
 * What: row-count bounds, container-type rejection, fixed-field checking, and
 * required-prop checking.
 *
 * Test: this file.
 */
import { describe, expect, it } from 'vitest';
import { validateDataShape, validateProps } from '../metadata-helpers';
import { COMPONENT_NAMES, ComponentMetadata } from '../../components/waffle/metadata';

/** A well-formed row array of the requested length. */
const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ label: `r${i}`, value: i }));

describe('validateDataShape — row counts', () => {
  it('validates data shape correctly', () => {
    const result = validateDataShape('BarChart', []);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Minimum 1 rows required');
  });

  it('accepts a row count inside the declared range', () => {
    const result = validateDataShape('BarChart', rows(10));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('reports a shortfall against each chart\'s own minimum', () => {
    // RadarChart needs three spokes to enclose an area; BarChart needs one row.
    expect(validateDataShape('RadarChart', rows(2)).errors).toContain('Minimum 3 rows required');
    expect(validateDataShape('BarChart', rows(1)).valid).toBe(true);
  });

  it('warns past the legibility ceiling without invalidating the data', () => {
    const result = validateDataShape('PieChart', rows(20));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual(['Recommended maximum 7 rows, received 20']);
  });

  it('reports a shortfall and no ceiling warning at the same time', () => {
    const result = validateDataShape('LineChart', rows(1));
    expect(result.errors).toEqual(['Minimum 2 rows required']);
    expect(result.warnings).toEqual([]);
  });
});

describe('validateDataShape — container kinds', () => {
  it('counts a matrix by its side', () => {
    const matrix = [
      [0, 1, 2],
      [1, 0, 3],
      [2, 3, 0],
    ];
    expect(validateDataShape('ChordChart', matrix).valid).toBe(true);
    expect(validateDataShape('ChordChart', [[0]]).errors).toContain('Minimum 2 rows required');
  });

  it('counts a treemap by its total node count, parents included', () => {
    const tree = {
      name: 'root',
      children: [{ name: 'a', size: 1 }, { name: 'b', size: 2 }],
    };
    // 1 root + 2 leaves clears the minimum of 1.
    expect(validateDataShape('TreemapChart', tree).valid).toBe(true);
  });

  it('counts a sankey graph by its node count', () => {
    const graph = {
      nodes: [{ name: 'a' }, { name: 'b' }],
      links: [{ source: 0, target: 1, value: 5 }],
    };
    expect(validateDataShape('SankeyChart', graph).valid).toBe(true);
    expect(validateDataShape('SankeyChart', { nodes: [{ name: 'a' }], links: [] }).errors).toContain(
      'Minimum 2 rows required',
    );
  });

  it('rejects the wrong container rather than miscounting it', () => {
    // The bug this guards: an array passed to a graph-shaped component.
    const arrayToGraph = validateDataShape('SankeyChart', rows(5));
    expect(arrayToGraph.valid).toBe(false);
    expect(arrayToGraph.errors[0]).toBe(
      'SankeyChart expects an object with `nodes` and `links` arrays, received an array of 5',
    );

    const objectToRows = validateDataShape('BarChart', { label: 'a', value: 1 });
    expect(objectToRows.valid).toBe(false);
    expect(objectToRows.errors[0]).toBe(
      'BarChart expects an array of row objects, received a object',
    );

    expect(validateDataShape('TreemapChart', null).errors[0]).toBe(
      'TreemapChart expects a single root node object with optional `children`, received null',
    );
  });

  it('stops on a tree that points back at itself instead of recursing forever', () => {
    const root: { name: string; children: unknown[] } = { name: 'root', children: [] };
    root.children.push(root);
    expect(validateDataShape('TreemapChart', root).valid).toBe(true);
  });
});

describe('validateDataShape — field contracts', () => {
  it('checks field names where the component has no accessor props', () => {
    const missingBins = [{ bin: 0 }];
    const result = validateDataShape('HeatmapChart', missingBins);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field `bins`');
  });

  it('accepts fixed-field data that carries every field', () => {
    const heatmap = [{ bin: 0, bins: [{ bin: 0, count: 3 }] }];
    expect(validateDataShape('HeatmapChart', heatmap).valid).toBe(true);
  });

  it('checks every node of a tree, not only the root', () => {
    const tree = { name: 'root', children: [{ size: 4 }] };
    expect(validateDataShape('TreemapChart', tree).errors).toContain(
      'Missing required field `name`',
    );
  });

  it('leaves accessor-driven charts free to name their columns anything', () => {
    // BarChart's catalog fields are `label`/`value`, but xKey/yKey may point
    // anywhere — flagging these would be a false failure.
    const result = validateDataShape('BarChart', [{ region: 'EU', revenue: 42 }]);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe('validateProps', () => {
  it('reports each missing required prop', () => {
    const result = validateProps('BarChart', { data: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      'Missing required prop `xKey`',
      'Missing required prop `yKey`',
    ]);
  });

  it('passes a complete prop bag', () => {
    const result = validateProps('BarChart', { data: [], xKey: 'label', yKey: 'value' });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('does not flag props the catalog omits', () => {
    const result = validateProps('BarChart', {
      data: [],
      xKey: 'label',
      yKey: 'value',
      ariaLabel: 'Revenue by region',
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    expect(result.valid).toBe(true);
  });
});

describe('every catalogued component is validatable', () => {
  it.each(COMPONENT_NAMES.map(name => [name] as const))(
    '%s rejects a container it does not take',
    componentName => {
      // A string is the wrong container for all four kinds, so every component
      // must report it rather than throw or silently pass.
      const result = validateDataShape(componentName, 'not data');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain(`${componentName} expects`);
    },
  );

  it.each(COMPONENT_NAMES.map(name => [name] as const))(
    '%s reports its own required props as missing for an empty bag',
    componentName => {
      const result = validateProps(componentName, {});
      expect(result.errors).toHaveLength(
        ComponentMetadata[componentName].dataRequirements.requiredProps.length,
      );
    },
  );
});
