import { LineChart } from '../../components/waffle/LineChart';
import { ComponentPreview } from '../../components/ComponentPreview';
// @ts-ignore
import LineChartSource from '../../components/waffle/LineChart.tsx?raw';

const data = [
  { date: '2024-01-01', value: 100 },
  { date: '2024-01-02', value: 200 },
  { date: '2024-01-03', value: 150 },
  { date: '2024-01-04', value: 300 },
  { date: '2024-01-05', value: 250 },
  { date: '2024-01-06', value: 350 },
];

export function LineChartPage() {
  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Line Chart</h1>
        <p className="text-muted-foreground mt-2">Visualize data trends over time.</p>
      </div>

      <ComponentPreview
        title="Single Series"
        description="Line chart with a single data series."
        code={LineChartSource}
      >
        <div className="h-[400px] w-full">
          <LineChart
            data={data}
            xKey="date"
            yKey="value"
            lineColor="#3b82f6"
            areaColor="#3b82f6"
          />
        </div>
      </ComponentPreview>

      <ComponentPreview
        title="Multi-Series Comparison"
        description="Multiple lines on the same chart with a legend."
        code={LineChartSource}
      >
        <div className="h-[400px] w-full">
          <LineChart
            data={[
              { date: '2024-01-01', revenue: 100, profit: 40 },
              { date: '2024-01-02', revenue: 150, profit: 50 },
              { date: '2024-01-03', revenue: 120, profit: 30 },
              { date: '2024-01-04', revenue: 200, profit: 90 },
              { date: '2024-01-05', revenue: 180, profit: 70 },
            ]}
            xKey="date"
            series={[
              { key: 'revenue', color: '#8b5cf6', label: 'Revenue' },
              { key: 'profit', color: '#10b981', label: 'Profit' }
            ]}
          />
        </div>
      </ComponentPreview>
    </div>
  );
}
