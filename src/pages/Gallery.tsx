import { Link } from 'react-router-dom';
import { BarChart } from '../components/waffle/BarChart';
import { CandlestickChart } from '../components/waffle/CandlestickChart';
import { LineChart } from '../components/waffle/LineChart';
import { PieChart } from '../components/waffle/PieChart';
import { AreaChart } from '../components/waffle/AreaChart';
import { RadarChart } from '../components/waffle/RadarChart';
import { ScatterChart } from '../components/waffle/ScatterChart';
import { HeatmapChart } from '../components/waffle/HeatmapChart';
import { TreemapChart } from '../components/waffle/TreemapChart';
import { BubbleChart } from '../components/waffle/BubbleChart';
import { SankeyChart } from '../components/waffle/SankeyChart';
import { CompositeChart } from '../components/waffle/CompositeChart';
import { ChordChart } from '../components/waffle/ChordChart';
import { StatCard } from '../components/waffle/StatCard';
import { FunnelChart } from '../components/waffle/FunnelChart';
import { RadialBarChart } from '../components/waffle/RadialBarChart';

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

// Sample Data for Candlestick
const candleData = [
  { date: new Date('2024-01-01'), open: 150, high: 155, low: 148, close: 153 },
  { date: new Date('2024-01-02'), open: 153, high: 158, low: 152, close: 157 },
  { date: new Date('2024-01-03'), open: 157, high: 160, low: 155, close: 155 }, // Bearish
  { date: new Date('2024-01-04'), open: 155, high: 157, low: 150, close: 152 }, // Bearish
  { date: new Date('2024-01-05'), open: 152, high: 159, low: 151, close: 158 }, // Bullish
  { date: new Date('2024-01-06'), open: 158, high: 162, low: 157, close: 161 },
  { date: new Date('2024-01-07'), open: 161, high: 165, low: 160, close: 163 },
  { date: new Date('2024-01-08'), open: 163, high: 163, low: 158, close: 159 }, // Bearish
];

const charts = [
  { name: "Bar Chart", path: "/docs/bar-chart", tags: ["Comparison", "Distribution"], component: <BarChart data={barData} width={300} height={200} xKey="letter" yKey="frequency" /> },
  {
    name: "Candlestick Chart", path: "/docs/candlestick-chart", tags: ["Financial", "Time-Series"], component: <CandlestickChart
      data={candleData}
      width={300}
      height={200}
      xKey="date"
      openKey="open"
      highKey="high"
      lowKey="low"
      closeKey="close"
    />
  },
  { name: "Line Chart", path: "/docs/line-chart", tags: ["Trend", "Time-Series"], component: <LineChart data={dateData} width={300} height={200} xKey="date" yKey="value" /> },
  { name: "Area Chart", path: "/docs/area-chart", tags: ["Trend", "Volume"], component: <AreaChart data={dateData} width={300} height={200} xKey="date" keys={['value']} /> },
  { name: "Pie Chart", path: "/docs/pie-chart", tags: ["Proportion"], component: <PieChart data={pieData} width={300} height={200} labelKey="label" valueKey="value" /> },
  { name: "Radar Chart", path: "/docs/radar-chart", tags: ["Comparison", "Multivariate"], component: <RadarChart data={radarData} width={300} height={200} angleKey="angle" radiusKey="r" /> },
  { name: "Scatter Plot", path: "/docs/scatter-chart", tags: ["Correlation", "Distribution"], component: <ScatterChart data={scatterData} width={300} height={200} xKey="x" yKey="y" /> },
  { name: "Bubble Chart", path: "/docs/bubble-chart", tags: ["Correlation", "Multivariate"], component: <BubbleChart data={bubbleData} xKey="x" yKey="y" zKey="z" /> },
  { name: "Heatmap", path: "/docs/heatmap", tags: ["Distribution", "Density"], component: <HeatmapChart data={heatmapData} colorRange={['#fbe7f3', '#a855f7']} /> },
  { name: "Treemap", path: "/docs/treemap", tags: ["Hierarchy", "Proportion"], component: <TreemapChart data={treemapData} /> },
  {
    name: "Sankey", path: "/docs/sankey-chart", tags: ["Flow", "Process"], component: <SankeyChart data={
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
  {
    name: "Composite", path: "/docs/composite-chart", tags: ["Comparison", "Trend", "Dual-Axis"], component: <CompositeChart
      data={[
        { m: 'A', v: 400, l: 15 }, { m: 'B', v: 300, l: 30 }, { m: 'C', v: 500, l: 25 },
        { m: 'D', v: 200, l: 10 }, { m: 'E', v: 450, l: 40 }
      ]}
      xKey="m" barKey="v" lineKey="l"
    />
  },
  {
    name: "Chord", path: "/docs/chord-chart", tags: ["Flow", "Relationship"], component: <ChordChart
      data={[
        [1197, 587, 891],
        [195, 1004, 206],
        [801, 1614, 809],
      ]}
      keys={['A', 'B', 'C']}
    />
  },

  {
    name: "Stat Card", path: "/docs/stat-card", tags: ["KPI", "UI", "Metric"], component: <StatCard
      label="Total Revenue"
      value="$12,345"
      description="+15% vs last month"
      icon="dollar"
      trend={{ value: 15, direction: 'up' }}
    />
  },
  {
    name: "Funnel Chart", path: "/docs/funnel-chart", tags: ["Process", "Conversion"], component: <FunnelChart
      data={[
        { step: 'A', value: 100 },
        { step: 'B', value: 80 },
        { step: 'C', value: 50 },
        { step: 'D', value: 20 },
      ]}
      width={300} height={200}
      stepKey="step" valueKey="value"
    />
  },
  {
    name: "Radial Bar", path: "/docs/radial-bar-chart", tags: ["Comparison", "Circular"], component: <RadialBarChart
      data={[
        { name: 'A', value: 80, fill: '#3b82f6' },
        { name: 'B', value: 50, fill: '#10b981' },
      ]}
      width={300} height={200}
      valueKey="value" labelKey="name"
    />
  },
];

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

export function GalleryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    charts.forEach(c => c.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, []);

  const filteredCharts = charts.filter(chart => {
    const matchesSearch = chart.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag ? chart.tags?.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Gallery</h1>
        <p className="text-xl text-muted-foreground">
          Browse all available components. Click to view documentation and code.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search charts..."
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pl-9 md:w-[300px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag(null)}
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${selectedTag === null
              ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/80"
              : "text-foreground hover:bg-muted"
              }`}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${selectedTag === tag
                ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/80"
                : "text-foreground hover:bg-muted"
                }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCharts.map((chart) => (
          <Link
            key={chart.name}
            to={chart.path}
            className="group relative rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/50 overflow-hidden flex flex-col"
          >
            <div className="p-6 flex-1">
              <div className="w-full h-[200px] overflow-hidden pointer-events-none">
                {/* Provide a constrained container for responsive charts */}
                {chart.component}
              </div>
            </div>
            <div className="bg-muted/30 p-4 border-t group-hover:bg-muted/60 transition-colors flex justify-between items-center">
              <div>
                <h3 className="font-semibold tracking-tight">{chart.name}</h3>
                <div className="flex gap-1 mt-1">
                  {chart.tags?.map(t => (
                    <span key={t} className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded-full bg-background border">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
        {filteredCharts.length === 0 && (
          <div className="col-span-full text-center py-20 text-muted-foreground">
            No charts found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
