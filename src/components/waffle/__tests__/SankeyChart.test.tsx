import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { SankeyChart } from '../SankeyChart';

type SizedChildren = { children: (args: { width: number; height: number }) => ReactNode };

// Mock ParentSize to provide strict dimensions
vi.mock('@visx/responsive', () => ({
  ParentSize: ({ children }: SizedChildren) => children({ width: 800, height: 600 }),
  parentSize: ({ children }: SizedChildren) => children({ width: 800, height: 600 }),
}));

// Mock TooltipInPortal to render directly in DOM for testing
vi.mock('@visx/tooltip', async () => {
  const actual = await vi.importActual('@visx/tooltip');
  return {
    ...actual,
    useTooltipInPortal: () => ({
      containerRef: () => { },
      TooltipInPortal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    }),
  };
});

const sampleData = {
  nodes: [
    { name: 'Source A' },
    { name: 'Source B' },
    { name: 'Target' }
  ],
  links: [
    { source: 0, target: 2, value: 50 },
    { source: 1, target: 2, value: 30 }
  ]
};

// Mock getBoundingClientRect for SVG elements to enable hover detection
beforeAll(() => {
  Element.prototype.getBoundingClientRect = vi.fn(() => ({
    width: 100,
    height: 100,
    top: 0,
    left: 0,
    bottom: 100,
    right: 100,
    x: 0,
    y: 0,
    toJSON: () => { },
  }));
});

describe('SankeyChart', () => {

  it('renders without crashing', () => {
    // Basic render test
    const { container } = render(<SankeyChart data={sampleData} />);
    // Check for SVG
    expect(container.querySelector('svg')).toBeInTheDocument();
    // Check for nodes (3 rects)
    expect(container.querySelectorAll('rect')).toHaveLength(3);
    // Check for links (2 paths)
    expect(container.querySelectorAll('path')).toHaveLength(2);
  });

  // d3-sankey never sets a `path` property on a laid-out link; the geometry
  // comes from `createPath` off the render prop. Counting <path> elements is
  // not enough, because a path with an empty `d` still counts. (#19)
  it('draws link geometry rather than empty paths', () => {
    const { container } = render(<SankeyChart data={sampleData} />);
    const links = Array.from(container.querySelectorAll('path'));

    expect(links).toHaveLength(2);
    for (const link of links) {
      const d = link.getAttribute('d');
      expect(d).toBeTruthy();
      // sankeyLinkHorizontal emits a cubic Bezier: "M…C…".
      expect(d).toMatch(/^M[\d.,\-\s]+C/);
    }
  });

  it('scales link stroke width by value', () => {
    const { container } = render(<SankeyChart data={sampleData} />);
    const widths = Array.from(container.querySelectorAll('path')).map(link =>
      Number(link.getAttribute('stroke-width')),
    );

    // 50 and 30 flow into the same target, so neither link is hairline-thin
    // and the larger value gets the thicker ribbon.
    expect(widths.every(width => width > 1)).toBe(true);
    expect(Math.max(...widths)).toBeGreaterThan(Math.min(...widths));
  });

  it('shows tooltip on hover over a node', async () => {
    const user = userEvent.setup();
    render(<SankeyChart data={sampleData} />);

    // In SankeyChart, nodes render a <rect> where the title isn't directly usable as text query
    // But we render <text> labels if sufficient height.
    // "Source A" should be visible as a text label.
    const nodeLabel = screen.getByText('Source A');
    expect(nodeLabel).toBeInTheDocument();

    // Hover over the first node (Source A is index 0)
    // We can find the rect associated with it. 
    // Usually finding by text is easiest if the label is part of the interactive group.
    // Our SankeyChart structure:
    // <Group> <rect (interactive)/> <text (visible)/> </Group>
    // So hovering the text might not trigger it if pointer-events-none.
    // Let's find rendering rects.
    // We can rely on querySelectorAll to find rects
    // The rects are nodes. Paths are links.

    // Actually, let's just use the container querySelector.
    // The rects are: Source A, Source B, Target. Order depends on Visx layout but typically stable.
    const nodeRects = document.querySelectorAll('rect');

    // Hover first node
    await user.hover(nodeRects[0]);

    // Tooltip should appear
    // The chart ALREADY has a text label "Source A". 
    // The tooltip will ADD another "Source A".
    // So we should expect 2 elements, or look for the one in the tooltip container.
    // Our mocked TooltipInPortal renders a simple div.

    // Let's check for the "Value: 50" text which is likely unique to the tooltip
    expect(await screen.findByText(/Value: 50/i)).toBeInTheDocument();
  });
});

