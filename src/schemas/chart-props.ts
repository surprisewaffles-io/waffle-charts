/**
 * Why: Twelve of the sixteen chart prop types are generic over their row type
 * (`BarChartProps<T>`), and a generic type has no JSON Schema — the generator
 * rejects it outright with `RootlessError: No root type found`. Runtime
 * validation needs one concrete, non-generic type per chart to generate from.
 *
 * What: Instantiates every generic prop type at {@link ChartDatum} and
 * re-exports the four already-concrete ones, so `scripts/generate-schemas.ts`
 * can point at this single file and find all sixteen names. Aliasing keeps the
 * exported name identical to the component's own (`BarChartProps`), which is
 * what keys the generated schema.
 *
 * Test: `chart-props instantiates all 16 chart prop types`
 */
import type { AreaChartProps as AreaChartPropsOf } from '../components/waffle/AreaChart';
import type { BarChartProps as BarChartPropsOf } from '../components/waffle/BarChart';
import type { BubbleChartProps as BubbleChartPropsOf } from '../components/waffle/BubbleChart';
import type { CandlestickChartProps as CandlestickChartPropsOf } from '../components/waffle/CandlestickChart';
import type { CompositeChartProps as CompositeChartPropsOf } from '../components/waffle/CompositeChart';
import type { FunnelChartProps as FunnelChartPropsOf } from '../components/waffle/FunnelChart';
import type { LineChartProps as LineChartPropsOf } from '../components/waffle/LineChart';
import type { PieChartProps as PieChartPropsOf } from '../components/waffle/PieChart';
import type { RadarChartProps as RadarChartPropsOf } from '../components/waffle/RadarChart';
import type { RadialBarChartProps as RadialBarChartPropsOf } from '../components/waffle/RadialBarChart';
import type { ScatterChartProps as ScatterChartPropsOf } from '../components/waffle/ScatterChart';
import type { WaffleChartProps as WaffleChartPropsOf } from '../components/waffle/WaffleChart';

/**
 * The row shape the generic charts are instantiated at. An open record is the
 * widest type that still resolves `keyof T` to `string`, so a generated schema
 * accepts any caller's row type rather than one sample's fields.
 */
export type ChartDatum = Record<string, unknown>;

export type AreaChartProps = AreaChartPropsOf<ChartDatum>;
export type BarChartProps = BarChartPropsOf<ChartDatum>;
export type BubbleChartProps = BubbleChartPropsOf<ChartDatum>;
export type CandlestickChartProps = CandlestickChartPropsOf<ChartDatum>;
export type CompositeChartProps = CompositeChartPropsOf<ChartDatum>;
export type FunnelChartProps = FunnelChartPropsOf<ChartDatum>;
export type LineChartProps = LineChartPropsOf<ChartDatum>;
export type PieChartProps = PieChartPropsOf<ChartDatum>;
export type RadarChartProps = RadarChartPropsOf<ChartDatum>;
export type RadialBarChartProps = RadialBarChartPropsOf<ChartDatum>;
export type ScatterChartProps = ScatterChartPropsOf<ChartDatum>;
export type WaffleChartProps = WaffleChartPropsOf<ChartDatum>;

// Already concrete — re-exported here so the generator has one entry point.
export type { ChordChartProps } from '../components/waffle/ChordChart';
export type { HeatmapChartProps } from '../components/waffle/HeatmapChart';
export type { SankeyChartProps } from '../components/waffle/SankeyChart';
export type { TreemapChartProps } from '../components/waffle/TreemapChart';
