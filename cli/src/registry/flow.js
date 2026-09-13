/**
 * Charts that trace quantity moving between named nodes.
 *
 * See `./index.js` for the entry schema every record here follows.
 */
export const flow = {
  "sankey-chart": {
    name: "SankeyChart",
    label: "Sankey Chart",
    file: "SankeyChart.tsx",
    description:
      "Nodes in columns joined by ribbons whose thickness is the quantity moving between them, for tracing where a total splits and recombines.",
    category: "flow",
    complexity: "complex",
    capabilities: ["responsive", "tooltip", "empty-state", "custom-colors"],
    sizing: { mode: "self", height: 400 },
    dataShape:
      "{ nodes: Array<{ name: string }>; links: Array<{ source: number; target: number; value: number }> }",
    dataRequirements: {
      minRows: 2,
      maxRecommended: 40,
      requiredProps: ["data"],
      optionalProps: ["colorScheme", "className", "emptyMessage"],
      requiredFields: ["nodes", "links"],
      optionalFields: [],
      notes:
        "`source` and `target` are indices into `nodes`, not names. The graph must be acyclic — a cycle makes the layout fail to converge.",
    },
    useCases: [
      "Website visitor paths from entry to exit",
      "Energy flow from source to end use",
      "Budget allocation from revenue to spend categories",
    ],
    example: {
      scenario: "Visitor paths from landing page to outcome",
      data: {
        nodes: [{ name: "Landing" }, { name: "Pricing" }, { name: "Signup" }, { name: "Bounce" }],
        links: [
          { source: 0, target: 1, value: 5200 },
          { source: 0, target: 3, value: 6800 },
          { source: 1, target: 2, value: 2100 },
          { source: 1, target: 3, value: 3100 },
        ],
      },
      code: "<SankeyChart data={data} />",
    },
    dependencies: ["@visx/sankey", "@visx/group", "@visx/responsive", "@visx/tooltip", "@visx/scale", "clsx", "tailwind-merge"],
  },
};
