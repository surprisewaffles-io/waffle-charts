import { SankeyChart } from "../../components/waffle/SankeyChart";
import { ComponentPreview } from "../../components/ComponentPreview";

const energyData = {
  nodes: [
    { name: "Solar" },
    { name: "Wind" },
    { name: "Hydro" },
    { name: "Grid" },
    { name: "Industry" },
    { name: "Residential" },
    { name: "Transport" },
    { name: "Losses" },
  ],
  links: [
    { source: 0, target: 3, value: 30 }, // Solar -> Grid
    { source: 1, target: 3, value: 20 }, // Wind -> Grid
    { source: 2, target: 3, value: 50 }, // Hydro -> Grid
    { source: 3, target: 4, value: 35 }, // Grid -> Industry
    { source: 3, target: 5, value: 45 }, // Grid -> Residential
    { source: 3, target: 6, value: 15 }, // Grid -> Transport
    { source: 3, target: 7, value: 5 },  // Grid -> Losses
  ]
};

const codeString = `import { SankeyChart } from "waffle-charts";

const data = {
  nodes: [
    { name: "Solar" }, { name: "Wind" }, { name: "Hydro" },
    { name: "Grid" },
    { name: "Industry" }, { name: "Residential" }, { name: "Transport" }, { name: "Losses" }
  ],
  links: [
    { source: 0, target: 3, value: 30 },
    { source: 1, target: 3, value: 20 },
    { source: 2, target: 3, value: 50 },
    { source: 3, target: 4, value: 35 },
    { source: 3, target: 5, value: 45 },
    { source: 3, target: 6, value: 15 },
    { source: 3, target: 7, value: 5 },
  ]
};

export function SankeyDemo() {
  return (
    <div className="h-[400px] w-full">
      <SankeyChart data={data} />
    </div>
  );
}`;

export function SankeyChartPage() {
  return (
    <div className="space-y-10 pb-10">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Sankey Diagram</h1>
        <p className="text-xl text-muted-foreground">
          Visualizes the flow of data, resources, or energy between multiple entities.
        </p>
      </div>

      <ComponentPreview code={codeString}>
        <div className="h-[400px] w-full">
          <SankeyChart data={energyData} />
        </div>
      </ComponentPreview>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Installation</h2>
        <div className="rounded-md bg-muted p-4">
          <code className="text-sm">npm install @visx/sankey</code>
        </div>
      </div>
    </div>
  );
}
