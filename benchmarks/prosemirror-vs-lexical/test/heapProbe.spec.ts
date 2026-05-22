import {test, expect, CDPSession, Page} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import {findEditor, createFilteredFile} from './utils';
import {folderPath, lexicalParams, metrics} from './constants';

// Standalone heap probe. Drives the live Lexical page with a smaller
// MAX_NODES window than the main stress test (default 2000 — finishes
// in a few minutes on the sandbox) so we can dump a Chrome heap
// snapshot at the end and inspect retainer paths in DevTools.
//
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     PROBE_NODES=2000 \
//     pnpm exec playwright test test/heapProbe.spec.ts
//
// Outputs land in test/results/:
//   - heap-end.heapsnapshot           Chrome DevTools-readable
//   - heap-end.perfMetrics.json       Performance.getMetrics at end
//   - heap-end-checkpoints.json       (nodeCount, JSHeapUsedSize MB) samples
const PROBE_NODES = Number(process.env.PROBE_NODES ?? 2000);
const SAMPLE_EVERY = Number(process.env.PROBE_SAMPLE_EVERY ?? 200);

interface HeapCheckpoint {
  nodeCount: number;
  heapUsedMB: number;
}

async function forceGcAndSample(
  session: CDPSession,
  nodeCount: number,
): Promise<HeapCheckpoint> {
  // Sequence is important: clear, then ask for metrics on the freshly
  // collected heap. Two collectGarbage calls because the first releases
  // bulk, the second mops up finalizers.
  await session.send('HeapProfiler.collectGarbage');
  await session.send('HeapProfiler.collectGarbage');
  const {metrics: perfMetrics} = await session.send('Performance.getMetrics');
  const heap = perfMetrics.find(m => m.name === 'JSHeapUsedSize');
  const heapUsedMB = heap ? heap.value / 1048576 : 0;
  return {heapUsedMB, nodeCount};
}

async function captureHeapSnapshot(
  session: CDPSession,
  filePath: string,
): Promise<void> {
  const chunks: string[] = [];
  const onChunk = ({chunk}: {chunk: string}) => {
    chunks.push(chunk);
  };
  session.on('HeapProfiler.addHeapSnapshotChunk', onChunk);
  await session.send('HeapProfiler.takeHeapSnapshot', {
    reportProgress: false,
    captureNumericValue: false,
  });
  session.off('HeapProfiler.addHeapSnapshotChunk', onChunk);
  fs.writeFileSync(filePath, chunks.join(''), 'utf8');
}

test('heap probe: drive Lexical to PROBE_NODES then snapshot', async ({
  browser,
}) => {
  test.setTimeout(10 * 60 * 1000); // 10 minutes
  const page: Page = await browser.newPage();
  const session: CDPSession = await page.context().newCDPSession(page);
  await session.send('Performance.enable');
  await session.send('HeapProfiler.enable');

  await findEditor(page, lexicalParams.editor, lexicalParams.querySelector);

  const checkpoints: HeapCheckpoint[] = [];
  checkpoints.push(await forceGcAndSample(session, 0));

  const t0 = Date.now();
  for (let i = 1; i <= PROBE_NODES; i++) {
    await page.keyboard.type('typing ');
    await page.keyboard.press('Enter');
    if (i % SAMPLE_EVERY === 0) {
      checkpoints.push(await forceGcAndSample(session, i));
      const last = checkpoints[checkpoints.length - 1];
      const perNode = (
        ((last.heapUsedMB - checkpoints[0].heapUsedMB) * 1024) /
        i
      ).toFixed(2);
      console.log(
        `[${((Date.now() - t0) / 1000).toFixed(0)}s] nodeCount=${i} ` +
          `heap=${last.heapUsedMB.toFixed(1)} MB perNode=${perNode} KB/node`,
      );
    }
  }

  // Final post-GC sample.
  checkpoints.push(await forceGcAndSample(session, PROBE_NODES));

  fs.writeFileSync(
    path.join(folderPath, 'heap-end-checkpoints.json'),
    JSON.stringify(checkpoints, null, 2),
    'utf8',
  );

  // Write perf metrics one more time for completeness.
  const {metrics: finalMetrics} = await session.send('Performance.getMetrics');
  const enabledMetrics = finalMetrics.filter(m => metrics.includes(m.name));
  fs.writeFileSync(
    path.join(folderPath, 'heap-end.perfMetrics.json'),
    JSON.stringify(enabledMetrics, null, 2),
    'utf8',
  );

  const snapshotPath = path.join(folderPath, 'heap-end.heapsnapshot');
  await captureHeapSnapshot(session, snapshotPath);
  const sizeMB = (fs.statSync(snapshotPath).size / 1048576).toFixed(1);
  console.log(`snapshot written: ${snapshotPath} (${sizeMB} MB)`);

  expect(checkpoints.length).toBeGreaterThan(1);
  await page.close();
});
