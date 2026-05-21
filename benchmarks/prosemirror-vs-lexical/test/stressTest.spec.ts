import {Page, test, CDPSession} from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {findEditor, createFilteredFile} from './utils';
import {
  folderPath,
  lexicalParams,
  prosemirrorParams,
  perfMetricsL,
  perfMetricsPM,
  savedNodeCountsL,
  savedNodeCountsPM,
  MEASUREMENT_INTERVAL,
  MAX_NODES,
  NODECOUNT_CHECKPOINT,
  metrics,
} from './constants';
import {EditorParams} from './types';

let page: Page;
let session: CDPSession;

let activeEditor: EditorParams;
let nodeCount: number = 0;
let metricInterval: NodeJS.Timeout;

test.beforeEach(async ({browser}) => {
  page = await browser.newPage();
  session = await page.context().newCDPSession(page);
  await session.send('Performance.enable');

  // set an interval to read the selected metrics in every MEASUREMENT_INTERVAL
  metricInterval = setInterval(async () => {
    const perfMetrics = await session.send('Performance.getMetrics');
    const filteredPerfMetrics = perfMetrics.metrics.filter(metric =>
      metrics.includes(metric.name),
    );
    activeEditor.perfMetrics.push({
      metrics: filteredPerfMetrics,
      nodeCount,
      time: performance.now(),
    });
  }, MEASUREMENT_INTERVAL);

  nodeCount = 0;
});

test.afterEach(async () => {
  const time = new Date().toLocaleTimeString();
  console.log(
    `${activeEditor.name} test ENDS at`,
    time,
    'with the nodecount of',
    nodeCount,
  );

  clearInterval(metricInterval);

  fs.writeFile(
    path.join(folderPath, activeEditor.nodeCountFileName),
    JSON.stringify(activeEditor.nodeCountMetrics),
    'utf8',
    err => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(
        `* Result: ${activeEditor.name} nodeCount is in: results/${activeEditor.nodeCountFileName}`,
      );
    },
  );

  fs.writeFile(
    path.join(folderPath, activeEditor.perfMetricsFileName),
    JSON.stringify(activeEditor.perfMetrics),
    'utf8',
    err => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(
        `* Result: ${activeEditor.name} performance test is in: results/${activeEditor.perfMetricsFileName}`,
      );
    },
  );

  //* do you need JSON files of each enabled metric with the current nodecount?
  const performanceMetrics =
    activeEditor.name === 'Lexical' ? perfMetricsL : perfMetricsPM;

  metrics.forEach(m => {
    createFilteredFile({
      filterFor: m,
      perfDataWithNodeCount: performanceMetrics,
      editor: activeEditor.name,
    });
  });
  // */

  await page.close();
});

async function runStressTest({
  editorName,
  editor,
  page,
  querySelector,
}: {
  editorName: string;
  editor: string;
  page: Page;
  querySelector: string;
}) {
  await findEditor(page, editor, querySelector);

  const time = new Date().toLocaleTimeString();
  console.log(`\n***********\n${editorName} test STARTS at`, time);

  activeEditor.nodeCountMetrics.push({
    nodeCount: nodeCount,
    time: performance.now(),
  });

  // the test itself just types a word and hits enter in a loop
  for (let i = 0; i < MAX_NODES; i++) {
    await page.keyboard.type('typing ');
    await page.keyboard.press('Enter');

    nodeCount = i + 1;

    if (nodeCount % NODECOUNT_CHECKPOINT === 0) {
      activeEditor.nodeCountMetrics.push({
        nodeCount: nodeCount,
        time: performance.now(),
      });
    }
  }
}

test(`Lexical stress test: infinite nodes`, async () => {
  activeEditor = lexicalParams;

  await runStressTest({
    editorName: activeEditor.name,
    editor: activeEditor.editor,
    page: page,
    querySelector: activeEditor.querySelector,
  });
});

test(`ProseMirror stress test: infinite nodes`, async () => {
  activeEditor = prosemirrorParams;

  await runStressTest({
    editorName: activeEditor.name,
    editor: activeEditor.editor,
    page: page,
    querySelector: activeEditor.querySelector,
  });
});
