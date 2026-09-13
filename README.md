# WaffleCharts

Beautiful, headless, copy-pasteable charts for React. Built with Visx and Tailwind CSS.
Modeled after the philosophy of [shadcn/ui](https://ui.shadcn.com).

## Philosophy
WaffleCharts is not a library you install. It's a collection of primitives you copy into your project. You own the code, the DOM, and the styling.

## Unreleased
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

## Contributing
Interested in developing WaffleCharts? See our [Contributing Guide](CONTRIBUTING.md) for instructions on running the project locally.

## License
MIT © [WaffleCharts](https://github.com/surprisewaffles-io/waffle-charts)
