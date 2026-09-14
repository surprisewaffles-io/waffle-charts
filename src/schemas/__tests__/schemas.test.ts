/**
 * Why: The schemas are generated artifacts committed to the repo. Two things
 * can rot independently — the generator can stop covering a chart, and the
 * committed files can fall behind the prop types they came from (#8).
 *
 * What: Covers generation coverage, the committed files' freshness, Ajv
 * compilability, and the validator's accept/reject behaviour.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv from 'ajv';
import {
  CHART_NAMES,
  OUTPUT_DIR,
  createSchemaGenerator,
  serialiseSchema,
} from '../../../scripts/schema-config';
import {
  schemas,
  validateProps,
  getSchema,
  getPropsDefinition,
  chartNames,
  isChartName,
} from '../index';

describe('schema generation', () => {
  it('generates a schema for all 16 charts', () => {
    expect(CHART_NAMES).toHaveLength(16);
    expect(Object.keys(schemas)).toHaveLength(16);
    expect(Object.keys(schemas).sort()).toEqual([...CHART_NAMES].sort());
  });

  it('writes a standalone schema file per chart', () => {
    for (const chart of CHART_NAMES) {
      const file = resolve(OUTPUT_DIR, `${chart}.schema.json`);
      expect(existsSync(file), `${chart}.schema.json missing`).toBe(true);
      expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(schemas[chart]);
    }
  });

  it('describes every chart as an object with a required data prop', () => {
    for (const chart of CHART_NAMES) {
      const definition = getPropsDefinition(chart);
      expect(definition.type, `${chart} should be an object`).toBe('object');
      expect(definition.required, `${chart} should require data`).toContain('data');
      expect(Object.keys(definition.properties ?? {}), `${chart} has no props`).not.toHaveLength(0);
    }
  });

  it('carries the a11y props and JSDoc descriptions onto every chart', () => {
    for (const chart of CHART_NAMES) {
      const properties = getPropsDefinition(chart).properties ?? {};
      expect(properties.ariaLabel?.description, `${chart} lost its JSDoc`).toContain(
        'Accessible name',
      );
    }
  });

  /** Functions have no JSON Schema, so they must not appear as props. */
  it('omits callback props from the schemas', () => {
    const barProps = getPropsDefinition('BarChart').properties ?? {};
    expect(barProps).toHaveProperty('data');
    expect(barProps).not.toHaveProperty('onClick');
    expect(barProps).not.toHaveProperty('tickFormat');
  });

  /**
   * Regenerates in memory and compares against the committed files, so a prop
   * added without re-running `npm run generate:schemas` fails here rather than
   * shipping a schema that omits it.
   */
  it('committed schemas match the current prop types', () => {
    const generator = createSchemaGenerator();
    for (const chart of CHART_NAMES) {
      const fresh = serialiseSchema(generator.createSchema(`${chart}Props`));
      const committed = readFileSync(resolve(OUTPUT_DIR, `${chart}.schema.json`), 'utf8');
      expect(committed, `${chart} schema is stale — run: npm run generate:schemas`).toBe(fresh);
    }
  });

  it('compiles every schema under Ajv strict mode', () => {
    const ajv = new Ajv({ allErrors: true, strict: true });
    for (const chart of CHART_NAMES) {
      expect(() => ajv.compile(getSchema(chart)), `${chart} failed strict compile`).not.toThrow();
    }
  });
});

describe('validateProps', () => {
  it('validates correct props', () => {
    const result = validateProps('BarChart', {
      data: [{ x: 1, y: 2 }],
      xKey: 'x',
      yKey: 'y',
    });
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('catches invalid props', () => {
    const result = validateProps('BarChart', { data: 'not-an-array' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.join(' ')).toContain('/data');
  });

  it('reports a missing required prop', () => {
    const result = validateProps('BarChart', { data: [{ x: 1 }] });
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('xKey');
  });

  it('rejects a wrongly typed enum prop', () => {
    const result = validateProps('BarChart', {
      data: [{ x: 1 }],
      xKey: 'x',
      variant: 'pie',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('/variant');
  });

  /**
   * Callbacks are dropped from the schemas because JSON Schema cannot describe
   * a function. Real call sites pass them, so they must not be flagged.
   */
  it('accepts callback props that the schema cannot describe', () => {
    const result = validateProps('BarChart', {
      data: [{ x: 1 }],
      xKey: 'x',
      onClick: () => {},
      tickFormat: (v: string) => v,
    });
    expect(result.valid).toBe(true);
  });

  it('validates a non-generic chart', () => {
    const good = validateProps('ChordChart', {
      data: [[1, 2], [3, 4]],
      keys: ['a', 'b'],
    });
    expect(good.errors).toEqual([]);
    expect(good.valid).toBe(true);

    // A matrix of strings, where the type says numbers.
    expect(validateProps('ChordChart', { data: [['a']], keys: ['a'] }).valid).toBe(false);
  });

  it('throws for a chart with no schema', () => {
    expect(() => validateProps('NotAChart' as never, {})).toThrow(/No schema for/);
  });
});

describe('public entry point', () => {
  it('exposes every chart through the public entry point', () => {
    expect(chartNames).toHaveLength(16);
    expect(chartNames.every((name) => isChartName(name))).toBe(true);
    expect(isChartName('NotAChart')).toBe(false);
  });
});
