import { ChordChart } from "../../components/waffle/ChordChart";
import { ComponentPreview } from "../../components/ComponentPreview";

// 4x4 Matrix representing flow between 4 teams: Engineering, Design, Product, Sales
// Values represent emails/documents shared
const matrix = [
  [11975, 5871, 8916, 2868], // Engineering
  [1951, 10048, 2060, 6171], // Design
  [8010, 16145, 8090, 8045], // Product
  [1013, 990, 940, 6907],    // Sales
];

const keys = ['Engineering', 'Design', 'Product', 'Sales'];

const codeString = `import { ChordChart } from "waffle-charts";

const matrix = [
  [1197, 587, 891, 286],
  [195, 1004, 206, 617],
  [801, 1614, 809, 804],
  [101, 99, 94, 690],
];

const keys = ['Engineering', 'Design', 'Product', 'Sales'];

export function ChordChartDemo() {
  return (
    <div className="h-[400px] w-full">
      <ChordChart data={matrix} keys={keys} />
    </div>
  );
}`;

export function ChordChartPage() {
  return (
    <div className="space-y-10 pb-10">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Chord Diagram</h1>
        <p className="text-xl text-muted-foreground">
          Visualizes the inter-relationships between data in a matrix. Perfect for analyzing flows and connections between a fixed set of entities.
        </p>
      </div>

      <ComponentPreview code={codeString}>
        <div className="h-[400px] w-full">
          <ChordChart data={matrix} keys={keys} />
        </div>
      </ComponentPreview>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Installation</h2>
        <div className="rounded-md bg-muted p-4">
          <code className="text-sm">npm install @visx/chord @visx/shape @visx/scale @visx/group @visx/tooltip</code>
        </div>
      </div>
    </div>
  );
}
