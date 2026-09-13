/**
 * Why: the CLI needs a filename and a dependency list to copy a chart in, but an
 * agent choosing a chart needs more — what the chart is for, what the data must
 * look like, and what a working call looks like. Both readers are served from
 * this one catalog so they cannot drift apart.
 *
 * What: composes the per-category catalogs into the flat `registry` object keyed
 * by CLI slug (`bar-chart`, `line-chart`, …) that `src/commands/add.js` consumes.
 * The split is by `category`; the key set and the `file`/`label`/`dependencies`
 * fields are unchanged from the pre-catalog registry.
 *
 * Test: `cli/src/registry/__tests__/registry.test.js`
 *
 * ## Entry schema
 *
 * | Field | Type | Meaning |
 * | --- | --- | --- |
 * | `name` | string | Exported React component name, e.g. `BarChart`. |
 * | `label` | string | Human-readable name, shown in the `add` prompt. |
 * | `file` | string | Template filename under `cli/templates/`. |
 * | `description` | string | What the chart draws and what it is for. |
 * | `category` | string | One of `CATEGORIES`. |
 * | `complexity` | string | One of `COMPLEXITY_LEVELS` — how much configuration a first render needs. |
 * | `capabilities` | string[] | Feature tags drawn from `CAPABILITIES`. |
 * | `sizing` | object | How the component claims space; see below. |
 * | `dataShape` | string | TypeScript-shaped summary of the `data` prop. |
 * | `dataRequirements` | object | Row counts, props, fields, and caveats; see below. |
 * | `useCases` | string[] | Concrete situations this chart suits. |
 * | `example` | object | `{ scenario, data, code }` — a runnable call with sample data. |
 * | `dependencies` | string[] | npm packages `add` installs for this component. |
 *
 * ### `sizing`
 *
 * Every chart wraps its content in `ParentSize`, which means a `width` or
 * `height` prop passed by a caller is overridden and has no effect. Space is
 * claimed one of three ways:
 *
 * - `{ mode: "self", height }` — the component renders its own fixed-height box.
 *   Drop it in anywhere.
 * - `{ mode: "parent", minHeight? }` — the component fills its parent. Wrap it in
 *   an element that has a height, or it collapses.
 * - `{ mode: "inline" }` — not a chart; flows with surrounding content.
 *
 * ### `dataRequirements`
 *
 * - `minRows` — below this the chart cannot draw anything meaningful.
 * - `maxRecommended` — a legibility ceiling, not a hard limit.
 * - `requiredProps` / `optionalProps` — props by name, `data` included.
 * - `requiredFields` / `optionalFields` — the fields used by `example.data`.
 *   Most charts read whatever fields the `*Key` props point at, so these are the
 *   example's field names rather than a fixed contract. Where a component has no
 *   accessor props and the field names ARE fixed, `notes` says so.
 * - `notes` — validation and rendering caveats worth knowing before the first
 *   render.
 */
import { comparison } from './comparison.js';
import { distribution } from './distribution.js';
import { composition } from './composition.js';
import { relationship } from './relationship.js';
import { flow } from './flow.js';
import { financial } from './financial.js';
import { utility } from './utility.js';

/** Allowed `category` values, each backed by one module in this directory. */
export const CATEGORIES = [
  'comparison',
  'distribution',
  'composition',
  'relationship',
  'flow',
  'financial',
  'utility',
];

/** Allowed `complexity` values, ordered from least to most configuration. */
export const COMPLEXITY_LEVELS = ['simple', 'moderate', 'complex'];

/** Allowed `capabilities` tags. */
export const CAPABILITIES = [
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
];

export const registry = {
  ...comparison,
  ...distribution,
  ...composition,
  ...relationship,
  ...flow,
  ...financial,
  ...utility,
};

/**
 * Why: the catalog advertises each entry's React component name (`BarChart`),
 * so a reader who found a chart there reaches for that spelling on the command
 * line. Only the slug (`bar-chart`) used to resolve, and the mismatch surfaced
 * as "not found" on a component the registry plainly contains.
 * What: resolves a slug, a component name, or a label to its slug, ignoring
 * case and any separators. Returns null when nothing matches.
 * Test: `resolveComponent` cases in `cli/src/registry/__tests__/registry.test.js`
 *
 * @param {string} query - user-supplied component identifier
 * @returns {string | null} the registry slug, or null if unmatched
 */
export function resolveComponent(query) {
  if (typeof query !== 'string') return null;

  const normalise = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = normalise(query);
  if (!target) return null;

  if (Object.prototype.hasOwnProperty.call(registry, query)) return query;

  const match = Object.entries(registry).find(
    ([slug, entry]) =>
      normalise(slug) === target ||
      normalise(entry.name) === target ||
      normalise(entry.label) === target,
  );

  return match ? match[0] : null;
}
