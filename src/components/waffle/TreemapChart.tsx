import { Group } from '@visx/group';
import {
  Treemap,
  hierarchy,
  treemapSquarify,
  treemapBinary,
  treemapDice,
  treemapSlice,
  treemapSliceDice,
  treemapResquarify
} from '@visx/hierarchy';
import { ParentSize } from '@visx/responsive';
import { cn } from '../../lib/utils';
import { ChartA11yLayer, ChartSvgDescription } from './ChartA11y';
import {
  dataPointFocusProps,
  useChartA11y,
  type ChartA11yProps,
} from '../../lib/chart-a11y';
import { useMemo } from 'react';

// Types
export type TreemapData = {
  name: string;
  size?: number; // Leaf nodes have size
  parent?: string; // For explicit parent-child (optional if using nested structure)
  children?: TreemapData[];
};

const tileMethods = {
  binary: treemapBinary,
  squarify: treemapSquarify,
  resquarify: treemapResquarify,
  slice: treemapSlice,
  dice: treemapDice,
  sliceDice: treemapSliceDice,
};

export type TreemapChartProps = ChartA11yProps & {
  data: TreemapData; // Root node
  width?: number;
  height?: number;
  className?: string;
  tileMethod?: keyof typeof tileMethods;
  background?: string;
  colorScheme?: string[];
  /** Rendered in place of the chart when `data` holds no sized nodes. */
  emptyMessage?: string;
};

type TreemapChartContentProps = TreemapChartProps & {
  width: number;
  height: number;
};

function TreemapChartContent({
  data,
  width,
  height,
  className,
  background = "fill-background",
  tileMethod = "squarify",
  colorScheme = ['#a855f7', '#ec4899', '#3b82f6', '#14b8a6', '#f59e0b', '#ef4444'],
  emptyMessage = 'No data to display',
  ariaLabel,
  ariaDescribedby,
  title,
  description,
  keyboardNavigable,
}: TreemapChartContentProps) {

  // Every hook below runs unconditionally. `hierarchy(undefined)` throws, so
  // the root is normalised here rather than with an early return above the
  // hooks, which would change the hook count between renders.
  const safeData = useMemo<TreemapData>(
    () => (data && typeof data === 'object' ? data : { name: '', children: [] }),
    [data],
  );

  const root = useMemo(() => {
    // If data is already a hierarchy tree
    const rootHierarchy = hierarchy(safeData)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Sum values for layout
    return rootHierarchy.sum((d) => (Number.isFinite(Number(d.size)) ? Number(d.size) : 0));
  }, [safeData]);

  const tile = tileMethods[tileMethod] || treemapSquarify;

  // `descendants()` puts the root first and the root is the only depth-0 node,
  // so a node's position among the drawn nodes is its descendant index minus
  // one. That identity is what lets the render loop below map its own index
  // onto these rows without a second traversal.
  const a11yNodes = useMemo(() => root.descendants().filter(node => node.depth > 0), [root]);

  const a11yValues = useMemo(() => a11yNodes.map(node => node.value ?? 0), [a11yNodes]);

  const a11y = useChartA11y({
    chartType: 'Treemap',
    itemCount: a11yNodes.length,
    itemNoun: 'node',
    values: a11yValues,
    detail: `Total ${root.value ?? 0}.`,
    describeItem: index => {
      const node = a11yNodes[index];
      if (!node) return '';
      const share = root.value ? Math.round(((node.value ?? 0) / root.value) * 100) : 0;
      return `${node.data.name}: ${node.value ?? 0}, ${share} percent of the total`;
    },
    ariaLabel,
    ariaDescribedby,
    title,
    description,
    keyboardNavigable,
  });

  const tableRows = useMemo(
    () =>
      a11yNodes.map(node => [
        node.data.name,
        node.value ?? 0,
        node.parent?.data.name ?? root.data.name,
      ]),
    [a11yNodes, root],
  );

  if (width < 10) return null;

  // Guards sit below every hook so the hook count never varies between renders.
  // A root that sums to nothing has no rectangles to lay out.
  if (!root.value) {
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
    <div className={cn("relative", className)}>
      <svg
        {...a11y.svgProps}
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
        <rect width={width} height={height} rx={14} className={background} />
        <Treemap<TreemapData>
          top={0}
          left={0}
          root={root}
          size={[width, height]}
          tile={tile}
          round
        >
          {treemap => {
            // @visx/hierarchy Treemap passes the root node of the layout as the argument
            const nodes = treemap.descendants();

            return (
              <Group>
                {nodes.map((node, i) => {
                  const width = node.x1 - node.x0;
                  const height = node.y1 - node.y0;
                  // Skip root if we want, or render it as background. usually we skip root rect or render it transparent
                  if (node.depth === 0) return null;

                  // Determine color
                  // Cycle through colorScheme based on parent index (to group children) or index
                  // Use depth 1 parent index if available for grouping
                  const colorIndex = node.depth === 1 ? i : (node.parent?.data.name.charCodeAt(0) || i);
                  const color = colorScheme[colorIndex % colorScheme.length];
                  const isHex = color.startsWith('#');

                  return (
                    <Group key={`node-${i}`} top={node.y0} left={node.x0}>
                      <rect
                        width={width}
                        height={height}
                        fill={isHex ? color : undefined}
                        {...dataPointFocusProps(a11y.focusedIndex === i - 1)}
                        className={cn("stroke-background stroke-[2px] transition-all hover:opacity-80",
                          !isHex && color
                        )}
                      />
                      {width > 30 && height > 20 && (
                        <text
                          x={width / 2}
                          y={height / 2}
                          dy=".33em"
                          fontSize={10}
                          textAnchor="middle"
                          fill="white"
                          className="pointer-events-none font-medium truncate"
                        >
                          {node.data.name}
                        </text>
                      )}
                    </Group>
                  )
                })}
              </Group>
            )
          }}
        </Treemap>
      </svg>
      <ChartA11yLayer a11y={a11y} columns={['Name', 'Value', 'Parent']} rows={tableRows} />
    </div>
  );
}

export const TreemapChart = (props: TreemapChartProps) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 100 }}>
      <ParentSize>
        {({ width, height }) => <TreemapChartContent {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  )
}
