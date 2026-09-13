/**
 * Chart selector.
 *
 * Why: AI agents (and humans) adding WaffleCharts components have to pick one
 * chart out of seventeen registry entries with no guidance beyond the label.
 * This module turns that guess into a scored decision so the choice is
 * explainable and reproducible.
 *
 * What: Scores every chart in the registry against four axes — the relationship
 * being shown, how many data points there are, the shape of those points, and
 * extra factors such as time series or interactivity — and returns a ranked
 * recommendation with a confidence score and a rationale. `recommendByData`
 * infers those axes from a data sample; `getDecisionTree` exposes the same
 * knowledge as a navigable tree.
 *
 * Test: `cli/src/__tests__/selector.test.js`
 */

import { registry } from './registry.js';

/** Weight each criterion contributes to a chart's raw score. */
const WEIGHTS = Object.freeze({
  relationship: 40,
  volume: 25,
  dimensions: 20,
  traits: 15,
});

/** Credit for a chart that tolerates a data volume without being built for it. */
const PARTIAL_VOLUME_CREDIT = 0.6;

/** A chart is only returned alongside the primary if it scores at least this share of it. */
const SELECTION_RATIO = 0.75;

/** Default cap on how many charts `recommend` returns. */
const DEFAULT_LIMIT = 3;

/** Data-volume bands from the decision tree's "how many data points?" question. */
const VOLUME_BANDS = Object.freeze([
  { id: 'few', min: 1, max: 10, label: '1-10 data points' },
  { id: 'medium', min: 11, max: 50, label: '11-50 data points' },
  { id: 'many', min: 51, max: Infinity, label: '51+ data points' },
]);

/** Accepted spellings for the `relationship` criterion, mapped to canonical ids. */
const RELATIONSHIP_ALIASES = Object.freeze({
  comparison: 'comparison',
  compare: 'comparison',
  ranking: 'comparison',
  distribution: 'distribution',
  trend: 'distribution',
  composition: 'composition',
  'part-to-whole': 'composition',
  proportion: 'composition',
  flow: 'flow',
  correlation: 'correlation',
  relationship: 'correlation',
  financial: 'financial',
});

/** Accepted spellings for the `dimensions` criterion, mapped to canonical ids. */
const DIMENSION_ALIASES = Object.freeze({
  1: '1d',
  '1d': '1d',
  single: '1d',
  2: '2d',
  '2d': '2d',
  xy: '2d',
  hierarchical: 'hierarchical',
  hierarchy: 'hierarchical',
  tree: 'hierarchical',
  'multi-series': 'multiSeries',
  multiseries: 'multiSeries',
  network: 'network',
  graph: 'network',
});

/** Extra factors from the decision tree's step 4, plus interactivity. */
const TRAIT_KEYS = Object.freeze(['interactive', 'timeSeries', 'proportions', 'correlations', 'networks']);

/**
 * The decision tree, expressed per chart.
 *
 * `volume.best` is the band the chart is designed for; `volume.ok` are bands it
 * still reads well at, scored at partial credit. `priority` breaks ties between
 * charts that score identically — lower wins, so the more conventional choice
 * (BarChart over RadarChart, PieChart over WaffleChart) becomes the primary.
 * RadialBarChart sits under `composition` rather than `comparison` because it
 * renders a part-to-whole share around a ring.
 */
