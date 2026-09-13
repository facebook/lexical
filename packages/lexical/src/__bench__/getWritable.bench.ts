/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {bench, describe} from 'vitest';

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $selectAll,
  createEditor,
  type LexicalEditor,
  type TextNode,
} from '..';

// Headless updates include cloning, transforms, GC and commit, but exclude DOM
// reconciliation. Run with NODE_ENV=production to measure production behavior.
// Keep document size fixed so first-write and reuse costs remain comparable.
for (const size of [100, 1000]) {
  describe(`size=${size} :: writable nodes`, () => {
    for (const workload of [
      '100000 getWritable calls',
      'one text change',
      'one setter per node',
      'five setters per node',
      'replace document',
      'select all and format',
    ]) {
      let editor: LexicalEditor;
      let nodes: TextNode[];
      let cycle: number;

      const $populate = () => {
        nodes = [];
        const root = $getRoot();
        root.clear();
        for (let i = 0; i < size; i++) {
          const text = $createTextNode('original');
          nodes.push(text);
          root.append($createParagraphNode().append(text));
        }
      };

      bench(
        workload,
        () => {
          editor.update(
            () => {
              cycle++;
              const text = cycle % 2 ? 'changed' : 'original';
              const format = cycle % 2 ? 1 : 0;
              switch (workload) {
                case '100000 getWritable calls':
                  for (let i = 0; i < 100000; i++) {
                    nodes[i % nodes.length].getWritable();
                  }
                  break;
                case 'one text change':
                  nodes[nodes.length - 1].setTextContent(text);
                  break;
                case 'one setter per node':
                  for (const node of nodes) {
                    node.setTextContent(text);
                  }
                  break;
                case 'five setters per node':
                  for (const node of nodes) {
                    node
                      .setTextContent(text)
                      .setFormat(format)
                      .setStyle(format ? 'color: red' : '')
                      .setDetail(format)
                      .setMode(format ? 'token' : 'normal');
                  }
                  break;
                case 'replace document':
                  $populate();
                  break;
                case 'select all and format': {
                  $selectAll();
                  const selection = $getSelection();
                  if (!$isRangeSelection(selection)) {
                    throw new Error('Expected a range selection');
                  }
                  selection.formatText('bold');
                  break;
                }
              }
            },
            {discrete: true},
          );
        },
        {
          setup: () => {
            editor = createEditor({
              onError(error) {
                throw error;
              },
            });
            cycle = 0;
            editor.update($populate, {discrete: true});
          },
          throws: true,
        },
      );
    }
  });
}
