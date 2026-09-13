/**
 * Charts that put two or more variables against each other so a correlation
 * or a pairwise affinity becomes visible.
 *
 * See `./index.js` for the entry schema every record here follows.
 */
export const relationship = {
  "scatter-chart": {
    name: "ScatterChart",
    label: "Scatter Chart",
    file: "ScatterChart.tsx",
    description:
      "One circle per row on two linear axes, for reading correlation, clustering, and outliers between two numeric variables.",
    category: "relationship",
    complexity: "simple",
    capabilities: ["responsive", "tooltip", "axes", "grid", "numeric", "empty-state", "custom-colors"],
    sizing: { mode: "self", height: 300 },
    dataShape: "Array<{ [xKey]: number; [yKey]: number }>",
    dataRequirements: {
      minRows: 2,
      maxRecommended: 1000,
      requiredProps: ["data", "xKey", "yKey"],
      optionalProps: ["pointClassName", "className", "emptyMessage"],
      requiredFields: ["x", "y"],
      optionalFields: [],
      notes: "Both coordinates must be finite numbers or the row is dropped.",
    },
    useCases: [
      "Ad spend against conversions",
      "Response time against request size",
      "Study hours against exam score",
    ],
    example: {
      scenario: "Ad spend against conversions per campaign",
      data: [
        { x: 120, y: 18 },
        { x: 340, y: 41 },
        { x: 560, y: 55 },
        { x: 800, y: 92 },
      ],
      code: '<ScatterChart data={data} xKey="x" yKey="y" pointClassName="fill-primary" />',
    },
    dependencies: ["@visx/shape", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/scale", "@visx/axis", "@visx/grid", "@visx/glyph", "clsx", "tailwind-merge"],
  },

  "bubble-chart": {
    name: "BubbleChart",
    label: "Bubble Chart",
    file: "BubbleChart.tsx",
    description:
      "A scatter plot with a third variable encoded as circle radius, so three numeric measures read at once.",
    category: "relationship",
    complexity: "moderate",
    capabilities: ["responsive", "tooltip", "axes", "grid", "numeric", "empty-state", "custom-colors"],
    sizing: { mode: "self", height: 300 },
    dataShape: "Array<{ [xKey]: number; [yKey]: number; [zKey]: number }>",
    dataRequirements: {
      minRows: 2,
      maxRecommended: 200,
      requiredProps: ["data", "xKey", "yKey", "zKey"],
      optionalProps: ["minRadius", "maxRadius", "pointClassName", "className", "emptyMessage"],
      requiredFields: ["x", "y", "z"],
      optionalFields: [],
      notes:
        "zKey drives radius between minRadius and maxRadius. All three values must be finite or the row is dropped. Radius encodes area poorly for wide ranges — keep zKey within roughly two orders of magnitude.",
    },
    useCases: [
      "GDP per capita against life expectancy, sized by population",
      "Feature usage against retention, sized by account count",
      "Latency against error rate, sized by traffic",
    ],
    example: {
      scenario: "Country GDP against life expectancy, sized by population",
      data: [
        { x: 42000, y: 79, z: 67 },
        { x: 12000, y: 71, z: 213 },
        { x: 58000, y: 82, z: 38 },
      ],
      code: '<BubbleChart data={data} xKey="x" yKey="y" zKey="z" minRadius={4} maxRadius={30} />',
    },
    dependencies: ["@visx/shape", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/scale", "@visx/axis", "@visx/grid", "clsx", "tailwind-merge"],
  },

  "chord-chart": {
    name: "ChordChart",
    label: "Chord Diagram",
    file: "ChordChart.tsx",
    description:
      "A circle of arcs joined by ribbons whose width is the volume exchanged between each pair, read from a square matrix.",
    category: "relationship",
    complexity: "complex",
    capabilities: ["responsive", "tooltip", "matrix", "empty-state", "custom-colors"],
    sizing: { mode: "self", height: 400 },
    dataShape: "number[][] — a square matrix, plus keys: string[] naming each index",
    dataRequirements: {
      minRows: 2,
      maxRecommended: 12,
      requiredProps: ["data", "keys"],
      optionalProps: ["colorScheme", "className", "emptyMessage"],
      requiredFields: [],
      optionalFields: [],
      notes:
        "`data[i][j]` is the flow from group i to group j. A ragged or non-numeric matrix is padded with zeros to a square. `keys` must be as long as the matrix side. An all-zero matrix renders the empty state.",
    },
    useCases: [
      "Migration between regions",
      "Cross-team code review traffic",
      "Customer switching between product tiers",
    ],
    example: {
      scenario: "Customers switching between three product tiers",
      data: [
        [0, 120, 40],
        [95, 0, 60],
        [30, 75, 0],
      ],
      code:
        '<ChordChart data={data} keys={["Basic", "Pro", "Enterprise"]} />',
    },
    dependencies: ["@visx/chord", "@visx/scale", "@visx/tooltip", "@visx/shape", "@visx/responsive", "@visx/group", "clsx", "tailwind-merge"],
  },
};
