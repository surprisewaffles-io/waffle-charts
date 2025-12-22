import { TreemapChart, type TreemapData } from "../../components/waffle/TreemapChart";
import { ComponentPreview } from "../../components/ComponentPreview";

const mockData: TreemapData = {
  name: "root",
  children: [
    { name: "A", size: 100 },
    { name: "B", size: 50 },
    {
      name: "C",
      children: [
        { name: "C1", size: 30 },
        { name: "C2", size: 40 },
      ]
    },
    { name: "D", size: 80 },
    { name: "E", size: 20 },
  ]
};

const codeString = `import { TreemapChart } from "waffle-charts";

const data = {
  name: "root",
  children: [
    { name: "A", size: 100 },
    { name: "B", size: 50 },
    { 
        name: "C", 
        children: [
            { name: "C1", size: 30 },
            { name: "C2", size: 40 },
        ]
    },
    { name: "D", size: 80 },
    { name: "E", size: 20 },
  ]
};

export function TreemapDemo() {
  return (
    <div className="h-[300px] w-full">
      <TreemapChart data={data} tileMethod="squarify" />
    </div>
  );
}`;

export function TreemapChartPage() {
  return (
    <div className="space-y-10 pb-10">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Treemap</h1>
        <p className="text-xl text-muted-foreground">
          Displays hierarchical data as a set of nested rectangles.
        </p>
      </div>

      <ComponentPreview code={codeString}>
        <div className="h-[350px] w-full bg-muted/20 rounded-lg p-4">
          <TreemapChart data={mockData} />
        </div>
      </ComponentPreview>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Installation</h2>
        <div className="rounded-md bg-muted p-4">
          <code className="text-sm">npm install @visx/heatmap</code>
        </div>
      </div>
    </div>
  );
}
