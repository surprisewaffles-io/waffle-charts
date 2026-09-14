/**
 * Why: A prop validated only when someone calls `validateProps` by hand is a
 * check nobody runs. Wrapping a chart makes the check automatic during
 * development while costing production nothing (#8).
 *
 * What: Wraps a chart component so each render validates its props against the
 * generated schema and logs a single grouped warning per distinct failure. In
 * production builds the validation branch is dropped and the wrapper renders
 * the component directly.
 *
 * Test: `warns once for invalid props in development`,
 * `stays silent for valid props`
 */
import type { ComponentType } from 'react';
import { validateProps, type ChartName } from './prop-validator';

/**
 * Warnings already emitted, keyed by component plus failure text. A chart
 * re-renders on every resize and hover, and an un-deduplicated warning would
 * bury the console under thousands of copies of one mistake.
 */
const warned = new Set<string>();

/** Clears the warn-once memo. Exported for tests. */
export const resetPropWarnings = (): void => warned.clear();

/**
 * Logs invalid props once per distinct failure. Exported so a component can
 * validate without being wrapped.
 */
export const warnOnInvalidProps = (
  componentName: ChartName,
  props: unknown,
): void => {
  const { valid, errors } = validateProps(componentName, props);
  if (valid) return;

  const signature = `${componentName}:${errors.join('|')}`;
  if (warned.has(signature)) return;
  warned.add(signature);

  console.warn(`Invalid props for ${componentName}:`, errors);
};

/**
 * Returns `Component` wrapped in a development-only props check.
 *
 * The wrapper is transparent in production: `import.meta.env.DEV` is a build
 * constant, so the validation branch is removed entirely when bundling.
 */
export const createValidatedComponent = <P extends object>(
  Component: ComponentType<P>,
  componentName: ChartName,
): ComponentType<P> => {
  const Validated = (props: P) => {
    if (import.meta.env.DEV) {
      warnOnInvalidProps(componentName, props);
    }
    return <Component {...props} />;
  };

  Validated.displayName = `Validated(${componentName})`;
  return Validated;
};
