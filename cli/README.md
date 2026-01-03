# WaffleCharts CLI 🧇

The official CLI for [WaffleCharts](https://surprisewaffles-io.github.io/waffle-charts).

> **Beautiful, Headless, Copy-Pasteable Charts for React.**  
> Built with [Visx](https://airbnb.io/visx) and [Tailwind CSS](https://tailwindcss.com).

[![NPM Version](https://img.shields.io/npm/v/waffle-charts-cli)](https://www.npmjs.com/package/waffle-charts-cli)
[![License](https://img.shields.io/npm/l/waffle-charts-cli)](https://github.com/surprisewaffles-io/waffle-charts/blob/main/LICENSE)

## Why WaffleCharts?

WaffleCharts is not a component library you install and get stuck with. It's a collection of **templates**.
The CLI copies the full source code of the chart directly into your project. You own the code. You can customize the axis, the colors, the tooltip logic—everything.

## Usage

Run the `add` command to interactively select charts:

```bash
npx waffle-charts-cli add
```

Or add specific charts directly:

```bash
npx waffle-charts-cli add bar-chart line-chart
```

## Available Charts

- React 16+
- Tailwind CSS configured in your project.

## Prerequisites

The components assume you have a `cn` utility for class merging (standard in shadcn/ui projects).

**`lib/utils.ts`**
```ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

If your utils are located elsewhere, you may need to update the imports in the added components.

## Available Charts

| Chart | Command | Description |
| :--- | :--- | :--- |
| **Bar Chart** | `bar-chart` | Standard vertical bar chart for categorical data. |
| **Line Chart** | `line-chart` | Smooth curves for trends over time. |
| **Area Chart** | `area-chart` | Filled area charts for volume visualization. |
| **Pie Chart** | `pie-chart` | Donut or Pie charts for proportions. |
| **Radar Chart** | `radar-chart` | Spider/Web chart for multi-variable comparison. |
| **Scatter Plot** | `scatter-chart` | X/Y plotting for correlation. |
| **Bubble Chart** | `bubble-chart` | 3D data visualization (X, Y, Radius). |
| **Heatmap** | `heatmap-chart` | Grid-based density visualization. |
| **Treemap** | `treemap-chart` | Hierarchical data visualization. |
| **Sankey** | `sankey-chart` | Flow and process visualization. |
| **Composite** | `composite-chart` | Dual-axis Bar + Line combination. |
| **Funnel Chart** | `funnel-chart` | **New!** Process flow stages and conversion. |
| **Radial Bar** | `radial-bar-chart` | **New!** Circular gauge/progress visualization. |
| **Waffle Chart** | `waffle-chart` | **New!** 10x10 Grid for parts-to-whole visualization. |
| **Legend** | `chart-legend` | **New!** Reusable chart legend component. |

## License

MIT © [WaffleCharts](https://github.com/surprisewaffles-io/waffle-charts)