const CATALOG = [
  { name: 'BarChart', registryKey: 'bar-chart', relationships: ['comparison'], volume: { best: 'few', ok: ['medium'] }, dimensions: ['1d'], traits: [], priority: 1 },
  { name: 'LineChart', registryKey: 'line-chart', relationships: ['distribution'], volume: { best: 'medium', ok: ['many', 'few'] }, dimensions: ['1d', 'multiSeries'], traits: ['timeSeries'], priority: 2 },
  { name: 'AreaChart', registryKey: 'area-chart', relationships: ['distribution'], volume: { best: 'medium', ok: ['many'] }, dimensions: ['1d', 'multiSeries'], traits: ['timeSeries'], priority: 3 },
  { name: 'PieChart', registryKey: 'pie-chart', relationships: ['composition'], volume: { best: 'few', ok: [] }, dimensions: ['1d'], traits: ['proportions'], priority: 4 },
  { name: 'ScatterChart', registryKey: 'scatter-chart', relationships: ['correlation'], volume: { best: 'medium', ok: ['many'] }, dimensions: ['2d'], traits: ['correlations'], priority: 5 },
  { name: 'HeatmapChart', registryKey: 'heatmap-chart', relationships: ['distribution'], volume: { best: 'many', ok: ['medium'] }, dimensions: ['2d'], traits: [], priority: 6 },
  { name: 'TreemapChart', registryKey: 'treemap-chart', relationships: ['composition'], volume: { best: 'many', ok: ['medium', 'few'] }, dimensions: ['hierarchical'], traits: ['proportions'], priority: 7 },
  { name: 'WaffleChart', registryKey: 'waffle-chart', relationships: ['composition'], volume: { best: 'few', ok: [] }, dimensions: ['1d'], traits: ['proportions'], priority: 8 },
  { name: 'RadarChart', registryKey: 'radar-chart', relationships: ['comparison'], volume: { best: 'few', ok: [] }, dimensions: ['1d', 'multiSeries'], traits: [], priority: 9 },
  { name: 'BubbleChart', registryKey: 'bubble-chart', relationships: ['correlation'], volume: { best: 'medium', ok: ['few'] }, dimensions: ['2d'], traits: ['correlations'], priority: 10 },
  { name: 'FunnelChart', registryKey: 'funnel-chart', relationships: ['composition'], volume: { best: 'few', ok: [] }, dimensions: ['1d'], traits: ['proportions'], priority: 11 },
  { name: 'SankeyChart', registryKey: 'sankey-chart', relationships: ['flow'], volume: { best: 'medium', ok: ['few'] }, dimensions: ['hierarchical', 'network'], traits: ['networks'], priority: 12 },
  { name: 'CompositeChart', registryKey: 'composite-chart', relationships: ['comparison', 'distribution'], volume: { best: 'medium', ok: ['many'] }, dimensions: ['multiSeries'], traits: ['timeSeries'], priority: 13 },
  { name: 'CandlestickChart', registryKey: 'candlestick-chart', relationships: ['financial'], volume: { best: 'medium', ok: ['many'] }, dimensions: ['2d', 'multiSeries'], traits: ['timeSeries'], priority: 14 },
  { name: 'ChordChart', registryKey: 'chord-chart', relationships: ['flow'], volume: { best: 'few', ok: ['medium'] }, dimensions: ['network'], traits: ['networks'], priority: 15 },
  { name: 'RadialBarChart', registryKey: 'radial-bar-chart', relationships: ['composition'], volume: { best: 'few', ok: [] }, dimensions: ['1d'], traits: ['proportions'], priority: 16 },
].map((chart) => {
  const entry = registry[chart.registryKey];
  if (!entry) {
    throw new Error(`selector: "${chart.name}" maps to registry key "${chart.registryKey}", which is not in the registry.`);
  }
  // Interactivity is a registry fact, not a catalog opinion: every chart that
  // ships @visx/tooltip supports hover and focus interaction.
  return Object.freeze({ ...chart, label: entry.label, interactive: entry.dependencies.includes('@visx/tooltip') });
});

/** Verb used to describe each relationship in a rationale. */
const RELATIONSHIP_VERBS = Object.freeze({
  comparison: 'comparing',
  distribution: 'showing the distribution of',
  composition: 'showing part-to-whole across',
  flow: 'showing flow between',
  correlation: 'showing correlation across',
  financial: 'showing price movement across',
});

/** Noun used for the data points in a rationale, by dimension. */
const DIMENSION_NOUNS = Object.freeze({
  '1d': 'categories',
  '2d': 'data points',
  hierarchical: 'nodes',
  network: 'nodes',
  multiSeries: 'series',
});

/** Trailing clause added to a rationale for each requested trait. */
const TRAIT_CLAUSES = Object.freeze({
  interactive: 'with interactive features',
  timeSeries: 'over time',
  proportions: 'as proportions',
  correlations: 'with correlation emphasis',
  networks: 'across a network',
});

/** Traits a relationship already states, so the rationale does not say them twice. */
const IMPLIED_TRAITS = Object.freeze({
  correlation: 'correlations',
  composition: 'proportions',
  flow: 'networks',
});

