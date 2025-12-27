import { RadarChart } from '../../components/waffle/RadarChart';
import { ComponentPreview } from '../../components/ComponentPreview';
// @ts-ignore
import RadarChartSource from '../../components/waffle/RadarChart.tsx?raw';

const data = [
  { subject: 'Math', A: 120, fullMark: 150 },
  { subject: 'Chinese', A: 98, fullMark: 150 },
  { subject: 'English', A: 86, fullMark: 150 },
  { subject: 'Geography', A: 99, fullMark: 150 },
  { subject: 'Physics', A: 85, fullMark: 150 },
  { subject: 'History', A: 65, fullMark: 150 },
];

export function RadarChartPage() {
  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Radar Chart</h1>
        <p className="text-muted-foreground mt-2">Spider chart for displaying multivariate data.</p>
      </div>

      <ComponentPreview
        title="Student Marks"
        code={RadarChartSource}
      >
        <div className="h-[400px] w-full">
          <RadarChart
            data={data}
            radiusKey="A"
            angleKey="subject"
          />
        </div>
      </ComponentPreview>
    </div>
  );
}
