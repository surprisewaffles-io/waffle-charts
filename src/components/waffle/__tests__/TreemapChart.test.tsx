import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { TreemapChart, type TreemapData } from '../TreemapChart';

// Mocks
class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
}
vi.stubGlobal('ResizeObserver', ResizeObserver);

vi.mock('@visx/responsive', () => ({
  ParentSize: ({ children }: { children: (args: { width: number; height: number }) => React.ReactNode }) =>
    children({ width: 500, height: 300 }),
}));

const mockData: TreemapData = {
  name: "root",
  children: [
    { name: "Tests", size: 100 },
    { name: "Code", size: 50 },
  ]
};

describe('TreemapChart', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <TreemapChart data={mockData} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders leaf nodes text', () => {
    render(
      <TreemapChart data={mockData} />
    );
    // We expect "Tests" and "Code" to be rendered
    expect(screen.getByText("Tests")).toBeInTheDocument();
    expect(screen.getByText("Code")).toBeInTheDocument();
  });

  it('renders rects for nodes', () => {
    const { container } = render(
      <TreemapChart data={mockData} />
    );
    // Expect rects. Check for length >= 2 (leaves + background)
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThanOrEqual(2);
  });
});

describe('TreemapChart edge-case data', () => {
  // Callers in plain JS can pass anything; the assertion reproduces that
  // without weakening the component's own types.
  const asData = (value: unknown) => value as TreemapData;

  it('renders a fallback instead of a chart when the root has no children', () => {
    render(<TreemapChart data={{ name: 'root', children: [] }} />);
    expect(screen.getByRole('status')).toHaveTextContent('No data to display');
  });

  it('renders a custom empty message when one is supplied', () => {
    render(<TreemapChart data={{ name: 'root', children: [] }} emptyMessage="Nothing to break down" />);
    expect(screen.getByRole('status')).toHaveTextContent('Nothing to break down');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('renders the fallback when data is %s', (_label, value) => {
    render(<TreemapChart data={asData(value)} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the fallback when every leaf has zero size', () => {
    render(
      <TreemapChart data={{ name: 'root', children: [{ name: 'Empty', size: 0 }] }} />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders a chart for a single leaf', () => {
    const { container } = render(
      <TreemapChart data={{ name: 'root', children: [{ name: 'Only', size: 10 }] }} />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('rect').length).toBeGreaterThanOrEqual(2);
  });

  it('treats a non-numeric size as zero rather than producing NaN geometry', () => {
    const { container } = render(
      <TreemapChart
        data={asData({
          name: 'root',
          children: [{ name: 'Good', size: 10 }, { name: 'Bad', size: 'huge' }],
        })}
      />,
    );
    expect(container.innerHTML).not.toMatch(/NaN/);
  });

  it('keeps hook order stable when data arrives after an empty render', () => {
    const { container, rerender } = render(<TreemapChart data={{ name: 'root', children: [] }} />);
    rerender(<TreemapChart data={mockData} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('rect').length).toBeGreaterThanOrEqual(2);
  });
});
