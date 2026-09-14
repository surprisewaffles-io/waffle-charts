/**
 * Why: an agent choosing a chart at runtime needs the same facts the CLI
 * catalog already publishes — what the chart is for, how many rows it wants,
 * which props are mandatory. Until now those facts existed only in
 * `cli/src/registry/*.js`, which is plain JS in a separately-published package
 * and cannot be imported by an application consuming this library (#10).
 *
 * What: the vocabulary and shape every `<Chart>Meta` export conforms to. The
 * category, capability, and complexity tag sets are deliberately the same ones
 * `cli/src/registry/index.js` defines, so the two catalogs describe components
 * in one language rather than two. `metadata.consistency.test.ts` fails if they
 * drift apart.
 *
 * This module holds no components and imports none. Keeping it separate is what
 * lets each chart file declare its own metadata without `metadata.ts` importing
 * a component that imports back — the same split `chart-a11y.ts` makes for the
 * a11y hook.
 *
 * Test: `src/components/waffle/__tests__/metadata.test.ts`
 */

/** Allowed `category` values. Mirrors `CATEGORIES` in the CLI registry. */
export const CHART_CATEGORIES = [
  'comparison',
  'distribution',
  'composition',
  'relationship',
  'flow',
  'financial',
  'utility',
] as const;

export type ChartCategory = (typeof CHART_CATEGORIES)[number];

/** Allowed `complexity` values, ordered from least to most configuration. */
export const CHART_COMPLEXITY_LEVELS = ['simple', 'moderate', 'complex'] as const;

export type ChartComplexity = (typeof CHART_COMPLEXITY_LEVELS)[number];

/** Allowed `capabilities` tags. Mirrors `CAPABILITIES` in the CLI registry. */
export const CHART_CAPABILITIES = [
  'responsive',
  'tooltip',
  'axes',
  'grid',
  'empty-state',
  'custom-colors',
  'categorical',
  'temporal',
  'numeric',
  'hierarchical',
  'matrix',
  'multi-series',
  'dual-axis',
  'part-to-whole',
] as const;

export type ChartCapability = (typeof CHART_CAPABILITIES)[number];

/**
 * Why: `data` is not one shape across this library. Four components take
 * something other than an array of row objects, and a validator that assumed
 * rows would either crash on them or report a nonsense row count. Naming the
 * shape is what lets one validator serve all sixteen.
 *
 * - `rows` — an array of row objects; the row count is `data.length`.
 * - `matrix` — a square `number[][]`; the count is the matrix side.
 * - `tree` — a single root node with `children`; the count is every node.
 * - `graph` — `{ nodes, links }`; the count is `nodes.length`.
 */
export const CHART_DATA_KINDS = ['rows', 'matrix', 'tree', 'graph'] as const;

export type ChartDataKind = (typeof CHART_DATA_KINDS)[number];

export type ChartDataRequirements = {
  /** Below this the chart cannot draw anything meaningful. */
  readonly minRows: number;
  /** A legibility ceiling, not a hard limit. */
  readonly maxRecommended: number;
  /** How `data` is structured; decides how a row count is taken. */
  readonly kind: ChartDataKind;
  /** TypeScript-shaped summary of the `data` prop. */
  readonly shape: string;
  /**
   * Field names a row must carry.
   *
   * Meaningful only when `fixedFieldNames` is true. Most charts read whatever
   * fields their `*Key` props point at, so for those this lists the field names
   * used by the CLI catalog's example rather than a contract — validating
   * against it would reject perfectly good data.
   */
  readonly requiredFields: readonly string[];
  /**
   * Whether `requiredFields` is a contract. True only for components with no
   * accessor props, where the field names really are fixed.
   */
  readonly fixedFieldNames: boolean;
  /** Props that must be passed, `data` included. */
  readonly requiredProps: readonly string[];
  /** Props that may be passed. */
  readonly optionalProps: readonly string[];
  /** Validation and rendering caveats worth knowing before the first render. */
  readonly notes: string;
};

export type ChartAccessibility = {
  readonly wcagLevel: 'A' | 'AA' | 'AAA';
  /** Chart is reachable with Tab and traversable with the arrow keys. */
  readonly keyboardNavigable: boolean;
  /** Chart carries an accessible name, a `<desc>`, and a tabular alternative. */
  readonly screenReaderSupported: boolean;
};

export type ChartPerformance = {
  /**
   * Wrapped in `memoChart`, so a parent re-render with structurally unchanged
   * props skips the visx layout. See `./memo`.
   *
   * The row-count ceiling is `dataRequirements.maxRecommended` and is not
   * repeated here — one number, one place.
   */
  readonly memoized: boolean;
};

/**
 * Why: all sixteen charts call `useChartA11y`, so all sixteen make the same
 * three accessibility claims. Sixteen hand-written copies of one fact drift the
 * moment one chart changes; a shared constant cannot.
 *
 * What: the accessibility baseline every chart in this library meets. A chart
 * that ever falls short states its own object instead of spreading this one.
 *
 * Test: `every chart claiming keyboard navigation wires useChartA11y` in
 * `__tests__/metadata.consistency.test.ts`
 */
export const CHART_A11Y_BASELINE = {
  wcagLevel: 'AA',
  keyboardNavigable: true,
  screenReaderSupported: true,
} as const satisfies ChartAccessibility;

/**
 * Every chart root is wrapped in `memoChart`. Same reasoning as
 * {@link CHART_A11Y_BASELINE}: one fact, one place.
 *
 * Test: `every chart claiming memoization wraps its root in memoChart` in
 * `__tests__/metadata.consistency.test.ts`
 */
export const MEMOIZED_PERFORMANCE = {
  memoized: true,
} as const satisfies ChartPerformance;

/**
 * The contract every `<Chart>Meta` export satisfies. Declare metadata with
 * `as const satisfies ChartMetadata` so the literal types survive for callers
 * while a mistyped category or capability still fails to compile.
 */
export type ChartMetadata = {
  /** Exported React component name, e.g. `BarChart`. */
  readonly name: string;
  readonly category: ChartCategory;
  /** What the chart draws and what it is for. */
  readonly description: string;
  readonly dataRequirements: ChartDataRequirements;
  readonly capabilities: readonly ChartCapability[];
  readonly complexity: ChartComplexity;
  readonly accessibility: ChartAccessibility;
  readonly performance: ChartPerformance;
};
