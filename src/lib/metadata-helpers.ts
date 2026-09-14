/**
 * Why: the catalog in `components/waffle/metadata.ts` states what each chart
 * needs, but an agent assembling a call still has to compare its data against
 * those numbers by hand — and gets it wrong in the same two ways every time:
 * passing too few rows to draw anything, or passing an array to one of the four
 * components that does not take one. These helpers answer both from the
 * metadata rather than from a second copy of the rules (#10).
 *
 * What: `validateDataShape` checks a `data` value against a component's
 * `dataRequirements`; `validateProps` checks a prop bag against its
 * `requiredProps`. Both return every problem found rather than throwing on the
 * first, so a caller can report them together.
 *
 * Test: `src/lib/__tests__/metadata-helpers.test.ts`
 */
import {
  ComponentMetadata,
  type ComponentName,
} from '../components/waffle/metadata';

/**
 * Outcome of a validation call.
 *
 * `errors` are hard failures: the chart cannot draw this data. `warnings` are
 * legibility advice — `maxRecommended` is a ceiling past which a chart stops
 * being readable, not a limit past which it stops working, so exceeding it
 * leaves `valid` true. Collapsing the two would report a renderable 80-bar
 * chart as invalid.
 */
export type ValidationResult = {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
};

/** Depth ceiling for the tree walk, and what terminates a malformed cycle. */
const MAX_TREE_DEPTH = 32;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Counts every node in a treemap root, parents included.
 *
 * `seen` stops a hand-built object that points back at an ancestor from
 * recursing forever; such a value is malformed either way, and stopping counts
 * what was reachable rather than hanging.
 */
const countTreeNodes = (node: unknown, seen: Set<object>, depth = 0): number => {
  if (!isRecord(node) || depth >= MAX_TREE_DEPTH || seen.has(node)) return 0;
  seen.add(node);

  const children = node.children;
  if (!Array.isArray(children)) return 1;
  return children.reduce<number>(
    (total, child) => total + countTreeNodes(child, seen, depth + 1),
    1,
  );
};

/** Every node in a treemap root, so field checks cover the whole hierarchy. */
const collectTreeNodes = (
  node: unknown,
  seen: Set<object>,
  depth = 0,
): Record<string, unknown>[] => {
  if (!isRecord(node) || depth >= MAX_TREE_DEPTH || seen.has(node)) return [];
  seen.add(node);

  const children = node.children;
  if (!Array.isArray(children)) return [node];
  return children.reduce<Record<string, unknown>[]>(
    (nodes, child) => nodes.concat(collectTreeNodes(child, seen, depth + 1)),
    [node],
  );
};

/**
 * Reads the row count out of a `data` value, interpreting it by the component's
 * declared `kind`.
 *
 * Returns `null` when the value is not the container the component takes at
 * all — an array passed to `SankeyChart`, say. That is a distinct outcome from
 * a count of zero, which is a well-formed but empty container.
 */
const countRows = (kind: string, data: unknown): number | null => {
  switch (kind) {
    case 'rows':
    case 'matrix':
      // For a matrix the outer length is the side, which is what minRows means.
      return Array.isArray(data) ? data.length : null;
    case 'tree':
      return isRecord(data) ? countTreeNodes(data, new Set()) : null;
    case 'graph':
      if (!isRecord(data) || !Array.isArray(data.nodes)) return null;
      return data.nodes.length;
    default:
      return null;
  }
};

/** What the component expects `data` to be, phrased for an error message. */
const containerDescription = (kind: string): string => {
  switch (kind) {
    case 'rows':
      return 'an array of row objects';
    case 'matrix':
      return 'a square number[][] matrix';
    case 'tree':
      return 'a single root node object with optional `children`';
    case 'graph':
      return 'an object with `nodes` and `links` arrays';
    default:
      return 'a supported data container';
  }
};

/**
 * Returns the records whose fields should be checked, or an empty array when
 * the component's field names are not a contract.
 */
const fieldBearingRecords = (
  kind: string,
  data: unknown,
): Record<string, unknown>[] => {
  if (kind === 'tree') return collectTreeNodes(data, new Set());
  if (kind === 'graph') return isRecord(data) ? [data] : [];
  return Array.isArray(data) ? data.filter(isRecord) : [];
};

/**
 * Checks a `data` value against what a component declares it needs.
 *
 * Accepts `unknown` rather than `unknown[]` on purpose: `TreemapChart` takes a
 * single root node, `SankeyChart` takes `{ nodes, links }`, and `ChordChart`
 * takes a matrix. Typing the parameter as an array would have made three of the
 * sixteen uncallable without a cast.
 *
 * Field names are only checked for the components that have no accessor props
 * (`fixedFieldNames`). Every other chart reads whatever fields its `*Key` props
 * point at, so checking against the catalog's field names would reject valid
 * data whose columns happen to be named something else.
 *
 * @param componentName - a key of `ComponentMetadata`
 * @param data - the value destined for the component's `data` prop
 */
export const validateDataShape = (
  componentName: ComponentName,
  data: unknown,
): ValidationResult => {
  const { dataRequirements: req } = ComponentMetadata[componentName];
  const errors: string[] = [];
  const warnings: string[] = [];

  const rowCount = countRows(req.kind, data);

  if (rowCount === null) {
    errors.push(
      `${componentName} expects ${containerDescription(req.kind)}, received ${describeValue(data)}`,
    );
    return { valid: false, errors, warnings };
  }

  if (rowCount < req.minRows) {
    // Wording matches the issue's stated contract: "Minimum 1 rows required".
    errors.push(`Minimum ${req.minRows} rows required`);
  }

  if (rowCount > req.maxRecommended) {
    warnings.push(
      `Recommended maximum ${req.maxRecommended} rows, received ${rowCount}`,
    );
  }

  if (req.fixedFieldNames && req.requiredFields.length > 0) {
    const records = fieldBearingRecords(req.kind, data);
    const missing = req.requiredFields.filter(field =>
      records.some(record => !(field in record)),
    );
    for (const field of missing) {
      errors.push(`Missing required field \`${field}\``);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
};

/**
 * Checks that every prop a component requires is present and not `undefined`.
 *
 * `data` is listed among `requiredProps`, so a prop bag missing it is reported
 * here rather than silently passing.
 *
 * Only missing props are reported. A prop absent from both `requiredProps` and
 * `optionalProps` is not flagged, because `optionalProps` is a curated subset
 * of each component's prop surface rather than the whole of it — every chart
 * also accepts the shared `ChartA11yProps`, and most accept axis, margin, and
 * handler props the catalog does not list.
 *
 * @param componentName - a key of `ComponentMetadata`
 * @param props - the props destined for the component
 */
export const validateProps = (
  componentName: ComponentName,
  props: Record<string, unknown>,
): ValidationResult => {
  const { dataRequirements: req } = ComponentMetadata[componentName];
  const errors = req.requiredProps
    .filter(prop => props[prop] === undefined)
    .map(prop => `Missing required prop \`${prop}\``);

  return { valid: errors.length === 0, errors, warnings: [] };
};

/** A short, safe rendering of an unexpected value, for error text. */
function describeValue(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `an array of ${value.length}`;
  return `a ${typeof value}`;
}
