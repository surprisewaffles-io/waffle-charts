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
}: SankeyChartContentProps) {
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Color Scale
  const colorScale = useMemo(
    () =>
      scaleOrdinal({
        domain: data.nodes.map((node) => node.name),
        range: colorScheme,
      }),
    [data, colorScheme]
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

  return (
    <div className={cn("relative font-sans", className)}>
      <svg ref={setRefs} width={width} height={height} className="overflow-visible">
        <Sankey
          root={data}
          size={[innerWidth, innerHeight]}
          nodeWidth={15}
          nodePadding={10}
          extent={[[margin.left, margin.top], [innerWidth + margin.left, innerHeight + margin.top]]}
        >
          {({ graph }) => (
            <Group>
              {/* Links */}
              {graph.links.map((link: any, i: number) => (
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
              {graph.nodes.map((node: any, i: number) => (
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

export const SankeyChart = (props: SankeyChartProps) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <SankeyChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  );
}
