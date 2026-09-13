/**
 * Part-to-whole charts: every mark is a share of one total.
 *
 * See `./index.js` for the entry schema every record here follows.
 */
export const composition = {
  "pie-chart": {
    name: "PieChart",
    label: "Pie Chart",
    file: "PieChart.tsx",
    description:
      "Arcs sized by share of the total. Set `innerRadius` above zero to render a donut with optional centre text.",
    category: "composition",
    complexity: "simple",
    capabilities: ["responsive", "tooltip", "part-to-whole", "empty-state", "custom-colors", "categorical"],
    sizing: { mode: "self", height: 300 },
    dataShape: "Array<{ [labelKey]: string; [valueKey]: number }>",
    dataRequirements: {
      minRows: 2,
      maxRecommended: 7,
      requiredProps: ["data", "labelKey", "valueKey"],
      optionalProps: ["innerRadius", "colors", "centerText", "className", "emptyMessage"],
      requiredFields: ["label", "value"],
      optionalFields: [],
      notes:
        "Only rows with a finite value greater than zero occupy an arc; zero and negative rows are dropped. Past about seven slices the arcs stop being readable — use a bar chart instead.",
    },
    useCases: [
      "Market share by vendor",
      "Budget split across departments",
      "Traffic sources for a landing page",
    ],
    example: {
      scenario: "Traffic share by acquisition channel, as a donut",
      data: [
        { label: "Organic", value: 4200 },
        { label: "Paid", value: 1800 },
        { label: "Referral", value: 950 },
        { label: "Direct", value: 1300 },
      ],
      code:
        '<PieChart\n  data={data}\n  labelKey="label"\n  valueKey="value"\n  innerRadius={60}\n  centerText={{ title: "8,250", subtitle: "sessions" }}\n/>',
    },
    dependencies: ["@visx/shape", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/text", "clsx", "tailwind-merge"],
  },

  "treemap-chart": {
    name: "TreemapChart",
    label: "Treemap Chart",
    file: "TreemapChart.tsx",
    description:
      "Nested rectangles sized by a leaf's `size`, for showing how a hierarchy divides a total.",
    category: "composition",
    complexity: "moderate",
    capabilities: ["responsive", "hierarchical", "part-to-whole", "empty-state", "custom-colors"],
    sizing: { mode: "self", height: 300 },
    dataShape: "{ name: string; size?: number; children?: TreemapData[] }",
    dataRequirements: {
      minRows: 1,
      maxRecommended: 200,
      requiredProps: ["data"],
      optionalProps: ["tileMethod", "background", "className", "emptyMessage"],
      requiredFields: ["name", "children", "size"],
      optionalFields: ["parent"],
      notes:
        "`data` is a single root node, not an array. Only leaves carry `size`; parent totals are summed. `tileMethod` accepts squarify, binary, resquarify, slice, dice, or sliceDice. This component renders no tooltip.",
    },
    useCases: [
      "Disk usage by directory",
      "Portfolio weight by sector and holding",
      "Bundle size by module",
    ],
    example: {
      scenario: "Bundle size by feature area",
      data: {
        name: "bundle",
        children: [
          {
            name: "charts",
            children: [
              { name: "visx", size: 240 },
              { name: "d3", size: 120 },
            ],
          },
          { name: "router", size: 65 },
          { name: "ui", size: 90 },
        ],
      },
      code: '<TreemapChart data={data} tileMethod="squarify" />',
    },
    dependencies: ["@visx/hierarchy", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/scale", "clsx", "tailwind-merge"],
  },

  "waffle-chart": {
    name: "WaffleChart",
    label: "Waffle Chart",
    file: "WaffleChart.tsx",
    description:
      "A grid of cells, ten by ten by default, where each category claims a cell count proportional to its share. Easier to read precisely than a pie.",
    category: "composition",
    complexity: "moderate",
    capabilities: ["responsive", "tooltip", "part-to-whole", "empty-state", "custom-colors", "categorical"],
    sizing: { mode: "parent", minHeight: 200 },
    dataShape: "Array<{ [labelKey]: string; [valueKey]: number }>",
    dataRequirements: {
      minRows: 1,
      maxRecommended: 6,
      requiredProps: ["data", "labelKey", "valueKey"],
      optionalProps: ["total", "rows", "columns", "gap", "rounding", "colors", "className", "testId", "emptyMessage"],
      requiredFields: ["label", "value"],
      optionalFields: [],
      notes:
        "Without `total` the values are normalised against their own sum, filling every cell. Pass `total` to leave the remainder uncoloured. Wrap in a container with a height.",
    },
    useCases: [
      "Percentage of a cohort by outcome",
      "Survey agreement split across options",
      "Progress toward a headcount plan",
    ],
    example: {
      scenario: "Support ticket outcomes across a 10x10 grid",
      data: [
        { label: "Resolved", value: 64 },
        { label: "Escalated", value: 21 },
        { label: "Pending", value: 15 },
      ],
      code:
        '<div className="h-[320px]">\n  <WaffleChart data={data} labelKey="label" valueKey="value" rows={10} columns={10} />\n</div>',
    },
    dependencies: ["@visx/group", "@visx/responsive", "@visx/scale", "@visx/tooltip", "clsx", "tailwind-merge"],
  },

  "funnel-chart": {
    name: "FunnelChart",
    label: "Funnel Chart",
    file: "FunnelChart.tsx",
    description:
      "Stacked horizontal bands, each narrowed in proportion to its value, for reading drop-off between ordered stages.",
    category: "composition",
    complexity: "simple",
    capabilities: ["responsive", "tooltip", "part-to-whole", "empty-state", "custom-colors", "categorical"],
    sizing: { mode: "parent", minHeight: 200 },
    dataShape: "Array<{ [stepKey]: string; [valueKey]: number }>",
    dataRequirements: {
      minRows: 2,
      maxRecommended: 8,
      requiredProps: ["data", "stepKey", "valueKey"],
      optionalProps: ["colors", "className", "emptyMessage"],
      requiredFields: ["step", "value"],
      optionalFields: [],
      notes:
        "Row order is stage order — the array is not sorted. Band width is relative to the largest value, so pass stages already in descending sequence. Wrap in a container with a height.",
    },
    useCases: [
      "Signup conversion from visit to paid",
      "Recruiting pipeline by interview stage",
      "Checkout drop-off per step",
    ],
    example: {
      scenario: "Signup funnel from landing page to paid plan",
      data: [
        { step: "Visited", value: 12000 },
        { step: "Signed up", value: 4300 },
        { step: "Activated", value: 2100 },
        { step: "Paid", value: 680 },
      ],
      code:
        '<div className="h-[360px]">\n  <FunnelChart data={data} stepKey="step" valueKey="value" />\n</div>',
    },
    dependencies: ["@visx/group", "@visx/responsive", "@visx/scale", "@visx/tooltip", "clsx", "tailwind-merge"],
  },
};
