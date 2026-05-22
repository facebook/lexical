/**
 * Summarize a Chrome .heapsnapshot file:
 * - top object classes by aggregate self_size
 * - top object classes by instance count
 * - per-class breakdown filtered to the Lexical / framework suspects
 *
 *   node scripts/heap-summary.mjs <path-to-heapsnapshot> [topN]
 */
import fs from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/heap-summary.mjs <heapsnapshot> [topN]');
  process.exit(1);
}
const TOP = Number(process.argv[3] ?? 30);

const raw = fs.readFileSync(file, 'utf8');
const snap = JSON.parse(raw);
const meta = snap.snapshot.meta;
const NODE_FIELDS = meta.node_fields; // [type, name, id, self_size, edge_count, detachedness]
const NODE_FIELD_COUNT = NODE_FIELDS.length;
const NODE_TYPES = meta.node_types[0]; // enum of type values
const nodes = snap.nodes;
const strings = snap.strings;

const TYPE_IDX = NODE_FIELDS.indexOf('type');
const NAME_IDX = NODE_FIELDS.indexOf('name');
const SELF_IDX = NODE_FIELDS.indexOf('self_size');

const totalCount = nodes.length / NODE_FIELD_COUNT;
console.log(`total nodes: ${totalCount}, fields/node: ${NODE_FIELD_COUNT}`);

const byClass = new Map();
let grandTotal = 0;
for (let i = 0; i < nodes.length; i += NODE_FIELD_COUNT) {
  const typeIdx = nodes[i + TYPE_IDX];
  const nameIdx = nodes[i + NAME_IDX];
  const selfSize = nodes[i + SELF_IDX];
  grandTotal += selfSize;
  // Use "<type>:<name>" so we can see e.g. closure:onMutation alongside
  // object:LexicalParagraphNode.
  const typeName = NODE_TYPES[typeIdx] ?? `type${typeIdx}`;
  const klass = strings[nameIdx] ?? '';
  const key = `${typeName}:${klass || '(anon)'}`;
  let agg = byClass.get(key);
  if (!agg) {
    agg = {bytes: 0, count: 0};
    byClass.set(key, agg);
  }
  agg.bytes += selfSize;
  agg.count++;
}

const mb = n => `${(n / 1048576).toFixed(2)} MB`;
console.log(
  `grand total self_size: ${mb(grandTotal)} across ${byClass.size} class groups\n`,
);

const sortedByBytes = [...byClass.entries()].sort(
  (a, b) => b[1].bytes - a[1].bytes,
);
console.log(`top ${TOP} groups by total self_size:`);
console.log(['rank', 'bytes', '%total', 'count', 'avg', 'class'].join('\t'));
sortedByBytes.slice(0, TOP).forEach(([key, {bytes, count}], i) => {
  const pct = ((bytes / grandTotal) * 100).toFixed(1);
  const avg = (bytes / count).toFixed(0);
  console.log([`${i + 1}`, mb(bytes), `${pct}%`, count, avg, key].join('\t'));
});

console.log(`\ntop ${TOP} groups by instance count:`);
const sortedByCount = [...byClass.entries()].sort(
  (a, b) => b[1].count - a[1].count,
);
console.log(['rank', 'count', 'bytes', '%total', 'avg', 'class'].join('\t'));
sortedByCount.slice(0, TOP).forEach(([key, {bytes, count}], i) => {
  const pct = ((bytes / grandTotal) * 100).toFixed(1);
  const avg = (bytes / count).toFixed(0);
  console.log([`${i + 1}`, count, mb(bytes), `${pct}%`, avg, key].join('\t'));
});

console.log('\nLexical / framework suspects:');
const suspects = [
  /^object:(.*Node|.*Editor.*|.*EditorState|.*Selection|.*HistoryState|.*HistoryStateEntry|.*HistoryStateEntries|GenMap|.*NodeState|.*NodeStateValues|Map|Set|Array|.*Listener.*|.*Command.*|.*Decorator.*)$/i,
  /^closure:(.*update.*|.*reconc.*|.*commit.*|.*history.*|.*setRootElement.*|.*registerHistory.*)$/i,
  /^native:HTMLParagraphElement$/,
  /^native:HTMLSpanElement$/,
  /^native:HTMLDivElement$/,
  /^native:HTMLBRElement$/,
  /^native:Text$/,
];
const rows = [];
for (const [key, {bytes, count}] of byClass) {
  if (suspects.some(re => re.test(key))) {
    rows.push({bytes, count, key});
  }
}
rows.sort((a, b) => b.bytes - a.bytes);
console.log(['bytes', 'count', 'avg', 'class'].join('\t'));
rows.slice(0, TOP).forEach(({key, bytes, count}) => {
  const avg = (bytes / count).toFixed(0);
  console.log([mb(bytes), count, avg, key].join('\t'));
});
