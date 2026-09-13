import { Group } from '@visx/group';
import { Sankey } from '@visx/sankey';
import { scaleOrdinal } from '@visx/scale';
import { useTooltip, useTooltipInPortal, defaultStyles } from '@visx/tooltip';
import { ParentSize } from '@visx/responsive';
import { cn } from '../../lib/utils'; // Adjust path if needed
import React, { useMemo } from 'react';

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

export type SankeyChartProps = {
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
 */
type LaidOutLink = {
  path?: string;
  width?: number;
  value: number;
  source: { name: string };
  target: { name: string };
};

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

  // Merge refs (containerRef from visx needs to be called with the element)
  const setRefs = (node: SVGSVGElement | null) => {
    containerRef(node);
    svgRef.current = node;
  };

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
      <svg ref={setRefs} width={width} height={height} className="overflow-visible">
        <Sankey
          root={graphData}
          size={[innerWidth, innerHeight]}
          nodeWidth={15}
          nodePadding={10}
          extent={[[margin.left, margin.top], [innerWidth + margin.left, innerHeight + margin.top]]}
        >
          {({ graph }) => (
            <Group>
              {/* Links */}
              {(graph.links as unknown as LaidOutLink[]).map((link, i) => (
                <path
                  key={`link-${i}`}
                  d={link.path || ''}
                  stroke="currentColor"
                  strokeOpacity={0.2}
                  fill="none"
                  strokeWidth={Math.max(1, link.width || 0)}
                  className="text-foreground transition-opacity duration-200 hover:stroke-opacity-50"
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
          )}
        </Sankey>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          top={tooltipTop}
          left={tooltipLeft}
          style={{ ...defaultStyles, padding: 0, borderRadius: 0, boxShadow: 'none', background: 'transparent' }}
        >
          <div className="rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
            <span className="font-semibold block">{tooltipData.name}</span>
            <span className="text-xs text-muted-foreground">Value: {tooltipData.value}</span>
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export const SankeyChart = (props: SankeyChartProps) => {
  return (
    <div className="w-full h-[400px]">
      <ParentSize>
        {({ width, height }) => <SankeyChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  );
}
