/**
 * Supporting components that accompany a chart rather than plot data.
 *
 * See `./index.js` for the entry schema every record here follows.
 */
export const utility = {
  "chart-legend": {
    name: "ChartLegend",
    label: "Chart Legend",
    file: "ChartLegend.tsx",
    description:
      "A row or column of colour swatches with labels, for naming the series in a chart that draws no legend of its own.",
    category: "utility",
    complexity: "simple",
    capabilities: ["custom-colors", "categorical"],
    sizing: { mode: "inline" },
    dataShape: "Array<{ label: string; color: string }>",
    dataRequirements: {
      minRows: 1,
      maxRecommended: 12,
      requiredProps: ["payload"],
      optionalProps: ["orientation", "className"],
      requiredFields: ["label", "color"],
      optionalFields: [],
      notes:
        "`color` is applied as an inline background colour, so it must be a CSS colour value, not a Tailwind class. Field names are fixed — there are no accessor props. An empty payload renders an empty row rather than a message.",
    },
    useCases: [
      "Naming the stacked series of an area chart",
      "Labelling pie or waffle segments outside the plot",
      "A shared legend above a row of small multiples",
    ],
    example: {
      scenario: "Legend for a two-series stacked area chart",
      data: [
        { label: "Desktop", color: "#3b82f6" },
        { label: "Mobile", color: "#6366f1" },
      ],
      code: '<ChartLegend payload={data} orientation="horizontal" />',
    },
    dependencies: ["clsx", "tailwind-merge"],
  },
};
