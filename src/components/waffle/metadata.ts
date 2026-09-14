/**
 * Why: each chart declares its own `<Chart>Meta` next to the code it describes,
 * which keeps the two from drifting but gives a caller sixteen imports and no
 * way to ask "which charts show part-to-whole?". This module is the one import
 * that answers questions across the whole catalog (#10).
 *
 * What: `ComponentMetadata`, keyed by component name, plus the lookups that
 * read it. Every value is the literal object the component exports, so
 * `ComponentMetadata.BarChart.category` narrows to `'comparison'` rather than
 * widening to `string`.
 *
 * Importing this module pulls in all sixteen chart components. Import the
 * single `<Chart>Meta` directly when you need one chart's metadata and not the
 * catalog.
 *
 * Test: `src/components/waffle/__tests__/metadata.test.ts`
 */
import { AreaChartMeta } from './AreaChart';
import { BarChartMeta } from './BarChart';
import { BubbleChartMeta } from './BubbleChart';
import { CandlestickChartMeta } from './CandlestickChart';
import { ChordChartMeta } from './ChordChart';
import { CompositeChartMeta } from './CompositeChart';
import { FunnelChartMeta } from './FunnelChart';
import { HeatmapChartMeta } from './HeatmapChart';
import { LineChartMeta } from './LineChart';
import { PieChartMeta } from './PieChart';
import { RadarChartMeta } from './RadarChart';
import { RadialBarChartMeta } from './RadialBarChart';
import { SankeyChartMeta } from './SankeyChart';
import { ScatterChartMeta } from './ScatterChart';
import { TreemapChartMeta } from './TreemapChart';
import { WaffleChartMeta } from './WaffleChart';
import type { ChartCapability, ChartCategory, ChartComplexity } from './metadata-types';

export const ComponentMetadata = {
  AreaChart: AreaChartMeta,
  BarChart: BarChartMeta,
  BubbleChart: BubbleChartMeta,
  CandlestickChart: CandlestickChartMeta,
  ChordChart: ChordChartMeta,
  CompositeChart: CompositeChartMeta,
  FunnelChart: FunnelChartMeta,
  HeatmapChart: HeatmapChartMeta,
  LineChart: LineChartMeta,
  PieChart: PieChartMeta,
  RadarChart: RadarChartMeta,
  RadialBarChart: RadialBarChartMeta,
  SankeyChart: SankeyChartMeta,
  ScatterChart: ScatterChartMeta,
  TreemapChart: TreemapChartMeta,
  WaffleChart: WaffleChartMeta,
} as const;

export type AllComponentMetadata = typeof ComponentMetadata;

/** Every component name the catalog knows, e.g. `'BarChart'`. */
export type ComponentName = keyof AllComponentMetadata;

/** Names in catalog order, for iterating without `Object.keys`' widening. */
export const COMPONENT_NAMES = Object.keys(ComponentMetadata) as ComponentName[];

/**
 * Narrows an arbitrary string to a `ComponentName`. Reach for this before
 * indexing the catalog with a name that came from user input or a config file.
 */
export const isComponentName = (name: string): name is ComponentName =>
  Object.prototype.hasOwnProperty.call(ComponentMetadata, name);

/**
 * Looks up one component's metadata.
 *
 * The return type is the specific literal for that name, so
 * `getComponentMeta('PieChart').complexity` is `'simple'`, not `string`.
 */
export const getComponentMeta = <N extends ComponentName>(name: N): AllComponentMetadata[N] =>
  ComponentMetadata[name];

/** Component names in the given category. Empty when nothing matches. */
export const getComponentsByCategory = (category: ChartCategory): ComponentName[] =>
  COMPONENT_NAMES.filter(name => ComponentMetadata[name].category === category);

/** Component names tagged with the given capability. Empty when nothing matches. */
export const getComponentsByCapability = (capability: ChartCapability): ComponentName[] =>
  COMPONENT_NAMES.filter(name =>
    (ComponentMetadata[name].capabilities as readonly ChartCapability[]).includes(capability),
  );

/** Component names at the given complexity level. */
export const getComponentsByComplexity = (complexity: ChartComplexity): ComponentName[] =>
  COMPONENT_NAMES.filter(name => ComponentMetadata[name].complexity === complexity);

/**
 * Why: the commonest runtime question is not "which charts are categorical?"
 * but "I have 400 rows — what can draw them?". Answering it from the catalog
 * by hand means reading two fields on sixteen entries.
 *
 * What: component names whose row range covers `rowCount`, ordered by how much
 * headroom they leave, so the best fit comes first.
 */
export const getComponentsForRowCount = (rowCount: number): ComponentName[] =>
  COMPONENT_NAMES.filter(name => {
    const { minRows, maxRecommended } = ComponentMetadata[name].dataRequirements;
    return rowCount >= minRows && rowCount <= maxRecommended;
  }).sort(
    (a, b) =>
      ComponentMetadata[a].dataRequirements.maxRecommended -
      ComponentMetadata[b].dataRequirements.maxRecommended,
  );

export type {
  ChartAccessibility,
  ChartCapability,
  ChartCategory,
  ChartComplexity,
  ChartDataKind,
  ChartDataRequirements,
  ChartMetadata,
  ChartPerformance,
} from './metadata-types';

export {
  CHART_CAPABILITIES,
  CHART_CATEGORIES,
  CHART_COMPLEXITY_LEVELS,
  CHART_DATA_KINDS,
} from './metadata-types';
