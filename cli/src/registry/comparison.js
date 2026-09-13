/**
 * Charts whose job is ranking a measure across discrete categories.
 *
 * See `./index.js` for the entry schema every record here follows.
 */
export const comparison = {
  "bar-chart": {
    name: "BarChart",
    label: "Bar Chart",
    file: "BarChart.tsx",
    description:
      "Vertical bars on a band scale for ranking one numeric measure across discrete categories.",
    category: "comparison",
    complexity: "simple",
    capabilities: ["responsive", "tooltip", "axes", "empty-state", "custom-colors", "categorical"],
    sizing: { mode: "self", height: 300 },
    dataShape: "Array<{ [xKey]: string; [yKey]: number }>",
    dataRequirements: {
      minRows: 1,
      maxRecommended: 50,
      requiredProps: ["data", "xKey", "yKey"],
      optionalProps: ["barColor", "className", "emptyMessage"],
      requiredFields: ["label", "value"],
      optionalFields: [],
      notes: "Rows whose yKey is not a finite number are dropped before scaling.",
    },
    useCases: [
      "Revenue by sales region",
      "Survey responses per answer choice",
      "Open bug count by team",
    ],
    example: {
      scenario: "Quarterly revenue by product line",
      data: [
        { label: "Product A", value: 4500 },
        { label: "Product B", value: 3200 },
        { label: "Product C", value: 5100 },
      ],
      code: '<BarChart data={data} xKey="label" yKey="value" barColor="bg-primary" />',
    },
    dependencies: ["@visx/shape", "@visx/scale", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/axis", "@visx/grid", "clsx", "tailwind-merge"],
  },

  "radar-chart": {
    name: "RadarChart",
    label: "Radar Chart",
    file: "RadarChart.tsx",
    description:
      "Spokes radiating from a centre, joined into a polygon, for comparing one subject across several axes at once.",
    category: "comparison",
    complexity: "moderate",
    capabilities: ["responsive", "empty-state", "custom-colors", "categorical"],
    sizing: { mode: "self", height: 300 },
    dataShape: "Array<{ [angleKey]: string; [radiusKey]: number }>",
    dataRequirements: {
      minRows: 3,
      maxRecommended: 12,
      requiredProps: ["data", "angleKey", "radiusKey"],
      optionalProps: ["gridColor", "polygonColor", "className", "emptyMessage"],
      requiredFields: ["axis", "score"],
      optionalFields: [],
      notes:
        "Fewer than three spokes leaves no enclosed area. This component renders no tooltip.",
    },
    useCases: [
      "Skill assessment across competencies",
      "Product feature coverage scoring",
      "Player attribute ratings",
    ],
    example: {
      scenario: "Engineer skill profile across six competencies",
      data: [
        { axis: "Testing", score: 80 },
        { axis: "Design", score: 65 },
        { axis: "Delivery", score: 90 },
        { axis: "Review", score: 72 },
        { axis: "Docs", score: 55 },
        { axis: "Ops", score: 68 },
      ],
      code: '<RadarChart data={data} angleKey="axis" radiusKey="score" />',
    },
    dependencies: ["@visx/shape", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/scale", "@visx/point", "@visx/grid", "@visx/curve", "clsx", "tailwind-merge"],
  },

  "composite-chart": {
    name: "CompositeChart",
    label: "Composite Chart",
    file: "CompositeChart.tsx",
    description:
      "Bars and a line share one x axis on independent left and right y scales, so a count and a rate can be read together.",
    category: "comparison",
    complexity: "complex",
    capabilities: ["responsive", "tooltip", "axes", "grid", "dual-axis", "empty-state", "custom-colors", "categorical"],
    sizing: { mode: "self", height: 400 },
    dataShape: "Array<{ [xKey]: string; [barKey]: number; [lineKey]: number }>",
    dataRequirements: {
      minRows: 1,
      maxRecommended: 40,
      requiredProps: ["data", "xKey", "barKey", "lineKey"],
      optionalProps: ["barColor", "lineColor", "className", "emptyMessage"],
      requiredFields: ["month", "revenue", "margin"],
      optionalFields: [],
      notes: "A row needs both barKey and lineKey finite, or it is dropped.",
    },
    useCases: [
      "Revenue bars against profit-margin percentage",
      "Ticket volume against average resolution time",
      "Headcount against attrition rate",
    ],
    example: {
      scenario: "Monthly revenue with margin percentage on a second axis",
      data: [
        { month: "Jan", revenue: 42000, margin: 18 },
        { month: "Feb", revenue: 51000, margin: 22 },
        { month: "Mar", revenue: 47500, margin: 20 },
      ],
      code: '<CompositeChart data={data} xKey="month" barKey="revenue" lineKey="margin" />',
    },
    dependencies: ["@visx/shape", "@visx/scale", "@visx/axis", "@visx/grid", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/curve", "@visx/event", "clsx", "tailwind-merge"],
  },

  "radial-bar-chart": {
    name: "RadialBarChart",
    label: "Radial Bar Chart",
    file: "RadialBarChart.tsx",
    description:
      "Concentric arcs, one ring per row, for comparing a handful of values or showing progress toward a shared target.",
    category: "comparison",
    complexity: "moderate",
    capabilities: ["responsive", "tooltip", "empty-state", "custom-colors", "categorical"],
    sizing: { mode: "parent", minHeight: 200 },
    dataShape: "Array<{ [labelKey]: string; [valueKey]: number }>",
    dataRequirements: {
      minRows: 1,
      maxRecommended: 8,
      requiredProps: ["data", "labelKey", "valueKey"],
      optionalProps: ["maxValue", "colors", "startAngle", "endAngle", "innerRadius", "className", "emptyMessage"],
      requiredFields: ["label", "value"],
      optionalFields: [],
      notes:
        "Pass maxValue to make rings read as progress against a fixed target; otherwise the largest row sets the scale. Wrap in a container with a height.",
    },
    useCases: [
      "Quarterly goal completion per team",
      "Storage used per volume",
      "Campaign budget spent by channel",
    ],
    example: {
      scenario: "Percent of quarterly goal reached by team",
      data: [
        { label: "Sales", value: 82 },
        { label: "Support", value: 64 },
        { label: "Success", value: 91 },
      ],
      code:
        '<div className="h-[320px]">\n  <RadialBarChart data={data} labelKey="label" valueKey="value" maxValue={100} />\n</div>',
    },
    dependencies: ["@visx/group", "@visx/shape", "@visx/scale", "@visx/responsive", "@visx/tooltip", "clsx", "tailwind-merge"],
  },
};
