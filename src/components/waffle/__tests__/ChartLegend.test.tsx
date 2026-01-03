import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
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
