# WaffleCharts

Beautiful, headless, copy-pasteable charts for React. Built with Visx and Tailwind CSS.
Modeled after the philosophy of [shadcn/ui](https://ui.shadcn.com).

## Philosophy
WaffleCharts is not a library you install. It's a collection of primitives you copy into your project. You own the code, the DOM, and the styling.

## Unreleased
- **Render skipping**: all 16 charts are wrapped in `React.memo`, so a parent re-render no longer re-runs the chart's layout when its props are unchanged. See [Performance](#performance).
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

## Contributing
Interested in developing WaffleCharts? See our [Contributing Guide](CONTRIBUTING.md) for instructions on running the project locally.

## License
MIT © [WaffleCharts](https://github.com/surprisewaffles-io/waffle-charts)
