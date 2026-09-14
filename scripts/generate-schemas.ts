/**
 * Why: Agents and runtime callers need a machine-readable description of every
 * chart's props. Hand-written schemas drift from the TypeScript types the
 * moment a prop is added, so the schemas are derived from the types instead
 * (#8).
 *
 * What: Writes one `<Chart>.schema.json` per chart plus a combined
 * `all-schemas.json`. Exits non-zero if any chart fails, so a prop type the
 * generator cannot express fails the build rather than silently shipping a
 * stale schema.
 *
 * Test: `generates a schema for all 16 charts`
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CHART_NAMES,
  OUTPUT_DIR,
  createSchemaGenerator,
  serialiseSchema,
} from './schema-config';

mkdirSync(OUTPUT_DIR, { recursive: true });

const generator = createSchemaGenerator();
const schemas: Record<string, unknown> = {};
const failures: string[] = [];

for (const chart of CHART_NAMES) {
  try {
    const schema = generator.createSchema(`${chart}Props`);
    schemas[chart] = schema;
    writeFileSync(
      resolve(OUTPUT_DIR, `${chart}.schema.json`),
      serialiseSchema(schema),
    );
  } catch (error) {
    failures.push(`${chart}: ${(error as Error).message}`);
  }
}

writeFileSync(
  resolve(OUTPUT_DIR, 'all-schemas.json'),
  serialiseSchema(schemas),
);

if (failures.length > 0) {
  console.error(`Failed to generate ${failures.length} schema(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`Generated ${Object.keys(schemas).length} schemas -> ${OUTPUT_DIR}`);
