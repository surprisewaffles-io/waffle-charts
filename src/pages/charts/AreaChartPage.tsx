import { AreaChart } from '../../components/waffle/AreaChart';
import { ComponentPreview } from '../../components/ComponentPreview';
// @ts-ignore
import AreaChartSource from '../../components/waffle/AreaChart.tsx?raw';

const data = [
  { date: '2024-01-01', organic: 400, paid: 240 },
  { date: '2024-02-01', organic: 300, paid: 139 },
  { date: '2024-03-01', organic: 200, paid: 980 },
  { date: '2024-04-01', organic: 278, paid: 390 },
  { date: '2024-05-01', organic: 189, paid: 480 },
  { date: '2024-06-01', organic: 239, paid: 380 },
  { date: '2024-07-01', organic: 349, paid: 430 },
];

export function AreaChartPage() {
  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Area Chart</h1>
        <p className="text-muted-foreground mt-2">Stacked area charts useful for comparing volume over time.</p>
      </div>

      <ComponentPreview
        title="Traffic Sources"
        code={AreaChartSource}
      >
        <div className="h-[400px] w-full">
          <AreaChart
            data={data}
            xKey="date"
            keys={['organic', 'paid']}
            colors={['#22c55e', '#3b82f6']}
          />
        </div>
      </ComponentPreview>
    </div>
  );
}
