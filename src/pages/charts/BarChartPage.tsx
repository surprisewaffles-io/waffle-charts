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
        <h3 className="font-semibold mb-4">Stacked Bar Chart</h3>
        <ComponentPreview
          title="Stacked Bar Chart"
          description="Stack multiple metrics on top of each other."
          code={BarChartSource}
        >
          <div className="h-[400px] w-full">
            <BarChart
              data={[
                { month: 'Jan', organic: 400, paid: 200, referral: 100 },
                { month: 'Feb', organic: 300, paid: 300, referral: 150 },
                { month: 'Mar', organic: 500, paid: 250, referral: 200 },
              ]}
              xKey="month"
              variant="stacked"
              keys={['organic', 'paid', 'referral']}
              colors={['#10b981', '#3b82f6', '#8b5cf6']}
            />
          </div>
        </ComponentPreview>
      </div>

      <div className="p-6 border rounded-lg shadow-sm">
        <h3 className="font-semibold mb-4">Grouped Bar Chart</h3>
        <ComponentPreview
          title="Grouped Bar Chart"
          description="Compare metrics side-by-side."
          code={BarChartSource}
        >
          <div className="h-[400px] w-full">
            <BarChart
              data={[
                { category: 'Product A', q1: 10, q2: 20, q3: 15 },
                { category: 'Product B', q1: 15, q2: 25, q3: 20 },
                { category: 'Product C', q1: 8, q2: 12, q3: 10 },
              ]}
              xKey="category"
              variant="grouped"
              keys={['q1', 'q2', 'q3']}
              colors={['#f59e0b', '#ec4899', '#6366f1']}
            />
          </div>
        </ComponentPreview>
      </div>
    </div>
  );
}
