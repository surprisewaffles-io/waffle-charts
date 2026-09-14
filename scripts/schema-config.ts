/**
 * Why: The generation script and the drift test both need the exact same
 * generator settings. Duplicating them would let the test pass against
 * configuration the build never uses (#8).
 *
 * What: Owns the chart roster, the output location, and the
 * `ts-json-schema-generator` configuration. No side effects on import, so a
 * test can pull the config in without writing files.
 *
 * Test: `committed schemas match the current prop types`
 */
import { createGenerator, type Config, type SchemaGenerator } from 'ts-json-schema-generator';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** Repository root, derived from this file rather than the process cwd. */
export const PROJECT_ROOT = resolve(here, '..');

/** Where the generated schema files are written and read from. */
export const OUTPUT_DIR = resolve(PROJECT_ROOT, 'src/schemas/generated');

/** The sixteen charts that get a schema. */
export const CHART_NAMES = [
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
] as const;

export type ChartName = (typeof CHART_NAMES)[number];

export const SCHEMA_CONFIG: Config = {
  // The instantiation layer, not the components: generic prop types such as
  // `BarChartProps<T>` have no schema until they are given a row type.
  path: resolve(PROJECT_ROOT, 'src/schemas/chart-props.ts'),
  tsconfig: resolve(PROJECT_ROOT, 'tsconfig.app.json'),
  type: '*',
  expose: 'export',
  // Every schema takes the same `$ref` + `definitions` shape. With `topRef`
  // off, the four non-generic charts inline at the root while the twelve
  // generic ones still emit a `$ref`, and a consumer would have to handle both.
  topRef: true,
  jsDoc: 'extended',
  // Callback props (`onClick`, `tickFormat`) have no JSON Schema equivalent.
  // "hide" drops them, so passing one is neither required nor rejected.
  functions: 'hide',
  // Props carry those same callbacks plus pass-through extras. Rejecting
  // unknown keys would report every real call site as invalid.
  additionalProperties: true,
  skipTypeCheck: true,
};

/** Builds a generator over the prop-type instantiation layer. */
export const createSchemaGenerator = (): SchemaGenerator =>
  createGenerator(SCHEMA_CONFIG);

/** Serialised form the schema files are written in, newline-terminated. */
export const serialiseSchema = (schema: unknown): string =>
  `${JSON.stringify(schema, null, 2)}\n`;
