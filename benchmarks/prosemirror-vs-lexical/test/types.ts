import {Protocol} from 'playwright-core/types/protocol';

export type MetricsAtNodeCount = {
  metrics: Protocol.Performance.Metric[];
  nodeCount: number;
  time: number;
};

export type Metric = {
  name: string;
  value: number;
};

export type MetricNodeCountPair = {
  metrics: Metric[];
  nodeCount: number;
};

export type TimeAtNodeCount = {nodeCount: number; time: number};

export type EditorParams = {
  name: string;
  editor: string;
  querySelector: string;
  nodeCountFileName: string;
  perfMetricsFileName: string;
  perfMetrics: MetricsAtNodeCount[];
  nodeCountMetrics: TimeAtNodeCount[];
};

export type yDataset = {
  label: string;
  data: Array<{nodeCount: number; value: number | null; time: number | null}>;
  backgroundColor: string;
  pointRadius: number;
  borderColor: string;
  borderWidth: number;
  spanGaps: boolean;
};