/** Reason text recorded on a candidate for each trait it satisfies. */
const TRAIT_REASONS = Object.freeze({
  interactive: 'supports tooltips and hover interaction',
  timeSeries: 'built for time series',
  proportions: 'reads as a proportion',
  correlations: 'exposes correlation',
  networks: 'renders network links',
});

/** Goal phrases mapped to a relationship, most specific first. */
const GOAL_PATTERNS = Object.freeze([
  { pattern: /price|stock|ohlc|candle|ticker|market data/i, relationship: 'financial' },
  { pattern: /flow|transfer|migrat|pipeline|route|between nodes/i, relationship: 'flow' },
  { pattern: /part[- ]to[- ]whole|proportion|percentage|share|composition|breakdown|split|make ?up/i, relationship: 'composition' },
  { pattern: /correlat|relationship between|scatter|cluster/i, relationship: 'correlation' },
  { pattern: /trend|over time|distribution|spread|density|history/i, relationship: 'distribution' },
  { pattern: /compar|rank|versus|\bvs\b|benchmark|against/i, relationship: 'comparison' },
]);

/** Keys treated as the time axis when inferring a data shape. */
const DATE_KEYS = Object.freeze(['date', 'time', 'timestamp', 'datetime', 'month', 'year', 'day', 'period']);

/**
 * Recommend charts from explicit criteria.
 *
 * Every criterion is optional, but at least one must be supplied — with nothing
 * to score against, the result is an explicit no-match rather than a guess.
 * An `interactive: false` means "no preference", not "penalise interactive
 * charts", because every WaffleCharts chart but the legend ships tooltips.
 *
 * @param {object} [criteria] - Selection criteria.
 * @param {string} [criteria.relationship] - comparison | distribution | composition | flow | correlation | financial.
 * @param {number} [criteria.dataPoints] - Count of points to render; must be a positive finite number.
 * @param {string|number} [criteria.dimensions] - 1 | 2 | '1d' | '2d' | 'hierarchical' | 'multi-series' | 'network'.
 * @param {boolean} [criteria.interactive] - Prefer charts with tooltip/hover support.
 * @param {boolean} [criteria.timeSeries] - Data is indexed by time.
 * @param {boolean} [criteria.proportions] - Values are shares of a whole.
 * @param {boolean} [criteria.correlations] - The goal is to expose correlation.
 * @param {boolean} [criteria.networks] - Data describes links between nodes.
 * @param {number} [criteria.limit=3] - Maximum charts to return.
 * @returns {{charts: string[], primary: string|null, confidence: number, rationale: string,
 *   matched: boolean, tie: boolean, candidates: Array<object>, criteria: object}}
 *   `charts` is ranked best-first and `primary` is its head, or `null` when nothing matched.
 * @throws {TypeError} If `criteria` is not an object, or a criterion has an unknown value or wrong type.
 */
export function recommend(criteria = {}) {
  const normalized = normalizeCriteria(criteria);

  const scored = CATALOG.map((chart) => {
    const { score, max, reasons } = scoreChart(chart, normalized);
    return { chart, confidence: max > 0 ? score / max : 0, reasons };
  }).sort((a, b) => b.confidence - a.confidence || a.chart.priority - b.chart.priority);

  const top = scored[0];
  if (!top || top.confidence === 0) {
    return noMatch(normalized);
  }

  const qualifying = scored
    .filter((c) => c.confidence >= top.confidence * SELECTION_RATIO)
    .slice(0, normalized.limit);

  const candidates = qualifying.map(({ chart, confidence, reasons }) => ({
    chart: chart.name,
    registryKey: chart.registryKey,
    label: chart.label,
    confidence: round(confidence),
    reasons,
  }));

  return {
    charts: candidates.map((c) => c.chart),
    primary: top.chart.name,
    confidence: round(top.confidence),
    rationale: buildRationale(top.chart, normalized),
    matched: true,
    tie: scored.filter((c) => c.confidence === top.confidence).length > 1,
    candidates,
    criteria: describeCriteria(normalized),
  };
}

