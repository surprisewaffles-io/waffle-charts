/**
 * Why: The dev-mode wrapper is the only validation most callers will ever run,
 * and a chart re-renders constantly — a warning that repeats per render is as
 * useless as no warning at all (#8).
 *
 * What: Covers the warn-once behaviour, silence on valid props, and that the
 * wrapper still renders the component it wraps.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  createValidatedComponent,
  warnOnInvalidProps,
  resetPropWarnings,
} from '../validated-component';

type StubProps = { data: unknown; xKey?: string };

const Stub = ({ data }: StubProps) => (
  <div data-testid="stub">{Array.isArray(data) ? data.length : 'none'}</div>
);

const Validated = createValidatedComponent<StubProps>(Stub, 'BarChart');

describe('createValidatedComponent', () => {
  beforeEach(() => {
    resetPropWarnings();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the wrapped component', () => {
    render(<Validated data={[{ x: 1 }]} xKey="x" />);
    expect(screen.getByTestId('stub')).toHaveTextContent('1');
  });

  it('stays silent for valid props', () => {
    render(<Validated data={[{ x: 1 }]} xKey="x" />);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('warns once for invalid props in development', () => {
    const { rerender } = render(<Validated data={'not-an-array' as unknown} />);
    rerender(<Validated data={'not-an-array' as unknown} />);
    rerender(<Validated data={'not-an-array' as unknown} />);

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(vi.mocked(console.warn).mock.calls[0][0]).toContain('Invalid props for BarChart');
  });

  it('warns again for a different failure', () => {
    warnOnInvalidProps('BarChart', { data: 'not-an-array' });
    warnOnInvalidProps('BarChart', { data: [{ x: 1 }], xKey: 'x', variant: 'pie' });
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('carries a debuggable display name', () => {
    expect(Validated.displayName).toBe('Validated(BarChart)');
  });
});
