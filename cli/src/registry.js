export const registry = {
  "bar-chart": {
    file: "BarChart.tsx",
    label: "Bar Chart",
    dependencies: ["@visx/shape", "@visx/scale", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/axis", "@visx/grid", "clsx", "tailwind-merge"],
  },
  "line-chart": {
    file: "LineChart.tsx",
    label: "Line Chart",
    dependencies: ["@visx/shape", "@visx/curve", "@visx/scale", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/axis", "@visx/grid", "@visx/glyph", "clsx", "tailwind-merge"],
  },
  "area-chart": {
    file: "AreaChart.tsx",
    label: "Area Chart",
    dependencies: ["@visx/shape", "@visx/curve", "@visx/scale", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/axis", "@visx/grid", "clsx", "tailwind-merge"],
  },
  "pie-chart": {
    file: "PieChart.tsx",
    label: "Pie Chart",
    dependencies: ["@visx/shape", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/text", "clsx", "tailwind-merge"],
  },
  "radar-chart": {
    file: "RadarChart.tsx",
    label: "Radar Chart",
    dependencies: ["@visx/shape", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/scale", "@visx/point", "@visx/grid", "@visx/curve", "clsx", "tailwind-merge"],
  },
  "bubble-chart": {
    file: "BubbleChart.tsx",
    label: "Bubble Chart",
    dependencies: ["@visx/shape", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/scale", "@visx/axis", "@visx/grid", "clsx", "tailwind-merge"],
  },
  "heatmap-chart": {
    file: "HeatmapChart.tsx",
    label: "Heatmap Chart",
    dependencies: ["@visx/heatmap", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/scale", "@visx/axis", "clsx", "tailwind-merge"],
  },
  "treemap-chart": {
    file: "TreemapChart.tsx",
    label: "Treemap Chart",
    dependencies: ["@visx/hierarchy", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/scale", "clsx", "tailwind-merge"],
  },
  "scatter-chart": {
    file: "ScatterChart.tsx",
    label: "Scatter Chart",
    dependencies: ["@visx/shape", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/scale", "@visx/axis", "@visx/grid", "@visx/glyph", "clsx", "tailwind-merge"],
  },
  "sankey-chart": {
    file: "SankeyChart.tsx",
    label: "Sankey Chart",
    dependencies: ["@visx/sankey", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/scale", "clsx", "tailwind-merge"],
  },
  "composite-chart": {
    file: "CompositeChart.tsx",
    label: "Composite Chart",
    dependencies: ["@visx/shape", "@visx/scale", "@visx/axis", "@visx/grid", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/curve", "@visx/event", "clsx", "tailwind-merge"],
  },
  "chord-chart": {
    file: "ChordChart.tsx",
    label: "Chord Diagram",
    dependencies: ["@visx/chord", "@visx/scale", "@visx/tooltip", "@visx/shape", "@visx/responsive", "@visx/group", "clsx", "tailwind-merge"],
  },
  "candlestick-chart": {
    file: "CandlestickChart.tsx",
    label: "Candlestick Chart",
    dependencies: ["@visx/group", "@visx/scale", "@visx/shape", "@visx/axis", "@visx/grid", "@visx/responsive", "@visx/tooltip", "@visx/event", "d3-array", "clsx", "tailwind-merge"],
  },
  "chart-legend": {
    file: "ChartLegend.tsx",
    label: "Chart Legend",
    dependencies: ["clsx", "tailwind-merge"],
  },
  "funnel-chart": {
    file: "FunnelChart.tsx",
    label: "Funnel Chart",
    dependencies: ["@visx/group", "@visx/responsive", "@visx/scale", "@visx/tooltip", "clsx", "tailwind-merge"],
  },
  "radial-bar-chart": {
    file: "RadialBarChart.tsx",
    label: "Radial Bar Chart",
    dependencies: ["@visx/group", "@visx/shape", "@visx/scale", "@visx/responsive", "@visx/tooltip", "clsx", "tailwind-merge"],
  }
};
