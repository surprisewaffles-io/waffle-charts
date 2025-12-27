import { ScatterChart } from '../../components/waffle/ScatterChart';
import { ComponentPreview } from '../../components/ComponentPreview';
// @ts-ignore
import ScatterChartSource from '../../components/waffle/ScatterChart.tsx?raw';

// Generate some random correlation data
const data = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  x: Math.floor(Math.random() * 100),
  y: Math.floor(Math.random() * 1000),
}));

export function ScatterChartPage() {
  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Scatter Chart</h1>
        <p className="text-muted-foreground mt-2">Visualizing the relationship between two numerical variables.</p>
      </div>

      <ComponentPreview
        title="Price vs. Performance"
        description="A scatter plot with grid lines and hover effects."
        code={ScatterChartSource}
      >
        <div className="h-[400px] w-full">
          <ScatterChart
            data={data}
            xKey="x"
            yKey="y"
            pointClassName="fill-purple-500"
          />
        </div>
      </ComponentPreview>

      <div className="p-6 border rounded-lg shadow-sm">
        <h3 className="font-semibold mb-4">Density Test (200 points)</h3>
        <ScatterChart
          data={Array.from({ length: 200 }, () => ({ x: Math.random() * 100, y: Math.random() * 100 }))}
          xKey="x"
          yKey="y"
          pointClassName="fill-orange-500 opacity-50"
        />
      </div>
    </div>
  );
}