/**
 * Recommend charts by inspecting a data sample.
 *
 * Infers the criteria `recommend` needs from the shape of `data` — point count,
 * dimensionality, time axis, hierarchy, network links — then lets an optional
 * `goal` phrase override the inferred relationship.
 *
 * @param {object} input - Input wrapper.
 * @param {Array<object>} input.data - Non-empty array of data points.
 * @param {string} [input.goal] - Plain-language goal, e.g. "compare categories".
 * @param {number} [input.limit=3] - Maximum charts to return.
 * @returns {object} The `recommend` result, plus `inferred` — the criteria and
 *   notes derived from the data, so a caller can see what drove the answer.
 * @throws {TypeError} If `data` is missing, not an array, empty, or holds no objects.
 */
export function recommendByData({ data, goal, limit } = {}) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new TypeError('recommendByData requires a non-empty `data` array.');
  }
  const sample = data.find(isPlainObject);
  if (!sample) {
    throw new TypeError('recommendByData requires `data` to contain objects, e.g. [{ label: "A", value: 1 }].');
  }
  if (goal !== undefined && typeof goal !== 'string') {
    throw new TypeError('`goal` must be a string when provided.');
  }

  const shape = inferShape(data, sample);
  const notes = [...shape.notes];

  let relationship = shape.relationship;
  if (goal) {
    const match = GOAL_PATTERNS.find(({ pattern }) => pattern.test(goal));
    if (match) {
      relationship = match.relationship;
      notes.push(`goal "${goal}" read as ${relationship}`);
    } else {
      notes.push(`goal "${goal}" matched no known phrase; kept ${relationship} from the data shape`);
    }
  }

  const inferredCriteria = { ...shape.criteria, relationship, dataPoints: shape.points };
  return { ...recommend({ ...inferredCriteria, limit }), inferred: { ...inferredCriteria, notes } };
}

/**
 * Return the full decision tree for custom navigation.
 *
 * The tree is generated from the same catalog `recommend` scores against, so
 * the two can never disagree. Each node carries the criterion it resolves, its
 * options, and the charts each option admits; `next` links to the following
 * question and is absent on leaves.
 *
 * @returns {{question: string, criterion: string, options: Array<object>}} A deep
 *   copy, safe for the caller to mutate.
 */
export function getDecisionTree() {
  return structuredClone(DECISION_TREE);
}

/**
 * Return every chart the selector knows about, with its registry linkage.
 *
 * @returns {Array<{name: string, registryKey: string, label: string, relationships: string[],
 *   dimensions: string[], traits: string[], volume: object, interactive: boolean}>} A deep copy.
 */
export function getChartCatalog() {
  return structuredClone(CATALOG.map((chart) => ({ ...chart })));
}

// --- internals ---------------------------------------------------------------

/** Validates and canonicalises raw criteria. Throws on anything it cannot read. */
function normalizeCriteria(criteria) {
  if (!isPlainObject(criteria)) {
    throw new TypeError('`criteria` must be an object.');
  }

  const relationship = criteria.relationship === undefined ? null : lookupAlias(RELATIONSHIP_ALIASES, criteria.relationship, 'relationship');
  const dimension = criteria.dimensions === undefined ? null : lookupAlias(DIMENSION_ALIASES, criteria.dimensions, 'dimensions');

  let dataPoints = null;
  if (criteria.dataPoints !== undefined) {
    if (typeof criteria.dataPoints !== 'number' || !Number.isFinite(criteria.dataPoints) || criteria.dataPoints <= 0) {
      throw new TypeError('`dataPoints` must be a positive finite number.');
    }
    dataPoints = criteria.dataPoints;
  }

  let limit = DEFAULT_LIMIT;
  if (criteria.limit !== undefined) {
    if (!Number.isInteger(criteria.limit) || criteria.limit < 1) {
      throw new TypeError('`limit` must be a positive integer.');
    }
    limit = criteria.limit;
  }

  return {
    relationship,
    dimension,
    dataPoints,
    volumeBand: dataPoints === null ? null : bandFor(dataPoints),
    traits: TRAIT_KEYS.filter((key) => criteria[key] === true),
    limit,
  };
}

