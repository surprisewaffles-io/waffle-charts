import { Link, Outlet, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { ModeToggle } from '../components/mode-toggle';

const sidebarItems = [
  { title: "Introduction", path: "/" },
  { title: "Gallery", path: "/gallery" },
  { title: "Bar Chart", path: "/docs/bar-chart" },
  { title: "Line Chart", path: "/docs/line-chart" },
  { title: "Pie Chart", path: "/docs/pie-chart" },
  { title: "Area Chart", path: "/docs/area-chart" },
  { title: "Radar Chart", path: "/docs/radar-chart" },
  { title: "Scatter Plot", path: "/docs/scatter-chart" },
  { title: "Heatmap", path: "/docs/heatmap" },
  { title: "Treemap", path: "/docs/treemap" },
  { title: "Sankey Diagram", path: "/docs/sankey-chart" },
  { title: "Composite Chart", path: "/docs/composite-chart" },
  { title: "Chord Diagram", path: "/docs/chord-chart" },
  { title: "Bubble Chart", path: "/docs/bubble-chart" },
  { title: "Candlestick Chart", path: "/docs/candlestick-chart" },
  { title: "Stat Card", path: "/docs/stat-card" },
  { title: "Funnel Chart", path: "/docs/funnel-chart" },
  { title: "Radial Bar Chart", path: "/docs/radial-bar-chart" },
  { title: 'Waffle Chart', path: '/docs/waffle-chart' },
];

export function DocsLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r bg-card p-6 md:min-h-screen flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">WaffleCharts</h1>
          <p className="text-sm text-muted-foreground">Visx + Shadcn</p>
        </div>
        <nav className="space-y-1 flex-1">
          {sidebarItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                location.pathname === item.path
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-6 border-t">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Theme</span>
            <ModeToggle />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="mx-auto max-w-4xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
