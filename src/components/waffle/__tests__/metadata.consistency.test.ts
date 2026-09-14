/**
 * Why: the same sixteen components are now described twice — by the CLI catalog
 * in `cli/src/registry/*.js`, which the `add` command reads, and by the
 * `<Chart>Meta` exports, which application code reads. Two descriptions of one
 * component drift the first time someone edits only the nearer one, and a
 * reader has no way to tell which copy is stale. This file makes drift a test
 * failure instead (#10).
 *
 * It also checks the two claims the metadata makes about the components' own
 * code — that each is memoised and each wires the a11y hook — against the
 * source, so a chart cannot advertise a property it stopped having.
 *
 * What: field-by-field comparison of both catalogs, plus source assertions.
 *
 * Test: this file.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ComponentMetadata, COMPONENT_NAMES } from '../metadata';

type RegistryEntry = {
  name: string;
  category: string;
  complexity: string;
  capabilities: string[];
  description: string;
  dataRequirements: {
    minRows: number;
    maxRecommended: number;
    requiredProps: string[];
    optionalProps: string[];
    requiredFields: string[];
    notes: string;
  };
};

/**
 * The CLI registry is plain ESM JavaScript outside `src`, so it is imported
 * through a runtime-built specifier. A literal path would put an untyped `.js`
 * module into `tsc -b`'s program, which `tsconfig.app.json` scopes to `src`.
 *
 * Paths resolve from `process.cwd()` rather than `import.meta.url`: under
 * jsdom that URL is the Vite dev server's `http://` origin, which neither the
 * ESM loader nor `readFileSync` accepts. Same reasoning as the CSS read in
 * `src/lib/__tests__/focus-contrast.test.ts`.
 */
const loadRegistry = async (): Promise<Record<string, RegistryEntry>> => {
  const specifier = pathToFileURL(resolve(process.cwd(), 'cli/src/registry/index.js')).href;
  const mod = (await import(/* @vite-ignore */ specifier)) as {
    registry: Record<string, RegistryEntry>;
  };
  return mod.registry;
};

/** Maps a component name back to its CLI slug via the registry's own `name`. */
const entryFor = (
  registry: Record<string, RegistryEntry>,
  componentName: string,
): RegistryEntry => {
  const found = Object.values(registry).find(entry => entry.name === componentName);
  if (!found) throw new Error(`no CLI registry entry named ${componentName}`);
  return found;
};

const sourceOf = (componentName: string): string =>
  readFileSync(
    resolve(process.cwd(), `src/components/waffle/${componentName}.tsx`),
    'utf8',
  );

describe('metadata matches the CLI registry', () => {
  it('describes every chart the registry lists, and no others', async () => {
    const registry = await loadRegistry();
    const registryCharts = Object.values(registry)
      .filter(entry => entry.category !== 'utility')
      .map(entry => entry.name)
      .sort();

    expect([...COMPONENT_NAMES].sort()).toEqual(registryCharts);
  });

  it.each(
    // Built eagerly from the TS catalog; the registry is resolved inside each case.
    COMPONENT_NAMES.map(name => [name] as const),
  )('%s agrees with its registry entry', async componentName => {
    const registry = await loadRegistry();
    const entry = entryFor(registry, componentName);
    const meta = ComponentMetadata[componentName];
    const req = meta.dataRequirements;

    expect(meta.category).toBe(entry.category);
    expect(meta.complexity).toBe(entry.complexity);
    expect(meta.description).toBe(entry.description);
    expect([...meta.capabilities]).toEqual(entry.capabilities);
    expect(req.minRows).toBe(entry.dataRequirements.minRows);
    expect(req.maxRecommended).toBe(entry.dataRequirements.maxRecommended);
    expect([...req.requiredProps]).toEqual(entry.dataRequirements.requiredProps);
    expect([...req.optionalProps]).toEqual(entry.dataRequirements.optionalProps);
    expect(req.notes).toBe(entry.dataRequirements.notes);
  });

  it.each(
    COMPONENT_NAMES.filter(
      name => !ComponentMetadata[name].dataRequirements.fixedFieldNames,
    ).map(name => [name] as const),
  )('%s lists the same example fields as the registry', async componentName => {
    const registry = await loadRegistry();
    const entry = entryFor(registry, componentName);
    const meta = ComponentMetadata[componentName];

    expect([...meta.dataRequirements.requiredFields]).toEqual(
      entry.dataRequirements.requiredFields,
    );
  });

  /*
   * The fixed-field components are exempt from the comparison above because the
   * two catalogs mean different things by `requiredFields` there. The registry
   * lists the fields its example happens to use; the TS catalog states the
   * contract a validator can enforce. TreemapChart is where they part company:
   * every node carries `name`, but only leaves carry `size` and only parents
   * carry `children`, so validating against all three would reject a valid tree.
   */
  it('states an enforceable field contract for the fixed-field components', () => {
    expect(ComponentMetadata.HeatmapChart.dataRequirements.requiredFields).toEqual([
      'bin',
      'bins',
    ]);
    expect(ComponentMetadata.SankeyChart.dataRequirements.requiredFields).toEqual([
      'nodes',
      'links',
    ]);
    expect(ComponentMetadata.TreemapChart.dataRequirements.requiredFields).toEqual(['name']);
  });
});

describe('metadata matches the component source', () => {
  it.each(COMPONENT_NAMES.map(name => [name] as const))(
    '%s claiming memoisation wraps its root in memoChart',
    componentName => {
      expect(ComponentMetadata[componentName].performance.memoized).toBe(true);
      expect(sourceOf(componentName)).toContain(`memoChart(${componentName}Root)`);
    },
  );

  it.each(COMPONENT_NAMES.map(name => [name] as const))(
    '%s claiming keyboard navigation wires useChartA11y',
    componentName => {
      expect(ComponentMetadata[componentName].accessibility.keyboardNavigable).toBe(true);
      expect(sourceOf(componentName)).toContain('useChartA11y(');
    },
  );
});
