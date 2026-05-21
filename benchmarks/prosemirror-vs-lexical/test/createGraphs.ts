import {metrics} from './constants';
import {filterMetric} from './utils';
import {TimeAtNodeCount} from './types';
const lexicalMetrics = require('./results/L-perfMetrics.json');
const pmMetrics = require('./results/PM-perfMetrics.json');
const lexicalNodeCounts = require('./results/L-nodecount.json');
const pmNodeCounts = require('./results/PM-nodecount.json');
const {createGraph} = require('./utils');

// ** TIME(x) - NODECOUNT (y) GRAPHS ** //
const createTimeNodecountGraphs = () => {
  // please comment out the lexicalDataset and pmDataset constants if you'd like to have milliseconds as unit and
  // use the lexicalNodeCounts and pmNodeCounts constants for graph creation below
  const lexicalDataset = lexicalNodeCounts.map((d: TimeAtNodeCount) => {
    return {
      nodeCount: d.nodeCount,
      time: Math.round(d.time / 1000),
    };
  });

  const pmDataset = pmNodeCounts.map((d: TimeAtNodeCount) => {
    return {
      nodeCount: d.nodeCount,
      time: Math.round(d.time / 1000),
    };
  });

  // both editors
  createGraph({
    lexicalDataset,
    pmDataset,
    metric: 'nodeCount',
    fileName: 'Nodecount',
  });

  // Lexical
  createGraph({
    lexicalDataset,
    pmDataset: null,
    metric: 'nodeCount',
    fileName: 'Lexical-Nodecount',
  });

  // ProseMirror
  createGraph({
    lexicalDataset: null,
    pmDataset,
    metric: 'nodeCount',
    fileName: 'ProseMirror-Nodecount',
  });
};
createTimeNodecountGraphs();

// ** NODECOUNT(x) - METRIC(y) GRAPHS ** //
metrics.forEach((metric: string) => {
  const lexicalDataset = filterMetric({
    filterFor: metric,
    perfDataWithNodeCount: lexicalMetrics,
  });

  const pmDataset = filterMetric({
    filterFor: metric,
    perfDataWithNodeCount: pmMetrics,
  });

  // both editors
  createGraph({
    lexicalDataset,
    pmDataset,
    metric,
  });

  // Lexical
  createGraph({
    lexicalDataset,
    pmDataset: null,
    metric,
    fileName: `Lexical-${metric}`,
  });

  // ProseMirror
  createGraph({
    lexicalDataset: null,
    pmDataset,
    metric,
    fileName: `ProseMirror-${metric}`,
  });
});
