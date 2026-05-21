import {Page} from '@playwright/test';
import {MetricNodeCountPair, Metric, yDataset} from './types';
import {
  folderPath,
  folderPathGraphs,
  lexicalColors,
  pmColors,
} from './constants';
// @ts-ignore
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');
const {Chart} = require('chart.js/auto');

export const findEditor = async (
  page: Page,
  editor: string,
  querySelector: string,
) => {
  await page.goto(`http://localhost:3000/${editor}`);
  await page.waitForSelector(querySelector);
  await page.click(querySelector);

  // to send the console messages from the browser to the CLI (if there's any)
  page.on('console', consoleMessage => {
    if (consoleMessage.type() === 'error') return;
    console.log(
      `${
        editor === 'prosemirror' ? 'PM' : 'Lexical'
      }, browser console: \n${consoleMessage.text()}`,
    );
  });
};

const convertToMB = (v: number, filterFor: string) => {
  if (v && filterFor === 'JSHeapUsedSize') {
    return v / 1048576;
  }
  return v;
};

// Filters the performance data for each enabled metric
export const filterMetric = ({
  filterFor,
  perfDataWithNodeCount,
}: {
  filterFor: string;
  perfDataWithNodeCount: MetricNodeCountPair[];
}) => {
  return perfDataWithNodeCount.map(
    (metricNodeCountPair: MetricNodeCountPair) => {
      const filteredMetric = metricNodeCountPair.metrics.filter(
        (metric: Metric) => {
          if (metric.name === filterFor) return metric.value;
        },
      );
      console.log(filterFor);
      return {
        value: convertToMB(filteredMetric[0].value, filterFor),
        // value: filteredMetric[0].value, // please use this line as 'value' if you'd like to have bytes as unit
        nodeCount: metricNodeCountPair.nodeCount,
      };
    },
  );
};

// Creates a JSON file for the filtered metrics
export const createFilteredFile = ({
  filterFor,
  perfDataWithNodeCount,
  editor,
}: {
  filterFor: string;
  perfDataWithNodeCount: MetricNodeCountPair[];
  editor: string;
}) => {
  const filteredMetrics = filterMetric({
    filterFor,
    perfDataWithNodeCount,
  });

  const fileName = `${editor}-${filterFor}.json`;

  fs.writeFile(
    path.join(folderPath, fileName),
    JSON.stringify(filteredMetrics),
    'utf8',
    (err: any) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(`* File: ${filterFor}-nodeCount created for ${editor}`);
    },
  );
};

const createDataset = (
  label: string,
  data: Array<{nodeCount: number; value: number | null; time: number | null}>,
  colors: {backgroundColor: string; borderColor: string},
): yDataset => ({
  label,
  data,
  backgroundColor: colors.backgroundColor,
  pointRadius: 2,
  borderColor: colors.borderColor,
  borderWidth: 1,
  spanGaps: true,
});

const colorPlugin = {
  id: 'customCanvasBackgroundColor',
  beforeDraw: (chart: typeof Chart) => {
    const {ctx} = chart;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  },
};

export const createGraph = ({
  lexicalDataset,
  pmDataset,
  metric,
  fileName,
}: {
  lexicalDataset: Array<{
    nodeCount: number;
    value: number | null;
    time: number | null;
  }> | null;
  pmDataset: Array<{
    nodeCount: number;
    value: number | null;
    time: number | null;
  }> | null;
  metric: string;
  fileName?: string;
}) => {
  const dom = new JSDOM(
    '<!DOCTYPE html><html lang="eng"><body><canvas id="myChart" width="800" height="400"> </canvas></body></html>',
  );
  global.window = dom.window;
  global.document = dom.window.document;

  const canvas = document.getElementById('myChart') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');

  let datasets: yDataset[] = [];

  if (lexicalDataset) {
    datasets.push(createDataset('Lexical', lexicalDataset, lexicalColors));
  }

  if (pmDataset) {
    datasets.push(createDataset('ProseMirror', pmDataset, pmColors));
  }

  const isMetric = metric !== 'nodeCount';
  let xAxisText: string;
  let graphTitle: string;
  let parsing: {yAxisKey: string; xAxisKey: string};

  if (isMetric) {
    xAxisText = 'nodeCount';
    graphTitle = metric;
    parsing = {xAxisKey: 'nodeCount', yAxisKey: 'value'};
  } else {
    xAxisText = 'time, s';
    graphTitle = 'Nodecount';
    parsing = {xAxisKey: 'time', yAxisKey: 'nodeCount'};
  }

  // Create the graph
  new Chart(ctx, {
    type: 'line',
    data: {
      datasets: datasets,
    },
    plugins: [colorPlugin],
    options: {
      parsing: parsing,
      plugins: {
        title: {
          display: true,
          text: graphTitle,
        },
      },
      responsive: false,
      scales: {
        x: {
          type: 'linear',
          beginAtZero: true,
          display: true,
          title: {
            display: true,
            text: xAxisText,
          },
        },
        y: {
          beginAtZero: true,
          display: true,
          title: {
            display: true,
            text: metric,
          },
        },
      },
    },
  });

  const givenFileName = fileName ? fileName : `${metric}-nodeCount`;
  const base64Data = canvas.toDataURL().replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(
    path.join(folderPathGraphs, `${givenFileName}.png`),
    base64Data,
    'base64',
  );

  console.log(`* Graph: ${givenFileName} created`);
};
