import { StatCard } from '../../components/waffle/StatCard';
import { ComponentPreview } from '../../components/ComponentPreview';
// @ts-ignore
import StatCardSource from '../../components/waffle/StatCard.tsx?raw';

export function StatCardPage() {
  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Stat Card</h1>
        <p className="text-muted-foreground mt-2">Display single metrics with optional trends and icons.</p>
      </div>

      <ComponentPreview
        title="Default Card"
        description="A standard statistic card with label, value, and description."
        code={StatCardSource}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="h-[120px]">
            <StatCard
              label="Total Revenue"
              value="$45,231.89"
              description="+20.1% from last month"
              icon="dollar"
              trend={{ value: 20.1, direction: 'up' }}
            />
          </div>
          <div className="h-[120px]">
            <StatCard
              label="Active Users"
              value="2,350"
              description="-1.2% from last week"
              icon="users"
              trend={{ value: 1.2, direction: 'down' }}
            />
          </div>
          <div className="h-[120px]">
            <StatCard
              label="Conversion Rate"
              value="3.2%"
              description="No change"
              icon="percent"
              trend={{ value: 0, direction: 'neutral' }}
            />
          </div>
        </div>
      </ComponentPreview>

      <div className="p-6 border rounded-lg shadow-sm">
        <h3 className="font-semibold mb-4">Without Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-[120px] w-full">
            <StatCard
              label="Simple Metric"
              value="8,543"
              icon="activity"
            />
          </div>
          <div className="h-[120px] w-full">
            <StatCard
              label="Another Metric"
              value="98.5%"
              className="bg-muted/50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
