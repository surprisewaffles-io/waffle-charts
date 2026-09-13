# WaffleCharts

Beautiful, headless, copy-pasteable charts for React. Built with Visx and Tailwind CSS.
Modeled after the philosophy of [shadcn/ui](https://ui.shadcn.com).

## Philosophy
WaffleCharts is not a library you install. It's a collection of primitives you copy into your project. You own the code, the DOM, and the styling.

## Unreleased
- **Empty data**: every chart now survives empty, `null`, or `undefined` data, rendering a fallback message instead of breaking. The message is customizable via the `emptyMessage` prop. Covers `AreaChart`, `HeatmapChart`, `BarChart`, `BubbleChart`, `CandlestickChart`, `ChordChart`, `CompositeChart`, `FunnelChart`, `LineChart`, `PieChart`, `RadarChart`, `RadialBarChart`, `SankeyChart`, `ScatterChart`, `TreemapChart`, and `WaffleChart`.
- **Hook ordering**: `CompositeChart` ran its size guard above its hooks, so a shrinking container changed the hook count between renders. Every chart's early returns now sit below all hooks.
- **Scale domains**: charts no longer spread an empty array through `Math.min`/`Math.max`, which yielded `Infinity`/`-Infinity` domains, nor divide by a zero row count.
- **Props are no longer mutated**: `SankeyChart` handed the caller's own arrays to d3-sankey, which rewrites link endpoints in place.

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

## Contributing
Interested in developing WaffleCharts? See our [Contributing Guide](CONTRIBUTING.md) for instructions on running the project locally.

## License
MIT © [WaffleCharts](https://github.com/surprisewaffles-io/waffle-charts)
