/**
 * Charts built around the open/high/low/close convention of price series.
 *
 * See `./index.js` for the entry schema every record here follows.
 */
export const financial = {
  "candlestick-chart": {
    name: "CandlestickChart",
    label: "Candlestick Chart",
    file: "CandlestickChart.tsx",
    description:
      "One candle per period over a time scale: the body spans open to close, the wick spans low to high, and the fill colour marks a rise or a fall.",
    category: "financial",
    complexity: "complex",
    capabilities: ["responsive", "tooltip", "axes", "grid", "temporal", "empty-state", "custom-colors"],
    sizing: { mode: "parent" },
    dataShape:
      "Array<{ [xKey]: string | number | Date; [openKey]: number; [highKey]: number; [lowKey]: number; [closeKey]: number }>",
    dataRequirements: {
      minRows: 1,
      maxRecommended: 250,
      requiredProps: ["data", "xKey", "openKey", "highKey", "lowKey", "closeKey"],
      optionalProps: ["upColor", "downColor", "xAxisLabel", "yAxisLabel", "showXAxis", "showYAxis", "showGrid", "className", "emptyMessage"],
      requiredFields: ["date", "open", "high", "low", "close"],
      optionalFields: [],
      notes:
        "xKey is passed to `new Date()` and must parse. Rows missing a finite high or low are dropped. This component renders a bare ParentSize with no wrapper, so the parent element must have a height.",
    },
    useCases: [
      "Daily stock price history",
      "Cryptocurrency hourly price action",
      "Commodity futures over a contract period",
    ],
    example: {
      scenario: "Four days of daily stock price action",
      data: [
        { date: "2026-01-05", open: 182.1, high: 186.4, low: 181.2, close: 185.9 },
        { date: "2026-01-06", open: 185.9, high: 188.0, low: 184.3, close: 184.8 },
        { date: "2026-01-07", open: 184.8, high: 185.2, low: 179.6, close: 180.4 },
        { date: "2026-01-08", open: 180.4, high: 183.7, low: 180.0, close: 183.2 },
      ],
      code:
        '<div className="h-[400px]">\n  <CandlestickChart\n    data={data}\n    xKey="date"\n    openKey="open"\n    highKey="high"\n    lowKey="low"\n    closeKey="close"\n  />\n</div>',
    },
    dependencies: ["@visx/group", "@visx/scale", "@visx/shape", "@visx/axis", "@visx/grid", "@visx/responsive", "@visx/tooltip", "@visx/event", "d3-array", "clsx", "tailwind-merge"],
  },
};
