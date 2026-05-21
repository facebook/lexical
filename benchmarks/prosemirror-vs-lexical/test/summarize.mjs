#!/usr/bin/env node
// Summarize the JSON metric files produced by the stress test into a single
// markdown-friendly table that can be pasted into RESULTS.md.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = path.join(__dirname, 'results');

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(RESULTS, name), 'utf8'));
}

function summarize(
  label,
  nodeCountFile,
  perFile,
  layoutFile,
  heapFile,
  scriptFile,
) {
  const nodeCounts = readJson(nodeCountFile);
  const finalNodeCount = nodeCounts.length
    ? nodeCounts[nodeCounts.length - 1].nodeCount
    : 0;
  const startTime = nodeCounts.length ? nodeCounts[0].time : 0;
  const endTime = nodeCounts.length
    ? nodeCounts[nodeCounts.length - 1].time
    : 0;
  const elapsedMin = ((endTime - startTime) / 1000 / 60).toFixed(2);
  const layout = readJson(layoutFile);
  const heap = readJson(heapFile);
  const script = readJson(scriptFile);
  const last = arr => (arr.length ? arr[arr.length - 1] : null);
  const lastLayout = last(layout);
  const lastHeap = last(heap);
  const lastScript = last(script);
  const heapMB = v => (v == null ? '—' : `${v.toFixed(1)} MB`);
  const fmt = v => (v == null ? '—' : v.toFixed(2));
  return [
    `### ${label}`,
    `- Final node count: **${finalNodeCount}** (over ${elapsedMin} min)`,
    `- LayoutCount at end: ${fmt(lastLayout?.value)} (at nodeCount ${lastLayout?.nodeCount ?? '—'})`,
    `- JSHeapUsedSize at end: ${heapMB(lastHeap?.value)} (at nodeCount ${lastHeap?.nodeCount ?? '—'})`,
    `- ScriptDuration at end: ${fmt(lastScript?.value)} s (at nodeCount ${lastScript?.nodeCount ?? '—'})`,
    '',
  ].join('\n');
}

console.log('# Benchmark Summary\n');
console.log(`Generated: ${new Date().toISOString()}\n`);
console.log(
  summarize(
    'Lexical',
    'L-nodecount.json',
    'L-perfMetrics.json',
    'Lexical-LayoutCount.json',
    'Lexical-JSHeapUsedSize.json',
    'Lexical-ScriptDuration.json',
  ),
);
console.log(
  summarize(
    'ProseMirror',
    'PM-nodecount.json',
    'PM-perfMetrics.json',
    'ProseMirror-LayoutCount.json',
    'ProseMirror-JSHeapUsedSize.json',
    'ProseMirror-ScriptDuration.json',
  ),
);
