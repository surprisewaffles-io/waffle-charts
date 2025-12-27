# WaffleCharts

Beautiful, headless, copy-pasteable charts for React. Built with Visx and Tailwind CSS.
Modeled after the philosophy of [shadcn/ui](https://ui.shadcn.com).

## Philosophy
WaffleCharts is not a library you install. It's a collection of primitives you copy into your project. You own the code, the DOM, and the styling.

## New in v0.1.0
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
Then copy the component code from the [documentation](https://mbuchthal.github.io/waffle-charts).

## Contributing
Interested in developing WaffleCharts? See our [Contributing Guide](CONTRIBUTING.md) for instructions on running the project locally.

## License
MIT © [WaffleCharts](https://github.com/mbuchthal/waffle-charts)
