import { PieChart } from '../../components/waffle/PieChart';
import { ComponentPreview } from '../../components/ComponentPreview';
// @ts-ignore
import PieChartSource from '../../components/waffle/PieChart.tsx?raw';

const data = [
  { label: 'Chrome', value: 400 },
  { label: 'Safari', value: 300 },
  { label: 'Firefox', value: 200 },
  { label: 'Edge', value: 100 },
];

export function PieChartPage() {
  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Pie & Donut Chart</h1>
        <p className="text-muted-foreground mt-2">Distribution charts showing proportions of a whole.</p>
      </div>

      <ComponentPreview
        title="Pie Variants"
        code={PieChartSource}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          <div className="flex flex-col items-center w-full h-[300px]">
            <h4 className="mb-4 text-sm font-medium">Basic Pie</h4>
            <PieChart
              data={data}
              valueKey="value"
              labelKey="label"
            />
          </div>
          <div className="flex flex-col items-center w-full h-[300px]">
            <h4 className="mb-4 text-sm font-medium">Donut</h4>
            <PieChart
              data={data}
              valueKey="value"
              labelKey="label"
              innerRadius={60}
              centerText={{ title: "1,000", subtitle: "Visitors" }}
              colors={['text-orange-500', 'text-yellow-500', 'text-lime-500', 'text-green-500']}
            />
          </div>
        </div>
      </ComponentPreview>
    </div>
  );
}
