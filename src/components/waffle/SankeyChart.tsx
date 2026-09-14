import { Group } from '@visx/group';
import { Sankey } from '@visx/sankey';
import { memoChart } from './memo';
import { scaleOrdinal } from '@visx/scale';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { ParentSize } from '@visx/responsive';
import { cn } from '../../lib/utils'; // Adjust path if needed
import { ChartA11yLayer, ChartSvgDescription } from './ChartA11y';
import {
  dataPointFocusProps,
  useChartA11y,
  type ChartA11yProps,
} from '../../lib/chart-a11y';
import {
  CHART_A11Y_BASELINE,
  MEMOIZED_PERFORMANCE,
  type ChartMetadata,
} from './metadata-types';
import React, { useId, useMemo } from 'react';

// Types for your Sankey data
export type SankeyNode = {
  name: string;
  index?: number; // Added by Visx
};

export type SankeyLink = {
  source: number;
  target: number;
  value: number;
};

export type SankeyData = {
  nodes: SankeyNode[];
  links: SankeyLink[];
};

export type SankeyChartProps = ChartA11yProps & {
  data: SankeyData;
  width?: number;
  height?: number;
  className?: string;
  colorScheme?: string[];
  /** Rendered in place of the chart when `data` holds no drawable graph. */
  emptyMessage?: string;
};

/**
 * The subset of a laid-out d3-sankey link this chart reads. d3-sankey's own
 * link type describes the graph *before* layout, where `source`/`target` are
 * still plain indices and the geometry is absent, so the rendered arrays are
 * read through these shapes instead.
 *
 * Note there is no `path` here: d3-sankey computes each link's `width` and
 * endpoint coordinates but never a path string. The ribbon's `d` comes from
 * `createPath` below. (#19)
 *
 * `source.x1` and `target.x0` are the ribbon's two attachment edges. They span
 * the gradient below, so the fade lines up with the ribbon rather than with the
 * whole chart.
 */
type LaidOutLink = {
  width?: number;
  value: number;
  source: { name: string; x1: number };
  target: { name: string; x0: number };
};

/**
 * `sankeyLinkHorizontal()` as the `Sankey` render prop hands it over: it maps a
 * laid-out link to the ribbon's `d`, returning null when the layout left an
 * endpoint without coordinates.
 */
type LinkPathBuilder = (link: LaidOutLink) => string | null;

/**
 * Resolves a link endpoint to a node index. A caller supplies an index, but a
 * graph that d3-sankey has already laid out carries the node object instead.
 */
const endpointIndex = (endpoint: unknown): number => {
  if (typeof endpoint === 'number') return Number.isInteger(endpoint) ? endpoint : -1;
  if (endpoint && typeof endpoint === 'object') {
    const index = (endpoint as { index?: unknown }).index;
    return typeof index === 'number' && Number.isInteger(index) ? index : -1;
  }
  return -1;
};

/** The subset of a laid-out d3-sankey node this chart reads. */
type LaidOutNode = {
  name: string;
  value: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
};

type SankeyChartContentProps = SankeyChartProps & {
  width: number;
  height: number;
};

