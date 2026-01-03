import { WaffleChart } from '../../components/waffle/WaffleChart';
import { ChartLegend } from '../../components/waffle/ChartLegend';
import { ComponentPreview } from '../../components/ComponentPreview';
// @ts-ignore
import WaffleChartSource from '../../components/waffle/WaffleChart.tsx?raw';

const data = [
  { label: 'Completed', value: 65, color: '#3b82f6' },
  { label: 'In Progress', value: 25, color: '#f59e0b' },
  { label: 'Pending', value: 10, color: '#e5e7eb' },
];

const simpleData = [
  { label: 'Yes', value: 42, color: '#10b981' },
  { label: 'No', value: 18, color: '#ef4444' },
];

export function WaffleChartPage() {
  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Waffle Chart</h1>
        <p className="text-muted-foreground mt-2">
          A grid of cells representing proportions of a whole. Visualizes parts-to-whole relationships in a 10x10 (or custom) grid.
        </p>
      </div>

      <ComponentPreview
        title="Standard Waffle"
        description="A standard 10x10 grid showing task status distribution."
        code={WaffleChartSource}
      >
        <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
          <div className="h-[300px] w-[300px]">
            <WaffleChart
              data={data}
              valueKey="value"
              labelKey="label"
              colors={data.map(d => d.color)}
              gap={2}
              rounding={4}
            />
          </div>
          <ChartLegend
            payload={data.map(d => ({ label: d.label, color: d.color }))}
          />
        </div>
      </ComponentPreview>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 border rounded-lg shadow-sm">
          <h3 className="font-semibold mb-4">5x10 High Density</h3>
          <div className="h-[150px] w-full">
            <WaffleChart
              data={simpleData}
              valueKey="value"
              labelKey="label"
              rows={5}
              columns={20}
              total={100}
              colors={simpleData.map(d => d.color)}
              gap={1}
            />
          </div>
          <div className="mt-4 flex justify-center">
            <ChartLegend payload={simpleData} />
          </div>
        </div>

        <div className="p-6 border rounded-lg shadow-sm">
          <h3 className="font-semibold mb-4">Custom Rounding</h3>
          <div className="h-[200px] w-[200px] mx-auto">
            <WaffleChart
              data={[
                { name: 'A', val: 300 },
                { name: 'B', val: 150 },
                { name: 'C', val: 150 }
              ]}
              valueKey="val"
              labelKey="name"
              rows={5}
              columns={5}
              gap={4}
              rounding={15} // Circular cells
            />
          </div>
        </div>
      </div>
    </div>
  );
}
