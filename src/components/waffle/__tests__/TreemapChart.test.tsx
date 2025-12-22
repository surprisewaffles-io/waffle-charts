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