function SankeyChartContent({
  data,
  width,
  height,
  className,
  colorScheme = ['#a855f7', '#ec4899', '#3b82f6', '#14b8a6', '#f59e0b', '#ef4444'], // Default diverse palette
  emptyMessage = 'No data to display',
  ariaLabel,
  ariaDescribedby,
  title,
  description,
  keyboardNavigable,
}: SankeyChartContentProps) {
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Every hook below runs unconditionally. The graph is normalised here rather
  // than guarded with an early return, because an early return placed above
  // these hooks changes the hook count between renders.
  //
  // The copies matter: d3-sankey rewrites each link's `source`/`target` from an
  // index to the node object in place, so laying out the caller's own array
  // would corrupt it and make the next render read object endpoints where it
  // expects indices. endpointIndex accepts either form for that reason, and a
  // link pointing at a node that does not exist is dropped — d3-sankey throws
  // on those.
  const graphData = useMemo<SankeyData>(() => {
    const sourceNodes = Array.isArray(data?.nodes) ? data.nodes : [];
    const sourceLinks = Array.isArray(data?.links) ? data.links : [];
    const nodes = sourceNodes.map(node => ({ ...node }));

    const links = sourceLinks
      .map(link => ({
        source: endpointIndex(link?.source),
        target: endpointIndex(link?.target),
        value: Number(link?.value),
      }))
      .filter(
        link =>
          link.source >= 0 &&
          link.source < nodes.length &&
          link.target >= 0 &&
          link.target < nodes.length &&
          Number.isFinite(link.value),
      );

    return { nodes, links };
  }, [data]);

  // Color Scale
  const colorScale = useMemo(
    () =>
      scaleOrdinal({
        domain: graphData.nodes.map((node) => node.name),
        range: colorScheme,
      }),
    [graphData, colorScheme]
  );

  // Tooltip
  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    hideTooltip,
    showTooltip,
  } = useTooltip<{ name: string; value: number }>();

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
  });

  /* Use a separate ref for measuring the SVG position if needed for relative tooltip calculations */
  const svgRef = React.useRef<SVGSVGElement>(null);

  // Gradient ids must be unique per mounted chart: two Sankeys on one page
  // would otherwise define `sankey-gradient-0` twice, and every reference in
  // the document resolves to whichever definition the browser saw first.
  // useId embeds ':' delimiters, which querySelector and CSS selectors reject,
  // so they are stripped — the instance counter inside carries the uniqueness.
  const gradientPrefix = `sankey-gradient-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  // Merge refs (containerRef from visx needs to be called with the element)
  const setRefs = (node: SVGSVGElement | null) => {
    containerRef(node);
    svgRef.current = node;
  };

  // d3-sankey sizes a node by the larger of what flows in and what flows out.
  // Recomputing it here rather than reading the laid-out graph keeps the
  // description available before the layout render prop runs.
  const nodeSummaries = useMemo(
    () =>
      graphData.nodes.map((node, index) => {
        const incoming = graphData.links
          .filter(link => link.target === index)
          .reduce((sum, link) => sum + link.value, 0);
        const outgoing = graphData.links
          .filter(link => link.source === index)
          .reduce((sum, link) => sum + link.value, 0);
        return { name: node.name, value: Math.max(incoming, outgoing), incoming, outgoing };
      }),
    [graphData],
  );

  const a11yValues = useMemo(() => nodeSummaries.map(node => node.value), [nodeSummaries]);

  const a11y = useChartA11y({
    chartType: 'Sankey diagram',
    itemCount: nodeSummaries.length,
    itemNoun: 'node',
    values: a11yValues,
    detail: `${graphData.links.length} links connect the nodes.`,
    describeItem: index => {
      const node = nodeSummaries[index];
      return node
        ? `${node.name}: ${node.value} in total, ${node.incoming} in, ${node.outgoing} out`
        : '';
    },
    ariaLabel,
    ariaDescribedby,
    title,
    description,
    keyboardNavigable,
  });

  const tableRows = useMemo(
    () => nodeSummaries.map(node => [node.name, node.value, node.incoming, node.outgoing]),
    [nodeSummaries],
  );

  if (width < 50) return null;

  // Guards sit below every hook so the hook count never varies between renders.
  if (graphData.nodes.length === 0 || graphData.links.length === 0) {
    return (
      <div
        role="status"
        className={cn(
          "flex items-center justify-center text-sm text-muted-foreground",
          className,
        )}
        style={{ width, height }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("relative font-sans", className)}>
      <svg
        {...a11y.svgProps}
        ref={setRefs}
        width={width}
        height={height}
        className={cn('overflow-visible', a11y.svgProps.className)}
      >
        <ChartSvgDescription
          titleId={a11y.titleId}
          descId={a11y.descId}
          title={a11y.resolvedTitle}
          description={a11y.resolvedDescription}
        />
        {/* `extent` carries the margins; a `size` prop would override it,
            because visx applies size after extent and size resets the origin
            to [0,0]. Pass only one of the two. (#19) */}
        <Sankey
          root={graphData}
          nodeWidth={15}
          nodePadding={10}
          extent={[[margin.left, margin.top], [innerWidth + margin.left, innerHeight + margin.top]]}
        >
          {({ graph, createPath }) => {
            const buildPath = createPath as unknown as LinkPathBuilder;
            const links = graph.links as unknown as LaidOutLink[];
            return (
            <Group>
              {/* One gradient per ribbon, fading the source node's colour into
                  the target's so a flow reads as leaving one column and
                  arriving at the next.

                  userSpaceOnUse anchors the gradient to the ribbon's own
                  attachment edges. The default (objectBoundingBox) would
                  measure the path's fill box, which ignores stroke width and
                  collapses to zero height on a perfectly straight ribbon. */}
              <defs>
                {links.map((link, i) => (
                  <linearGradient
                    key={`link-gradient-${i}`}
                    id={`${gradientPrefix}-${i}`}
                    gradientUnits="userSpaceOnUse"
                    x1={link.source.x1}
                    x2={link.target.x0}
                    y1={0}
                    y2={0}
                  >
                    <stop offset="0%" stopColor={colorScale(link.source.name)} />
                    <stop offset="100%" stopColor={colorScale(link.target.name)} />
                  </linearGradient>
                ))}
              </defs>

              {/* Links */}
              {links.map((link, i) => (
                <path
                  key={`link-${i}`}
                  d={buildPath(link) ?? ''}
                  stroke={`url(#${gradientPrefix}-${i})`}
                  strokeOpacity={0.2}
                  fill="none"
                  strokeWidth={Math.max(1, link.width || 0)}
                  className="transition-[stroke-opacity] duration-200 hover:[stroke-opacity:0.5]"
                  onMouseEnter={(event) => {
                    const containerRect = svgRef.current?.getBoundingClientRect();
                    const containerLeft = containerRect?.left || 0;
                    const containerTop = containerRect?.top || 0;

                    showTooltip({
                      tooltipData: {
                        name: `${link.source.name} → ${link.target.name}`,
                        value: link.value
                      },
                      tooltipLeft: event.clientX - containerLeft,
                      tooltipTop: event.clientY - containerTop,
                    });
                  }}
                  onMouseLeave={() => hideTooltip()}
                />
              ))}

              {/* Nodes */}
              {(graph.nodes as unknown as LaidOutNode[]).map((node, i) => (
                <Group key={`node-${i}`} top={node.y0} left={node.x0}>
                  <rect
                    width={Math.max(0, node.x1 - node.x0)}
                    height={Math.max(0, node.y1 - node.y0)}
                    fill={colorScale(node.name)}
                    opacity={0.8}
                    rx={2}
                    className="transition-all duration-200 hover:opacity-100 cursor-pointer stroke-background"
                    strokeWidth={0}
                    {...dataPointFocusProps(a11y.focusedIndex === i)}
                    onMouseEnter={() => {
                      showTooltip({
                        tooltipData: { name: node.name, value: node.value },
                        tooltipLeft: node.x1 + margin.left,
                        tooltipTop: node.y0 + margin.top + (node.y1 - node.y0) / 2,
                      });
                    }}
                    onMouseLeave={() => hideTooltip()}
                  />
                  {/* Node Label (only if tall enough) */}
                  {(node.y1 - node.y0) > 12 && (
                    <text
                      x={node.x0 < width / 2 ? (node.x1 - node.x0) + 6 : -6}
                      y={(node.y1 - node.y0) / 2}
                      dy=".35em"
                      fontSize={10} // Reduced base font size
                      textAnchor={node.x0 < width / 2 ? 'start' : 'end'}
                      className="fill-foreground font-medium pointer-events-none select-none"
                    >
                      {node.name}
                    </text>
                  )}
                </Group>
              ))}
            </Group>
            );
          }}
        </Sankey>
      </svg>
      <ChartA11yLayer
        a11y={a11y}
        columns={['Node', 'Total', 'Incoming', 'Outgoing']}
        rows={tableRows}
      />
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={{ ...defaultStyles, padding: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent', zIndex: 100 }}
        >
          <div className="rounded-md border bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xl">
            <span className="font-semibold block">{tooltipData.name}</span>
            <span className="text-xs text-muted-foreground">Value: {tooltipData.value}</span>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

const SankeyChartRoot = (props: SankeyChartProps) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <SankeyChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  );
}

