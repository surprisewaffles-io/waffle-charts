import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GalleryPage } from '../Gallery';
import { MemoryRouter } from 'react-router-dom';

// We don't need to actually render the heavy chart components for the Gallery logic test.
// We can mock the charts array? No, the charts array is defined inside the module but outside the component.
// We can't easily mock the module's internal variable without complex vitest module mocking.
// However, the charts render quite fast in JSDOM usually (just SVG nodes).
// If they are heavy, we might want to mock the chart components themselves.

// Let's mock the chart components to avoid Visx overhead during these tests.
// This ensures we are testing the Gallery *filtering* logic, not the charts.
vi.mock('../../components/waffle/BarChart', () => ({ BarChart: () => <div data-testid="chart-mock">BarChart</div> }));
vi.mock('../../components/waffle/LineChart', () => ({ LineChart: () => <div data-testid="chart-mock">LineChart</div> }));
vi.mock('../../components/waffle/AreaChart', () => ({ AreaChart: () => <div data-testid="chart-mock">AreaChart</div> }));
vi.mock('../../components/waffle/PieChart', () => ({ PieChart: () => <div data-testid="chart-mock">PieChart</div> }));
vi.mock('../../components/waffle/RadarChart', () => ({ RadarChart: () => <div data-testid="chart-mock">RadarChart</div> }));
vi.mock('../../components/waffle/ScatterChart', () => ({ ScatterChart: () => <div data-testid="chart-mock">ScatterChart</div> }));
vi.mock('../../components/waffle/BubbleChart', () => ({ BubbleChart: () => <div data-testid="chart-mock">BubbleChart</div> }));
vi.mock('../../components/waffle/HeatmapChart', () => ({ HeatmapChart: () => <div data-testid="chart-mock">HeatmapChart</div> }));
vi.mock('../../components/waffle/TreemapChart', () => ({ TreemapChart: () => <div data-testid="chart-mock">TreemapChart</div> }));
vi.mock('../../components/waffle/SankeyChart', () => ({ SankeyChart: () => <div data-testid="chart-mock">SankeyChart</div> }));
vi.mock('../../components/waffle/CompositeChart', () => ({ CompositeChart: () => <div data-testid="chart-mock">CompositeChart</div> }));
vi.mock('../../components/waffle/ChordChart', () => ({ ChordChart: () => <div data-testid="chart-mock">ChordChart</div> }));

describe('GalleryPage', () => {
  it('renders correctly', () => {
    render(
      <MemoryRouter>
        <GalleryPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Gallery')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search charts...')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();

    // Should show multiple charts initially
    expect(screen.getAllByTestId('chart-mock').length).toBeGreaterThan(5);
  });

  it('filters by search query', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <GalleryPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText('Search charts...');

    // Type "sankey"
    await user.type(searchInput, 'sankey');

    // Expect only Sankey to be visible
    expect(screen.getByText('Sankey')).toBeInTheDocument();
    expect(screen.queryByText('Bar Chart')).not.toBeInTheDocument();
  });

  it('filters by tags', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <GalleryPage />
      </MemoryRouter>
    );

    // Click "Flow" tag
    // Note: Depends on what tags are actually rendered.
    // Based on Gallery.tsx, 'Flow' is used for Sankey and Chord.
    const flowTagButton = screen.getByText('Flow', { selector: 'button' }); // Ensure we grab the filter button, not the tag in the card
    await user.click(flowTagButton);

    // Should show Sankey and Chord
    expect(screen.getByText('Sankey')).toBeInTheDocument();
    expect(screen.getByText('Chord')).toBeInTheDocument();

    // Should NOT show Bar Chart
    expect(screen.queryByText('Bar Chart')).not.toBeInTheDocument();

    // Deselect tag (click again or click All)
    await user.click(flowTagButton);
    // Should show Bar Chart again
    expect(screen.getByText('Bar Chart')).toBeInTheDocument();
  });

  it('shows no results message', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <GalleryPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText('Search charts...');
    await user.type(searchInput, 'xyznonexistent');

    expect(screen.getByText('No charts found matching your search.')).toBeInTheDocument();
  });
});
