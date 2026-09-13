import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
