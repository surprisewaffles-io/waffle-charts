/**
 * Why: One import path for everything schema-related, so an agent introspecting
 * the chart library reaches the schemas without knowing that they are generated
 * or where the generator writes them (#8).
 *
 * What: Re-exports the generated schemas and the runtime validation helpers.
 *
 * Test: `exposes every chart through the public entry point`
 */
export { default as schemas } from './generated/all-schemas.json';

export {
  validateProps,
  getSchema,
  getPropsDefinition,
  isChartName,
  chartNames,
  type ChartName,
  type ValidationResult,
  type PropsDefinition,
} from '../lib/prop-validator';

export {
  createValidatedComponent,
  warnOnInvalidProps,
  resetPropWarnings,
} from '../lib/validated-component';

export type { ChartDatum } from './chart-props';
