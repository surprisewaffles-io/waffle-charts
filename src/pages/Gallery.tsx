import { Link } from 'react-router-dom';
import { BarChart } from '../components/waffle/BarChart';
import { LineChart } from '../components/waffle/LineChart';
import { PieChart } from '../components/waffle/PieChart';
import { AreaChart } from '../components/waffle/AreaChart';
import { RadarChart } from '../components/waffle/RadarChart';
import { ScatterChart } from '../components/waffle/ScatterChart';
import { HeatmapChart } from '../components/waffle/HeatmapChart';
import { TreemapChart } from '../components/waffle/TreemapChart';
import { BubbleChart } from '../components/waffle/BubbleChart';
import { SankeyChart } from '../components/waffle/SankeyChart';

const barData = [
  { letter: 'A', frequency: 0.08167 },
  { letter: 'B', frequency: 0.01492 },
  { letter: 'C', frequency: 0.02782 },
  { letter: 'D', frequency: 0.04253 },
  { letter: 'E', frequency: 0.12702 },
];

const dateData = [
  { date: new Date(2023, 0, 1), value: 30 },
  { date: new Date(2023, 1, 1), value: 45 },
  { date: new Date(2023, 2, 1), value: 35 },
  { date: new Date(2023, 3, 1), value: 80 },
  { date: new Date(2023, 4, 1), value: 50 },
];

const pieData = [
  { label: 'A', value: 25 },
  { label: 'B', value: 35 },
  { label: 'C', value: 20 },
  { label: 'D', value: 20 },
];

const radarData = [
  { angle: 'Math', r: 120 },
  { angle: 'Art', r: 80 },
  { angle: 'Science', r: 100 },
  { angle: 'History', r: 60 },
  { angle: 'Sports', r: 90 },
];

const scatterData = Array.from({ length: 20 }, () => ({
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 100,
}));

const heatmapData = Array.from({ length: 15 }, (_, i) => ({
  bin: i,
  bins: Array.from({ length: 8 }, (_, j) => ({
    bin: j,
    count: Math.floor(Math.random() * 50),
  })),
}));

const treemapData = {
  name: 'root',
  children: [
    { name: 'A', size: 100 },
    { name: 'B', size: 60 },
    { name: 'C', size: 40 },
    { name: 'D', size: 80 },
  ],
};

const bubbleData = Array.from({ length: 15 }, () => ({
  name: "item",
  x: Math.random() * 100,
  y: Math.random() * 100,
  z: Math.random() * 50 + 10,
}));

const charts = [
  { name: "Bar Chart", path: "/docs/bar-chart", component: <BarChart data={barData} width={300} height={200} xKey="letter" yKey="frequency" /> },
  { name: "Line Chart", path: "/docs/line-chart", component: <LineChart data={dateData} width={300} height={200} xKey="date" yKey="value" /> },
  { name: "Area Chart", path: "/docs/area-chart", component: <AreaChart data={dateData} width={300} height={200} xKey="date" keys={['value']} /> },
  { name: "Pie Chart", path: "/docs/pie-chart", component: <PieChart data={pieData} width={300} height={200} labelKey="label" valueKey="value" /> },
  { name: "Radar Chart", path: "/docs/radar-chart", component: <RadarChart data={radarData} width={300} height={200} angleKey="angle" radiusKey="r" /> },
  { name: "Scatter Plot", path: "/docs/scatter-chart", component: <ScatterChart data={scatterData} width={300} height={200} xKey="x" yKey="y" /> },
  { name: "Bubble Chart", path: "/docs/bubble-chart", component: <BubbleChart data={bubbleData} xKey="x" yKey="y" zKey="z" /> },
  { name: "Heatmap", path: "/docs/heatmap", component: <HeatmapChart data={heatmapData} colorRange={['#f1f5f9', '#0f172a']} /> },
  { name: "Treemap", path: "/docs/treemap", component: <TreemapChart data={treemapData} /> },
  {
    name: "Sankey", path: "/docs/sankey-chart", component: <SankeyChart data={
      // Simple sankey for gallery
      {
        nodes: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }],
        links: [
          { source: 0, target: 2, value: 50 },
          { source: 1, target: 2, value: 30 },
          { source: 2, target: 3, value: 80 }
        ]
      }
    } />
  },
];

export function GalleryPage() {
  return (
    <div className="space-y-10 pb-10">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Gallery</h1>
        <p className="text-xl text-muted-foreground">
          Browse all available components. Click to view documentation and code.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {charts.map((chart) => (
          <Link
            key={chart.name}
            to={chart.path}
            className="group relative rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/50 overflow-hidden"
          >
            <div className="p-6">
              <div className="w-full h-[200px] overflow-hidden pointer-events-none">
                {/* Provide a constrained container for responsive charts */}
                {chart.component}
              </div>
            </div>
            <div className="bg-muted/50 p-4 border-t group-hover:bg-muted/80 transition-colors">
              <h3 className="font-semibold tracking-tight">{chart.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
