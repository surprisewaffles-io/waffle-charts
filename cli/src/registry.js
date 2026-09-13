/**
 * The component catalog moved to `./registry/`, split by category so no single
 * file carries all seventeen entries. This module stays so that
 * `import { registry } from '../registry.js'` keeps resolving.
 *
 * Node resolves `./registry.js` to this file and `./registry/index.js` to the
 * directory, so the two coexist without ambiguity.
 */
export {
  registry,
  resolveComponent,
  CATEGORIES,
  COMPLEXITY_LEVELS,
  CAPABILITIES,
} from './registry/index.js';
