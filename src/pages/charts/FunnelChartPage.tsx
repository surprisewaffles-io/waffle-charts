import { FunnelChart } from '../../components/waffle/FunnelChart';
import { ComponentPreview } from '../../components/ComponentPreview';
// @ts-ignore
import FunnelChartSource from '../../components/waffle/FunnelChart.tsx?raw';

const data = [
  { step: 'Awareness', count: 5000 },
  { step: 'Interest', count: 3500 },
  { step: 'Consideration', count: 2000 },
  { step: 'Intent', count: 1200 },
  { step: 'Purchase', count: 800 },
];

export function FunnelChartPage() {
  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Funnel Chart</h1>
        <p className="text-muted-foreground mt-2">Visualizes the flow and drop-off between stages in a process.</p>
      </div>

      <ComponentPreview
        title="Standard Funnel"
        description="A standard funnel visualization showing decreasing values."
        code={FunnelChartSource}
      >
        <div className="h-[400px] w-full">
          <FunnelChart
            data={data}
            stepKey="step"
            valueKey="count"
          />
        </div>
      </ComponentPreview>
    </div>
  );
}
