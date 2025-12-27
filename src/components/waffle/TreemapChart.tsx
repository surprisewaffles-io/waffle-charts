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

export type TreemapChartProps = {
  data: TreemapData; // Root node
  width?: number;
  height?: number;
  className?: string;
  tileMethod?: keyof typeof tileMethods;
  background?: string;
  colorScheme?: string[];
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
  colorScheme = ['#a855f7', '#ec4899', '#3b82f6', '#14b8a6', '#f59e0b', '#ef4444']
}: TreemapChartContentProps) {

  const root = useMemo(() => {
    // If data is already a hierarchy tree
    const rootHierarchy = hierarchy(data)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Sum values for layout
    return rootHierarchy.sum((d) => d.size ?? 0);
  }, [data]);

  const tile = tileMethods[tileMethod] || treemapSquarify;

  if (width < 10) return null;

  return (
    <div className={cn("relative", className)}>
      <svg width={width} height={height} className="overflow-visible">
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
