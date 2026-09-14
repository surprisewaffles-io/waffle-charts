# WaffleCharts

Beautiful, headless, copy-pasteable charts for React. Built with Visx and Tailwind CSS.
Modeled after the philosophy of [shadcn/ui](https://ui.shadcn.com).

## Philosophy
WaffleCharts is not a library you install. It's a collection of primitives you copy into your project. You own the code, the DOM, and the styling.

## Unreleased
- **Component metadata**: every chart now exports a `<Chart>Meta` object describing its category, data requirements, capabilities, and accessibility, importable at runtime. `metadata.ts` collects all 16 with lookups by category, capability, complexity, and row count, and `lib/metadata-helpers.ts` validates data and props against it. See [Component metadata](#component-metadata).
- **Runtime prop validation**: a JSON Schema is now generated from each of the 16 charts' prop types, with an Ajv-backed `validateProps` helper and a development-only wrapper that warns on bad props. See [Runtime validation](#runtime-validation).
- **`TreemapChart.tileMethod`**: the accepted tiling algorithms are now a named `TreemapTileMethod` union instead of `keyof typeof` over an internal map. The accepted values are unchanged.
- **Render skipping**: all 16 charts are wrapped in `React.memo`, so a parent re-render no longer re-runs the chart's layout when its props are unchanged. See [Performance](#performance).
- **Accessibility (WCAG 2.1 Level AA)**: every chart is now reachable by keyboard and readable by a screen reader. See [Accessibility](#accessibility). Applies to `AreaChart`, `BarChart`, `BubbleChart`, `CandlestickChart`, `ChartLegend`, `ChordChart`, `CompositeChart`, `FunnelChart`, `HeatmapChart`, `LineChart`, `PieChart`, `RadarChart`, `RadialBarChart`, `SankeyChart`, `ScatterChart`, `TreemapChart`, and `WaffleChart`.
- **Empty data**: every chart now survives empty, `null`, or `undefined` data, rendering a fallback message instead of breaking. The message is customizable via the `emptyMessage` prop. Covers `AreaChart`, `HeatmapChart`, `BarChart`, `BubbleChart`, `CandlestickChart`, `ChordChart`, `CompositeChart`, `FunnelChart`, `LineChart`, `PieChart`, `RadarChart`, `RadialBarChart`, `SankeyChart`, `ScatterChart`, `TreemapChart`, and `WaffleChart`.
- **Hook ordering**: `CompositeChart` ran its size guard above its hooks, so a shrinking container changed the hook count between renders. Every chart's early returns now sit below all hooks.
- **Scale domains**: charts no longer spread an empty array through `Math.min`/`Math.max`, which yielded `Infinity`/`-Infinity` domains, nor divide by a zero row count.
- **Props are no longer mutated**: `SankeyChart` handed the caller's own arrays to d3-sankey, which rewrites link endpoints in place.
- **CLI symlink escapes**: `waffle-charts add --path` checked the path as a string only, so a symlink inside the project pointing outside it passed and the chart was written out of the project. The path is now resolved on disk before the check, and a symlink sitting at the destination filename is refused instead of written through.
- **CLI dependency install**: the install command was built by joining strings and handing them to a shell. It now spawns the package manager directly with an argument list and no shell, and passes `--ignore-scripts` so a newly downloaded dependency cannot run install hooks.

## New in v0.1.6
- **Funnel Chart**: Added `FunnelChart` for process and conversion visualization.
- **Radial Bar**: Added `RadialBarChart` for circular progress and comparison.
- **Waffle Chart**: Added `WaffleChart` for parts-to-whole visualization.
- **Legends**: Added `ChartLegend` component for consistent legend rendering.

### v0.1.5 Highlights
- **Financial Charts**: Added `CandlestickChart` for OHLC financial data visualization.
- **Vibrant Defaults**: Charts now look great out-of-the-box with a standardized purple/pink palette.
- **Hex Color Support**: Pass explicit hex codes (e.g., `#a855f7`) or Tailwind classes typesafe props.
- **New Components**: introducing `StatCard` for beautiful single-value displays.
- **Enhanced Tooltips**: improved readability with solid backgrounds and z-index handling.
- **Layout Fixes**: Fluid charts now work reliably in all container sizes.

## Installation

### Method 1: CLI (Recommended)
Use our CLI to add components directly to your project. It automatically installs dependencies and copies the source code.

```bash
npx waffle-charts-cli add bar-chart
```

### Method 2: Manual
Install the primitives:
```bash
npm install @visx/shape @visx/group @visx/scale @visx/responsive @visx/tooltip @visx/axis @visx/grid @visx/curve @visx/event @visx/glyph d3-array clsx tailwind-merge lucide-react
```
Then copy the component code from the [documentation](https://surprisewaffles-io.github.io/waffle-charts).

> **Note**: WaffleCharts assumes you have a `cn` class merging utility (standard in shadcn/ui) available at `lib/utils` or similar.

## Performance

Every chart is wrapped in `React.memo`, so a parent re-render does not re-run the
chart's layout unless its props actually changed:

```tsx
function Dashboard() {
  const [tab, setTab] = useState('sales');
  return (
    <>
      <Tabs value={tab} onChange={setTab} />
      {/* Switching tabs re-renders Dashboard, but not this chart. */}
      <BarChart data={stableData} xKey="label" yKey="value" />
    </>
  );
}
```

Props are compared structurally rather than by reference, so the common case of
an inline array literal still skips the render:

```tsx
// A new array every render, but the same numbers — no re-render.
<BarChart data={[{ label: 'A', value: 1 }]} xKey="label" yKey="value" />
```

### Keeping callbacks stable

Function props — `onClick`, `tickFormat` — are compared by reference, not by
structure. Two closures with identical source are not interchangeable, because
each captures its own render's variables; treating them as equal would leave the
chart calling a closure over stale state. A chart given a fresh inline callback
therefore re-renders every time:

```tsx
// Re-renders on every parent render: onClick is a new function each time.
<BarChart data={data} xKey="label" yKey="value" onClick={d => select(d)} />

// Skips the render: the callback identity is stable.
const handleClick = useCallback((d: Row) => select(d), [select]);
<BarChart data={data} xKey="label" yKey="value" onClick={handleClick} />
```

Anything the comparison cannot inspect structurally — a `Date`, a `Map`, a class
instance, or data nested more than 8 levels deep — counts as changed. That costs
a render that might not have been needed, and never shows a stale chart.

## Accessibility

Every chart meets WCAG 2.1 Level AA:

- **Screen readers** — the `<svg>` carries `role="img"`, an `aria-label`, and a `<title>`/`<desc>` pair generated from your data.
- **Keyboard navigation** — Tab reaches the chart; the arrow keys step through its data points; Home and End jump to the ends; Enter and Space activate the focused point; Escape clears the selection. Arrow traversal wraps.
- **Focus indicators** — a 2px `:focus-visible` outline on the chart, and an outline on the focused data point.
- **Text alternatives** — an off-screen data table, one row per data point, reachable through `aria-details`.
- **Live announcements** — a polite live region reads the focused point as you move through it.

```tsx
<BarChart
  data={data}
  xKey="quarter"
  yKey="revenue"
  ariaLabel="Sales by quarter"
  title="2024 Q1-Q4 Sales"
  description="Bar chart showing quarterly sales ranging from $2M to $5M"
/>
```

### Accessibility props

Every chart accepts these. All are optional.

| Prop | Type | Default |
| --- | --- | --- |
| `ariaLabel` | `string` | The generated description |
| `ariaDescribedby` | `string` | The chart's own `<desc>` |
| `title` | `string` | The chart type, e.g. `"Bar chart"` |
| `description` | `string` | `"Bar chart with 6 bars. Range: 100 to 300. Average: 196.7."` |
| `keyboardNavigable` | `boolean` | `true` |

`ChartLegend` is not an SVG chart. It renders a real list with an accessible name, and takes `ariaLabel` or `ariaLabelledby` instead. It carries no `tabIndex`, because putting non-interactive items in the tab order fails WCAG 2.4.3.

### Focus ring colour

The ring reads `--waffle-focus-color`, falling back to `#0066cc`. WCAG 1.4.11 asks for 3:1 against the background behind it, so set it per theme:

```css
:root      { --waffle-focus-color: #0066cc; }  /* 5.6:1 on white */
.dark      { --waffle-focus-color: #64b5ff; }  /* 9.1:1 on near-black */
```

### Testing charts in your own project

Each chart renders its data twice: once as shapes, once as the off-screen table. A bare `getByText('101')` therefore matches both and throws. Tell Testing Library to skip the generated text:

```ts
import { configure } from '@testing-library/react';

configure({
  defaultIgnore:
    'script, style, [data-chart-a11y-table], [data-chart-a11y-table] *, [data-chart-a11y-text]',
});
```

Role queries (`getByRole('table')`, `getByRole('cell')`) still reach the table.

### Verified with

Keyboard traversal, the focus ring, and the generated description were checked in Chromium 153 against `BarChart`, `PieChart`, `LineChart`, `TreemapChart`, and `HeatmapChart`. The ARIA structure follows the [Graphics ARIA](https://www.w3.org/WAI/ARIA/apg/patterns/) guidance for `role="img"`: shapes inside an `img` are hidden from assistive tech, which is why per-point information travels through the live region and the data table rather than through the SVG.

## Security

**Zero vulnerabilities.** All 20 dependency vulnerabilities have been resolved:
- 1 critical → 0
- 14 high → 0
- 4 moderate → 0
- 1 low → 0

**CLI security hardening:**
- Path traversal protection with symlink resolution
- Command injection prevention via direct process spawning
- File overwrite protection (requires confirmation or `--force` flag)
- `--ignore-scripts` flag prevents npm lifecycle hook execution

Run `npm audit` to verify zero vulnerabilities in your installation.

## Testing

**379 passing tests** with 398% increase in coverage:

```bash
# Run all tests
npm test

# Generate coverage report
npm run test:coverage

# Open interactive coverage viewer
npm run test:coverage:ui
```

**Coverage thresholds:**
- Lines: 80%
- Functions: 80%
- Branches: 75%
- Statements: 80%

**Test categories:**
- Unit tests (component rendering and behavior)
- Accessibility tests (WCAG compliance, keyboard navigation, ARIA)
- Empty data tests (resilience testing)
- Performance tests (React.memo behavior)
- Metadata tests (registry integrity)
- Selector tests (recommendation algorithm)

See [Developer Guide](docs/DEVELOPER.md#testing) for detailed testing documentation.

## Documentation

- **[Accessibility Guide](docs/ACCESSIBILITY.md)** — WCAG 2.1 Level AA compliance, keyboard navigation, screen reader support
- **[Developer Guide](docs/DEVELOPER.md)** — Component metadata, chart selector, JSON schemas, testing, performance optimization
- **[Migration Guide](MIGRATION.md)** — Upgrading to v0.2.0 with backwards compatibility notes
- **[Changelog](CHANGELOG.md)** — Complete version history following Keep a Changelog format

## Component metadata

Every chart publishes a machine-readable description of itself next to the
component, so code — and agents writing code — can ask what a chart needs
instead of guessing.

```tsx
import { BarChart, BarChartMeta } from '@/components/waffle/BarChart';

BarChartMeta.category;                      // 'comparison'
BarChartMeta.dataRequirements.minRows;      // 1
BarChartMeta.dataRequirements.requiredProps; // ['data', 'xKey', 'yKey']
```

The metadata is declared `as const`, so those reads keep their literal types:
`category` is `'comparison'`, not `string`.

### Querying the catalog

`metadata.ts` collects all sixteen and adds the lookups:

```tsx
import {
  ComponentMetadata,
  getComponentMeta,
  getComponentsByCategory,
  getComponentsByCapability,
  getComponentsForRowCount,
} from '@/components/waffle/metadata';

getComponentMeta('PieChart').complexity;     // 'simple'
getComponentsByCategory('composition');      // ['FunnelChart', 'PieChart', 'TreemapChart', 'WaffleChart']
getComponentsByCapability('dual-axis');      // ['CompositeChart']
getComponentsForRowCount(400);               // charts whose range covers 400 rows, tightest fit first
```

Importing `metadata.ts` pulls in all sixteen components. Import a single
`<Chart>Meta` from its own module when you only need one.

### Validating data before you render

```tsx
import { validateDataShape, validateProps } from '@/lib/metadata-helpers';

validateDataShape('BarChart', []);
// { valid: false, errors: ['Minimum 1 rows required'], warnings: [] }

validateDataShape('PieChart', twentyRows);
// { valid: true, errors: [], warnings: ['Recommended maximum 7 rows, received 20'] }
```

`errors` mean the chart cannot draw the data. `warnings` mean it will draw but
stop being readable — `maxRecommended` is a legibility ceiling, so exceeding it
leaves `valid` true.

`validateDataShape` takes `unknown` rather than an array because `data` is not
an array for every chart. `TreemapChart` takes one root node, `SankeyChart`
takes `{ nodes, links }`, and `ChordChart` takes a matrix; each entry's
`dataRequirements.kind` says which, and the validator counts rows accordingly.

Field names are only checked for `HeatmapChart`, `SankeyChart`, and
`TreemapChart`, the three components with no accessor props. Every other chart
reads whatever fields its `*Key` props point at, so its `requiredFields` is the
catalog example's naming rather than a contract.

### Metadata and the CLI catalog

The same facts back `npx waffle-charts-cli add`. The CLI reads
`cli/src/registry/`, and `metadataImportPath('bar-chart')` returns
`@/components/waffle/BarChart#BarChartMeta` — where the runtime copy lives. The
two catalogs are compared field by field in
`src/components/waffle/__tests__/metadata.consistency.test.ts`, so they fail the
build rather than drift apart.

## Runtime validation

TypeScript checks chart props when you compile. Props that arrive as data — from an agent, a CMS, or a JSON fixture — reach a chart unchecked, where a wrong type shows up as an empty or broken render rather than an error naming the prop.

A JSON Schema is generated from each chart's prop types to close that gap:

```typescript
import { validateProps } from './schemas';

const validation = validateProps('BarChart', props);
if (!validation.valid) {
  console.error('Invalid props:', validation.errors);
  // ["(root) must have required property 'xKey'", "/data must be array"]
}
```

To validate automatically while developing, wrap the chart. The check runs only in development — `import.meta.env.DEV` is a build constant, so the branch is dropped from production bundles — and each distinct failure is logged once rather than on every re-render:

```typescript
import { createValidatedComponent } from './schemas';
import { BarChart } from './components/waffle/BarChart';

export const ValidatedBarChart = createValidatedComponent(BarChart, 'BarChart');
```

### Reading the schemas

The schemas are committed under `src/schemas/generated/` — one file per chart plus a combined `all-schemas.json` — so a tool can read them without running a build. Every schema uses the same `$ref` + `definitions` shape; `getPropsDefinition` follows the refs for you and returns the object that lists the props:

```typescript
import { getPropsDefinition, chartNames } from './schemas';

getPropsDefinition('BarChart').required;   // ['data', 'xKey']
chartNames;                                 // all 16 chart names
```

Two limits worth knowing. Callback props such as `onClick` and `tickFormat` are absent, because JSON Schema cannot describe a function — passing them is accepted, not flagged. And the generic charts are described at an open row type, so `data` entries are checked for being objects rather than for your specific fields.

### Regenerating

`npm run build` regenerates the schemas first, so they cannot ship behind the types. To run it alone:

```bash
npm run generate:schemas
```

A test compares the committed schemas against freshly generated ones, so changing a prop type without regenerating fails the suite rather than shipping a stale schema.

## Contributing
Interested in developing WaffleCharts? See our [Contributing Guide](CONTRIBUTING.md) for instructions on running the project locally.

## License
MIT © [WaffleCharts](https://github.com/surprisewaffles-io/waffle-charts)
