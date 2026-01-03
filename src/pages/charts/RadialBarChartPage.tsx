import { RadialBarChart } from '../../components/waffle/RadialBarChart';
import { ChartLegend } from '../../components/waffle/ChartLegend';
import { ComponentPreview } from '../../components/ComponentPreview';
// @ts-ignore
import RadialBarChartSource from '../../components/waffle/RadialBarChart.tsx?raw';

const data = [
  { name: 'Direct', value: 3400, fill: '#3b82f6' },
  { name: 'Organic', value: 2800, fill: '#10b981' },
  { name: 'Referral', value: 1200, fill: '#f59e0b' },
];

const simpleGaugeData = [
  { name: 'Score', value: 75, fill: '#3b82f6' }
];

export function RadialBarChartPage() {
  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Radial Bar Chart</h1>
        <p className="text-muted-foreground mt-2">Circuar bar charts, useful for comparing quantities or showing progress.</p>
      </div>

      <ComponentPreview
        title="Multi-Ring Radial Bar"
        description="Comparing multiple categories with concentric rings."
        code={RadialBarChartSource}
      >
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="h-[400px] w-full">
            <RadialBarChart
              data={data}
              valueKey="value"
              labelKey="name"
              colors={data.map(d => d.fill)}
              innerRadius={0.2}
            />
          </div>
          <ChartLegend
            payload={data.map(d => ({ label: d.name, color: d.fill }))}
          />
        </div>
      </ComponentPreview>

      <div className="p-6 border rounded-lg shadow-sm">
        <h3 className="font-semibold mb-4">Gauge Style</h3>
        <ComponentPreview
          title="Gauge / Progress"
          description="Using a semi-circle radial bar to show progress."
          code={RadialBarChartSource}
        >
          <div className="h-[300px] w-full">
            <RadialBarChart
              data={simpleGaugeData}
              valueKey="value"
              labelKey="name"
              maxValue={100}
              startAngle={-90}
              endAngle={90}
              innerRadius={0.7}
            />
          </div>
        </ComponentPreview>
      </div>
    </div>
  );
}
