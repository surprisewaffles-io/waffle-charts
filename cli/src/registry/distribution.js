/**
 * Charts that show how a measure is spread across a continuous domain —
 * usually time, sometimes a two-dimensional grid.
 *
 * See `./index.js` for the entry schema every record here follows.
 */
export const distribution = {
  "line-chart": {
    name: "LineChart",
    label: "Line Chart",
    file: "LineChart.tsx",
    description:
      "A monotone curve over a time scale with a soft area fill, a hover crosshair, and a point marker that snaps to the nearest row.",
    category: "distribution",
    complexity: "moderate",
    capabilities: ["responsive", "tooltip", "axes", "grid", "temporal", "empty-state", "custom-colors"],
    sizing: { mode: "self", height: 300 },
    dataShape: "Array<{ [xKey]: string | number | Date; [yKey]: number }>",
    dataRequirements: {
      minRows: 2,
      maxRecommended: 500,
      requiredProps: ["data", "xKey", "yKey"],
      optionalProps: ["lineColor", "areaColor", "className", "emptyMessage"],
      requiredFields: ["date", "value"],
      optionalFields: [],
      notes:
        "xKey is passed to `new Date()`, so it must parse as a date. Rows that do not are dropped. A single row draws no line.",
    },
    useCases: [
      "Daily active users over a quarter",
      "Server response time across a deploy window",
      "Stock closing price history",
    ],
    example: {
      scenario: "Daily active users across one week",
      data: [
        { date: "2026-01-01", value: 1200 },
        { date: "2026-01-02", value: 1340 },
        { date: "2026-01-03", value: 1290 },
        { date: "2026-01-04", value: 1510 },
      ],
      code: '<LineChart data={data} xKey="date" yKey="value" />',
    },
    dependencies: ["@visx/shape", "@visx/curve", "@visx/scale", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/axis", "@visx/grid", "@visx/glyph", "clsx", "tailwind-merge"],
  },

  "area-chart": {
    name: "AreaChart",
    label: "Area Chart",
    file: "AreaChart.tsx",
    description:
      "Stacked areas over a time scale: each key in `keys` becomes one band, and the bands sum to the total at every x position.",
    category: "distribution",
    complexity: "moderate",
    capabilities: ["responsive", "tooltip", "axes", "grid", "temporal", "multi-series", "empty-state", "custom-colors"],
    sizing: { mode: "self", height: 300 },
    dataShape: "Array<{ [xKey]: string | number | Date; [key in keys]: number }>",
    dataRequirements: {
      minRows: 2,
      maxRecommended: 365,
      requiredProps: ["data", "xKey", "keys"],
      optionalProps: ["colors", "className", "emptyMessage"],
      requiredFields: ["date", "desktop", "mobile"],
      optionalFields: [],
      notes:
        "`keys` lists the series fields to stack, in draw order. Missing or non-numeric series values count as zero. xKey must parse as a date.",
    },
    useCases: [
      "Traffic split by device type over time",
      "Revenue by product line across months",
      "Storage consumption by tier",
    ],
    example: {
      scenario: "Weekly sessions split between desktop and mobile",
      data: [
        { date: "2026-01-01", desktop: 820, mobile: 640 },
        { date: "2026-01-08", desktop: 910, mobile: 720 },
        { date: "2026-01-15", desktop: 880, mobile: 815 },
      ],
      code: '<AreaChart data={data} xKey="date" keys={["desktop", "mobile"]} />',
    },
    dependencies: ["@visx/shape", "@visx/curve", "@visx/scale", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/axis", "@visx/grid", "clsx", "tailwind-merge"],
  },

  "heatmap-chart": {
    name: "HeatmapChart",
    label: "Heatmap Chart",
    file: "HeatmapChart.tsx",
    description:
      "A grid of rectangles whose fill interpolates between two colours by count, for reading density across two binned dimensions.",
    category: "distribution",
    complexity: "moderate",
    capabilities: ["responsive", "tooltip", "matrix", "empty-state", "custom-colors"],
    sizing: { mode: "self", height: 300 },
    dataShape: "Array<{ bin: number; bins: Array<{ bin: number; count: number }> }>",
    dataRequirements: {
      minRows: 1,
      maxRecommended: 100,
      requiredProps: ["data"],
      optionalProps: ["colorRange", "gap", "className", "emptyMessage"],
      requiredFields: ["bin", "bins"],
      optionalFields: [],
      notes:
        "The outer array is columns, each `bins` array is that column's rows. Columns with an empty `bins` array are dropped. Field names are fixed — there are no accessor props.",
    },
    useCases: [
      "Commit activity by weekday and hour",
      "Support ticket volume by day and shift",
      "Sensor readings across a grid of positions",
    ],
    example: {
      scenario: "Commits per weekday across three hour-blocks",
      data: [
        { bin: 0, bins: [{ bin: 0, count: 12 }, { bin: 1, count: 34 }, { bin: 2, count: 8 }] },
        { bin: 1, bins: [{ bin: 0, count: 20 }, { bin: 1, count: 41 }, { bin: 2, count: 15 }] },
        { bin: 2, bins: [{ bin: 0, count: 5 }, { bin: 1, count: 27 }, { bin: 2, count: 31 }] },
      ],
      code: '<HeatmapChart data={data} colorRange={["#e2e8f0", "#0f172a"]} gap={2} />',
    },
    dependencies: ["@visx/heatmap", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/scale", "@visx/axis", "clsx", "tailwind-merge"],
  },
};