// The ribbons are stroked, not filled: `sankeyLinkHorizontal` emits a centre
// line and the thickness comes from stroke-width, so the gradient has to paint
// `stroke`. Painting `fill` would colour the region the curve encloses instead
// of the ribbon.
describe('SankeyChart link gradients', () => {
  /**
   * jsdom's selector engine matches `linearGradient` only as the rightmost
   * part of a selector, never as an ancestor: `defs linearGradient` finds the
   * gradients, but `linearGradient stop` and `defs > stop` both return nothing
   * and would make an assertion over the stops pass vacuously. So the
   * gradients are selected first and their stops read by scoping from the
   * element. Real browsers do not need this; do not fold these back into one
   * selector.
   */
  const gradientsIn = (container: Element) =>
    Array.from(container.querySelectorAll('defs linearGradient'));

  const stopsOf = (gradient: Element) => Array.from(gradient.querySelectorAll('stop'));

  /** A gradient's stop colours, in document order. */
  const stopColorsOf = (gradient: Element) =>
    stopsOf(gradient).map(stop => stop.getAttribute('stop-color'));

  it('points every link stroke at a gradient defined in the same svg', () => {
    const { container } = render(<SankeyChart data={sampleData} />);
    const links = Array.from(container.querySelectorAll('path'));

    expect(links).toHaveLength(2);
    for (const link of links) {
      const stroke = link.getAttribute('stroke') ?? '';
      const id = stroke.match(/^url\(#(.+)\)$/)?.[1];
      expect(id, `stroke should be a gradient reference, got ${stroke}`).toBeTruthy();
      expect(container.querySelector(`defs > linearGradient[id="${id}"]`)).not.toBeNull();
    }
  });

  it('runs each gradient from its source node colour to its target node colour', () => {
    const colorScheme = ['#111111', '#222222', '#333333'];
    const { container } = render(<SankeyChart data={sampleData} colorScheme={colorScheme} />);

    // Domain order follows `data.nodes`: Source A, Source B, Target.
    // Link 0 is Source A → Target, link 1 is Source B → Target. Compared as a
    // set because the layout is free to reorder the links array.
    const pairs = gradientsIn(container).map(stopColorsOf);

    expect(pairs).toHaveLength(2);
    expect(pairs).toContainEqual(['#111111', '#333333']);
    expect(pairs).toContainEqual(['#222222', '#333333']);
  });

  it('matches each node rect fill to the gradient stop that meets it', () => {
    const colorScheme = ['#111111', '#222222', '#333333'];
    const { container } = render(<SankeyChart data={sampleData} colorScheme={colorScheme} />);

    const rectFills = Array.from(container.querySelectorAll('rect')).map(rect =>
      rect.getAttribute('fill'),
    );
    const stopColors = gradientsIn(container).flatMap(stopColorsOf);

    // A ribbon only reads as leaving one node and arriving at another if its
    // two ends carry those nodes' own colours.
    expect(stopColors).toHaveLength(4);
    for (const color of stopColors) {
      expect(rectFills).toContain(color);
    }
  });

  it('runs the gradient left to right along the ribbon span', () => {
    const { container } = render(<SankeyChart data={sampleData} />);
    const gradients = gradientsIn(container);

    expect(gradients).toHaveLength(2);
    for (const gradient of gradients) {
      // userSpaceOnUse, because objectBoundingBox measures the fill box — which
      // ignores stroke width and is degenerate for a straight ribbon.
      expect(gradient.getAttribute('gradientUnits')).toBe('userSpaceOnUse');
      const x1 = Number(gradient.getAttribute('x1'));
      const x2 = Number(gradient.getAttribute('x2'));
      expect(Number.isFinite(x1) && Number.isFinite(x2)).toBe(true);
      expect(x2).toBeGreaterThan(x1);
      // Horizontal: no vertical component.
      expect(gradient.getAttribute('y1')).toBe(gradient.getAttribute('y2'));
    }

    for (const gradient of gradients) {
      const offsets = stopsOf(gradient).map(stop => stop.getAttribute('offset'));
      expect(offsets).toEqual(['0%', '100%']);
    }
  });

  it('keeps the existing link opacity', () => {
    const { container } = render(<SankeyChart data={sampleData} />);

    for (const link of container.querySelectorAll('path')) {
      expect(link.getAttribute('stroke-opacity')).toBe('0.2');
      expect(link.getAttribute('class')).toContain('hover:[stroke-opacity:0.5]');
    }
  });

  it('gives two charts on one page disjoint gradient ids', () => {
    // A shared id would make both charts resolve to whichever <defs> the
    // browser parsed first, so the second chart would wear the first's colours.
    const { container } = render(
      <>
        <SankeyChart data={sampleData} colorScheme={['#111111', '#222222', '#333333']} />
        <SankeyChart data={sampleData} colorScheme={['#aaaaaa', '#bbbbbb', '#cccccc']} />
      </>,
    );

    const ids = gradientsIn(container).map(gradient => gradient.getAttribute('id'));

    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
    // querySelector rejects the ':' useId embeds, so the ids must be stripped
    // of it — this is what makes the lookup in the first test work at all.
    for (const id of ids) {
      expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });
});

describe('SankeyChart edge-case data', () => {
  // Callers in plain JS can pass anything; the assertion reproduces that
  // without weakening the component's own types.
  const asData = (value: unknown) => value as typeof sampleData;

  it('renders a fallback instead of a chart when the graph is empty', () => {
    render(<SankeyChart data={{ nodes: [], links: [] }} />);
    expect(screen.getByRole('status')).toHaveTextContent('No data to display');
  });

  it('renders a custom empty message when one is supplied', () => {
    render(<SankeyChart data={{ nodes: [], links: [] }} emptyMessage="No flows recorded" />);
    expect(screen.getByRole('status')).toHaveTextContent('No flows recorded');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('renders the fallback when data is %s', (_label, value) => {
    render(<SankeyChart data={asData(value)} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the fallback when nodes exist but no links do', () => {
    render(<SankeyChart data={{ nodes: [{ name: 'Lonely' }], links: [] }} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('drops a link whose endpoint index has no node rather than throwing', () => {
    const { container } = render(
      <SankeyChart
        data={{
          nodes: sampleData.nodes,
          links: [...sampleData.links, { source: 0, target: 99, value: 10 }],
        }}
      />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('path')).toHaveLength(2);
  });

  it('renders a graph with a single link', () => {
    const { container } = render(
      <SankeyChart
        data={{ nodes: [{ name: 'A' }, { name: 'B' }], links: [{ source: 0, target: 1, value: 5 }] }}
      />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('rect')).toHaveLength(2);
  });

  it('keeps hook order stable when data arrives after an empty render', () => {
    const { container, rerender } = render(<SankeyChart data={{ nodes: [], links: [] }} />);
    rerender(<SankeyChart data={sampleData} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('rect')).toHaveLength(3);
  });
});