/** Resolves one alias table entry, throwing with the valid values on a miss. */
function lookupAlias(table, value, field) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new TypeError(`\`${field}\` must be a string or number.`);
  }
  const canonical = table[String(value).toLowerCase()];
  if (!canonical) {
    throw new TypeError(`Unknown ${field} "${value}". Expected one of: ${[...new Set(Object.values(table))].join(', ')}.`);
  }
  return canonical;
}

/** Maps a point count onto its volume band. */
function bandFor(count) {
  return VOLUME_BANDS.find((band) => count >= band.min && count <= band.max);
}

/** Scores one chart, returning its raw score, the maximum it could have earned, and why. */
function scoreChart(chart, criteria) {
  let score = 0;
  let max = 0;
  const reasons = [];

  if (criteria.relationship) {
    max += WEIGHTS.relationship;
    if (chart.relationships.includes(criteria.relationship)) {
      score += WEIGHTS.relationship;
      reasons.push(`shows ${criteria.relationship}`);
    }
  }

  if (criteria.volumeBand) {
    max += WEIGHTS.volume;
    if (chart.volume.best === criteria.volumeBand.id) {
      score += WEIGHTS.volume;
      reasons.push(`built for ${criteria.volumeBand.label}`);
    } else if (chart.volume.ok.includes(criteria.volumeBand.id)) {
      score += WEIGHTS.volume * PARTIAL_VOLUME_CREDIT;
      reasons.push(`workable at ${criteria.volumeBand.label}`);
    }
  }

  if (criteria.dimension) {
    max += WEIGHTS.dimensions;
    if (chart.dimensions.includes(criteria.dimension)) {
      score += WEIGHTS.dimensions;
      reasons.push(`handles ${criteria.dimension} data`);
    }
  }

  if (criteria.traits.length > 0) {
    max += WEIGHTS.traits;
    const matched = criteria.traits.filter((trait) => hasTrait(chart, trait));
    score += (WEIGHTS.traits * matched.length) / criteria.traits.length;
    matched.forEach((trait) => reasons.push(TRAIT_REASONS[trait]));
  }

  return { score, max, reasons };
}

/** Interactivity comes from the registry; the rest are catalog traits. */
function hasTrait(chart, trait) {
  return trait === 'interactive' ? chart.interactive : chart.traits.includes(trait);
}

/** Builds the one-line explanation returned as `rationale`. */
function buildRationale(chart, criteria) {
  const verb = criteria.relationship ? RELATIONSHIP_VERBS[criteria.relationship] : 'visualizing';
  const noun = DIMENSION_NOUNS[criteria.dimension ?? chart.dimensions[0]];
  const subject = criteria.dataPoints === null ? `these ${noun}` : `${criteria.dataPoints} ${noun}`;
  const clauses = criteria.traits
    .filter((trait) => hasTrait(chart, trait) && IMPLIED_TRAITS[criteria.relationship] !== trait)
    .map((trait) => TRAIT_CLAUSES[trait]);
  return ['Best for', verb, subject, ...clauses].join(' ');
}

/** Result returned when no criteria were given, or nothing scored above zero. */
function noMatch(criteria) {
  const reason = criteria.relationship || criteria.dimension || criteria.volumeBand || criteria.traits.length > 0
    ? 'No chart matches that combination of criteria; try relaxing one of them.'
    : `No criteria given. Supply at least one of: relationship, dataPoints, dimensions, ${TRAIT_KEYS.join(', ')}.`;
  return {
    charts: [],
    primary: null,
    confidence: 0,
    rationale: reason,
    matched: false,
    tie: false,
    candidates: [],
    criteria: describeCriteria(criteria),
  };
}

/** Echoes the normalised criteria back to the caller. */
function describeCriteria(criteria) {
  return {
    relationship: criteria.relationship,
    dataPoints: criteria.dataPoints,
    volume: criteria.volumeBand ? criteria.volumeBand.id : null,
    dimensions: criteria.dimension,
    traits: criteria.traits,
  };
}

