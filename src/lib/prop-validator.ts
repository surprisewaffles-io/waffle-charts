/**
 * Why: TypeScript checks chart props at compile time only. Props that arrive
 * from an agent, a CMS, or a JSON fixture are unchecked at the point they reach
 * a chart, where a wrong type surfaces as an empty or broken render rather than
 * an error naming the bad prop (#8).
 *
 * What: Compiles the generated JSON schemas with Ajv and validates a props
 * object against one chart's schema, returning the failures as readable
 * strings. Compiled validators are cached, so repeated calls on a re-rendering
 * chart cost one function call.
 *
 * Test: `validates correct props`, `catches invalid props`,
 * `caches the compiled validator per component`
 */
import Ajv, { type ValidateFunction } from 'ajv';
import allSchemas from '../schemas/generated/all-schemas.json';

/** The charts a schema exists for. */
export type ChartName = keyof typeof allSchemas;

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

/**
 * `strict: false` keeps a schema quirk introduced by a future prop type from
 * throwing in a consumer's browser; the test suite compiles under strict mode
 * instead, so regressions surface there.
 */
const ajv = new Ajv({ allErrors: true, strict: false });

const validatorCache = new Map<ChartName, ValidateFunction>();

const getValidator = (componentName: ChartName): ValidateFunction => {
  const cached = validatorCache.get(componentName);
  if (cached) return cached;

  const schema = allSchemas[componentName];
  const compiled = ajv.compile(schema);
  validatorCache.set(componentName, compiled);
  return compiled;
};

/** Every chart name that has a generated schema. */
export const chartNames = Object.keys(allSchemas) as ChartName[];

/** True when a string names a chart this module can validate. */
export const isChartName = (name: string): name is ChartName =>
  Object.hasOwn(allSchemas, name);

/** Returns the raw JSON schema for one chart, `$ref` root and all. */
export const getSchema = (componentName: ChartName): object =>
  allSchemas[componentName];

/** The object definition a chart's root `$ref` resolves to. */
export type PropsDefinition = {
  type?: string;
  properties?: Record<string, { description?: string; [key: string]: unknown }>;
  required?: string[];
  [key: string]: unknown;
};

type RefSchema = { $ref?: string; definitions?: Record<string, PropsDefinition> };

/**
 * Follows a chart schema's root `$ref` to the object that actually lists the
 * props. Every schema is emitted in `$ref` + `definitions` form, and the
 * generic charts add one extra hop (`BarChartProps` -> `BarChartProps<ChartDatum>`),
 * so introspecting props means resolving the chain rather than reading the root.
 *
 * Use this to enumerate a chart's props; use {@link getSchema} to validate.
 */
export const getPropsDefinition = (componentName: ChartName): PropsDefinition => {
  const schema = getSchema(componentName) as RefSchema;
  const definitions = schema.definitions ?? {};

  let current: RefSchema & PropsDefinition = schema;
  // Bounded rather than `while (true)`: a malformed schema must not spin.
  for (let hop = 0; hop < 10 && current.$ref; hop += 1) {
    const key = decodeURIComponent(current.$ref.replace('#/definitions/', ''));
    const next = definitions[key];
    if (!next) break;
    current = next;
  }

  return current;
};

/**
 * Validates `props` against `componentName`'s generated schema.
 *
 * Callback props such as `onClick` are absent from the schemas — JSON Schema
 * cannot describe a function — and the schemas allow unknown keys, so passing
 * callbacks through is not an error.
 *
 * @throws {Error} if `componentName` has no generated schema.
 */
export const validateProps = (
  componentName: ChartName,
  props: unknown,
): ValidationResult => {
  if (!isChartName(componentName)) {
    throw new Error(
      `No schema for "${componentName}". Known charts: ${chartNames.join(', ')}`,
    );
  }

  const validate = getValidator(componentName);
  const valid = validate(props) as boolean;

  return {
    valid,
    errors: valid
      ? []
      : (validate.errors ?? []).map(
          (error) => `${error.instancePath || '(root)'} ${error.message}`.trim(),
        ),
  };
};
