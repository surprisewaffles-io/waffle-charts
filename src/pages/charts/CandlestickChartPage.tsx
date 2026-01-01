import { CandlestickChart } from '../../components/waffle/CandlestickChart';
import { ComponentPreview } from '../../components/ComponentPreview';
// @ts-ignore
import CandlestickChartSource from '../../components/waffle/CandlestickChart.tsx?raw';

const ohlcData = [
  { date: new Date('2024-01-01'), open: 150, high: 155, low: 148, close: 153 },
  // ... more data
  { date: new Date('2024-01-02'), open: 153, high: 158, low: 152, close: 157 },
  { date: new Date('2024-01-03'), open: 157, high: 160, low: 155, close: 155 },
  { date: new Date('2024-01-04'), open: 155, high: 157, low: 150, close: 152 },
  { date: new Date('2024-01-05'), open: 152, high: 159, low: 151, close: 158 },
  { date: new Date('2024-01-06'), open: 158, high: 162, low: 157, close: 161 },
  { date: new Date('2024-01-07'), open: 161, high: 165, low: 160, close: 163 },
  { date: new Date('2024-01-08'), open: 163, high: 163, low: 158, close: 159 },
  { date: new Date('2024-01-09'), open: 159, high: 162, low: 158, close: 160 },
  { date: new Date('2024-01-10'), open: 160, high: 165, low: 159, close: 164 },
];

export function CandlestickChartPage() {
  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Candlestick Chart</h1>
        <p className="text-muted-foreground mt-2">Visualizes financial data (Open, High, Low, Close) over time.</p>
      </div>

      <ComponentPreview
        title="Interactive Candlestick Chart"
        description="Standard financial chart with custom colors and tooltips."
        code={CandlestickChartSource}
      >
        <div className="h-[400px] w-full">
          <CandlestickChart
            data={ohlcData}
            xKey="date"
            openKey="open"
            highKey="high"
            lowKey="low"
            closeKey="close"
            yAxisLabel="Price ($)"
          />
        </div>
      </ComponentPreview>
    </div>
  );
}