/** Memoised so a parent re-render with unchanged props skips the sankey layout
 *  below. See `./memo` for what "unchanged" means. (#3) */
export const SankeyChart = memoChart(SankeyChartRoot);

/** Machine-readable description of this chart, for agents and validation. (#10) */
export const SankeyChartMeta = {
  name: 'SankeyChart',
  category: 'flow',
  description:
    'Nodes in columns joined by ribbons whose thickness is the quantity moving between them, for tracing where a total splits and recombines.',
  dataRequirements: {
    minRows: 2,
    maxRecommended: 40,
    kind: 'graph',
    shape: '{ nodes: Array<{ name: string }>; links: Array<{ source: number; target: number; value: number }> }',
    requiredFields: ['nodes', 'links'],
    fixedFieldNames: true,
    requiredProps: ['data'],
    optionalProps: ['colorScheme', 'className', 'emptyMessage'],
    notes:
      '`source` and `target` are indices into `nodes`, not names. The graph must be acyclic — a cycle makes the layout fail to converge.',
  },
  capabilities: ['responsive', 'tooltip', 'empty-state', 'custom-colors'],
  complexity: 'complex',
  accessibility: CHART_A11Y_BASELINE,
  performance: MEMOIZED_PERFORMANCE,
} as const satisfies ChartMetadata;

export type SankeyChartMetadata = typeof SankeyChartMeta;
