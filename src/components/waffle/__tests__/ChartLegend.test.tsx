import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ChartLegend } from '../ChartLegend';

describe('ChartLegend', () => {
  const payload = [
    { label: 'Red Team', color: 'red' },
    { label: 'Blue Team', color: 'blue' },
  ];

  it('renders without crashing', () => {
    const { container } = render(<ChartLegend payload={payload} />);
    expect(container).toBeInTheDocument();
  });

  it('displays all labels', () => {
    render(<ChartLegend payload={payload} />);
    expect(screen.getByText('Red Team')).toBeInTheDocument();
    expect(screen.getByText('Blue Team')).toBeInTheDocument();
  });

  it('applies vertical class when orientation is vertical', () => {
    const { container } = render(<ChartLegend payload={payload} orientation="vertical" />);
    // "flex-col" is used for vertical orientation in the implementation
    expect(container.firstChild).toHaveClass('flex-col');
  });

  it('applies default horizontal classes', () => {
    const { container } = render(<ChartLegend payload={payload} orientation="horizontal" />);
    // "items-center" and "justify-center" used in implementation
    expect(container.firstChild).toHaveClass('items-center');
    expect(container.firstChild).toHaveClass('justify-center');
  });
});

describe('ChartLegend accessibility', () => {
  const payload = [
    { label: 'Red Team', color: 'red' },
    { label: 'Blue Team', color: 'blue' },
  ];

  it('exposes the entries as a named list', () => {
    render(<ChartLegend payload={payload} />);
    const list = screen.getByRole('list');
    expect(list).toHaveAccessibleName('Chart legend');
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });

  it('takes a caller-supplied name', () => {
    render(<ChartLegend payload={payload} ariaLabel="Teams" />);
    expect(screen.getByRole('list')).toHaveAccessibleName('Teams');
  });

  it('names the list from a visible heading when one is given', () => {
    render(
      <>
        <h2 id="legend-heading">Teams</h2>
        <ChartLegend payload={payload} ariaLabelledby="legend-heading" />
      </>,
    );
    const list = screen.getByRole('list');
    expect(list).toHaveAccessibleName('Teams');
    expect(list).not.toHaveAttribute('aria-label');
  });

  it('hides the colour swatch, which carries no information the label lacks', () => {
    render(<ChartLegend payload={payload} />);
    const item = within(screen.getByRole('list')).getAllByRole('listitem')[0];
    expect(item.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    expect(item).toHaveTextContent('Red Team');
  });
});

describe('ChartLegend edge-case data', () => {
  // Callers in plain JS can pass anything; the assertion reproduces that
  // without weakening the component's own types.
  const asPayload = (value: unknown) => value as { label: string; color: string }[];

  it('renders an empty legend when the payload is empty', () => {
    const { container } = render(<ChartLegend payload={[]} />);
    expect(container.firstChild).toBeInTheDocument();
    expect(container.querySelectorAll('span')).toHaveLength(0);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('renders an empty legend when the payload is %s', (_label, value) => {
    const { container } = render(<ChartLegend payload={asPayload(value)} />);
    expect(container.firstChild).toBeInTheDocument();
    expect(container.querySelectorAll('span')).toHaveLength(0);
  });

  it('renders a legend with a single item', () => {
    render(<ChartLegend payload={[{ label: 'Solo', color: 'green' }]} />);
    expect(screen.getByText('Solo')).toBeInTheDocument();
  });

  it('renders items that arrive after an empty render', () => {
    const { rerender } = render(<ChartLegend payload={[]} />);
    rerender(<ChartLegend payload={[{ label: 'Late', color: 'red' }]} />);
    expect(screen.getByText('Late')).toBeInTheDocument();
  });
});