/** Derives relationship, dimension, and traits from a data sample. */
function inferShape(data, sample) {
  const keys = Object.keys(sample);
  const has = (...names) => names.every((name) => keys.includes(name));
  const numeric = keys.filter((key) => typeof sample[key] === 'number');
  const pack = (relationship, criteria, note, points = data.length) => ({ relationship, criteria, notes: [note], points });

  if (data.some((item) => isPlainObject(item) && Array.isArray(item.children)) || has('parent')) {
    // A hierarchy's top-level length says nothing about its size — one root can
    // hold hundreds of leaves — so count every node instead.
    const points = countNodes(data);
    return pack('composition', { dimensions: 'hierarchical' }, `${points} nodes across nested children: hierarchical data`, points);
  }
  if (has('source', 'target')) {
    return pack('flow', { dimensions: 'network', networks: true }, 'source/target pairs detected: network flow');
  }
  if (has('open', 'high', 'low', 'close')) {
    return pack('financial', { dimensions: '2d', timeSeries: true }, 'OHLC keys detected: financial series');
  }
  if (Array.isArray(sample.values) || Array.isArray(sample.series)) {
    return pack('distribution', { dimensions: 'multi-series' }, 'nested value arrays detected: multi-series data');
  }

  const dateKey = keys.find((key) => DATE_KEYS.includes(key.toLowerCase()) || sample[key] instanceof Date);
  if (dateKey) {
    return pack('distribution', { dimensions: '1d', timeSeries: true }, `"${dateKey}" key detected: time series`);
  }
  if (has('x', 'y')) {
    const sized = keys.some((key) => ['r', 'size', 'radius'].includes(key));
    return pack('correlation', { dimensions: '2d', correlations: true }, sized ? 'x/y plus a size key detected: sized 2D points' : 'x/y pairs detected: 2D points');
  }
  if (numeric.length >= 3) {
    return pack('distribution', { dimensions: 'multi-series' }, `${numeric.length} numeric keys detected: multi-series data`);
  }
  return pack('comparison', { dimensions: '1d' }, 'single label/value pairs detected: 1D categories');
}

/** Total nodes in a nested `children` structure. */
function countNodes(items) {
  return items.reduce((total, item) => {
    if (!isPlainObject(item)) return total;
    return total + 1 + (Array.isArray(item.children) ? countNodes(item.children) : 0);
  }, 0);
}

/** Charts admitted by one option, ranked by the same priority `recommend` uses. */
function chartsWhere(predicate) {
  return CATALOG.filter(predicate).sort((a, b) => a.priority - b.priority).map((chart) => chart.name);
}

/** Step 4 of the tree — extra factors, and the leaf of every branch. */
const FACTOR_QUESTION = {
  question: 'Any additional factors?',
  criterion: 'factors',
  options: TRAIT_KEYS.filter((trait) => trait !== 'interactive').map((trait) => ({
    value: trait,
    label: TRAIT_CLAUSES[trait],
    charts: chartsWhere((chart) => chart.traits.includes(trait)),
  })),
};

/** Step 3 of the tree — dimensionality. */
const DIMENSION_QUESTION = {
  question: 'What dimensions does the data have?',
  criterion: 'dimensions',
  options: [...new Set(Object.values(DIMENSION_ALIASES))].map((dimension) => ({
    value: dimension,
    label: DIMENSION_NOUNS[dimension],
    charts: chartsWhere((chart) => chart.dimensions.includes(dimension)),
    next: FACTOR_QUESTION,
  })),
};

/** Step 2 of the tree — data volume. */
const VOLUME_QUESTION = {
  question: 'How many data points?',
  criterion: 'dataPoints',
  options: VOLUME_BANDS.map((band) => ({
    value: band.id,
    label: band.label,
    charts: chartsWhere((chart) => chart.volume.best === band.id || chart.volume.ok.includes(band.id)),
    next: DIMENSION_QUESTION,
  })),
};

/** Step 1 of the tree — the relationship being shown. */
const DECISION_TREE = {
  question: 'What relationship are you showing?',
  criterion: 'relationship',
  options: [...new Set(Object.values(RELATIONSHIP_ALIASES))].map((relationship) => ({
    value: relationship,
    label: RELATIONSHIP_VERBS[relationship],
    charts: chartsWhere((chart) => chart.relationships.includes(relationship)),
    next: VOLUME_QUESTION,
  })),
};

/** True for a non-null, non-array object. */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Rounds a confidence to two decimals. */
function round(value) {
  return Math.round(value * 100) / 100;
}

export default { recommend, recommendByData, getDecisionTree, getChartCatalog };
