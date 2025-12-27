import { BarChart } from '../../components/waffle/BarChart';
import { ComponentPreview } from '../../components/ComponentPreview';
// @ts-ignore
import BarChartSource from '../../components/waffle/BarChart.tsx?raw';

const data = [
  { letter: 'A', frequency: 100 },
  { letter: 'B', frequency: 200 },
  { letter: 'C', frequency: 150 },
  { letter: 'D', frequency: 300 },
  { letter: 'E', frequency: 250 },
  { letter: 'F', frequency: 180 },
];

export function BarChartPage() {
  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Bar Chart</h1>
        <p className="text-muted-foreground mt-2">Vertical bar chart for categorical data.</p>
      </div>

      <ComponentPreview
        title="Interactive Bar Chart"
        description="A simple bar chart with tooltips and hover effects."
        code={BarChartSource}
      >
        <div className="h-[400px] w-full">
          <BarChart
            data={data}
            xKey="letter"
            yKey="frequency"
          />
        </div>
      </ComponentPreview>

      <div className="p-6 border rounded-lg shadow-sm">
        <h3 className="font-semibold mb-4">Custom Colors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-[200px] w-full">
            <BarChart
              data={data.slice(0, 4)}
              xKey="letter"
              yKey="frequency"
              barColor="#6366f1"
            />
          </div>
          <div className="h-[200px] w-full">
            <BarChart
              data={data.slice(0, 4)}
              xKey="letter"
              yKey="frequency"
              barColor="#f97316"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
