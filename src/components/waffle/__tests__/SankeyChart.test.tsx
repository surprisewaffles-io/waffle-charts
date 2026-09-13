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
