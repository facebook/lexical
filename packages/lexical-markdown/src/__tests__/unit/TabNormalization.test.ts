/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node

import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {expect, it} from 'vitest';

it.each(['$convertFromMarkdownString', '$generateNodesFromMarkdownString'])(
  '%s imports 66,000 tabs without a stack overflow',
  importName => {
    // Vitest worker threads have a larger stack than a normal Node process.
    const result = spawnSync(
      process.execPath,
      [
        '--stack-size=984',
        '--conditions=source',
        '--import',
        'tsx',
        '--input-type=module',
        '-e',
        `
        import assert from 'node:assert/strict';
        globalThis.__DEV__ = true;
        const {createHeadlessEditor} = await import('@lexical/headless');
        const markdown = await import('@lexical/markdown');
        const {$getRoot, $isParagraphNode, $isTabNode} = await import('lexical');
        for (const chunk of ['\\t', 'x\\t']) {
          const tabCount = 66000;
          const source = 'start' + chunk.repeat(tabCount) + 'end';
          const editor = createHeadlessEditor({
            onError(error) { throw error; },
          });
          editor.update(() => {
            const nodes = markdown[process.argv[1]](source, []);
            if (nodes) {
              assert.equal(nodes.length, 1);
              $getRoot().append(...nodes);
            }
          }, {discrete: true});
          editor.read('latest', () => {
            const root = $getRoot();
            const paragraph = root.getFirstChildOrThrow();
            assert.ok($isParagraphNode(paragraph));
            assert.equal(root.getChildrenSize(), 1);
            assert.equal(root.getTextContent(), source);
            assert.equal(paragraph.getChildren().filter($isTabNode).length, tabCount);
          });
        }
      `,
        importName,
      ],
      {
        cwd: fileURLToPath(new URL('../../../../../', import.meta.url)),
        encoding: 'utf8',
        timeout: 10_000,
      },
    );

    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
  },
  15_000,
);
