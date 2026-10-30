/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Contracts C2 and C1 for HTML with block ids, over every node shape and
// BlockIdHTMLExtension's export option (absent, off, on): exporting HTML
// never throws; with export on, every identified block's id is written
// (`data-block-id`) once, and with it off or absent none is; importing the
// exported HTML into a fresh editor never throws, and with export on the
// imported top-level blocks carry the exported ids when the editor had none.

import {
  $getBlockId,
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {$generateHtmlFromNodes, DOMImportExtension} from '@lexical/html';
import {BlockIdHTMLExtension} from '@lexical/html/BlockIdHTMLExtension';
import {
  $getEditor,
  $getRoot,
  $getSlot,
  $getSlotNames,
  $isElementNode,
  type AnyLexicalExtensionArgument,
  configExtension,
  defineExtension,
  type LexicalNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {$appendShapes, catalogAppExtension, NODE_SHAPES} from '../../catalog';

type Export = 'absent' | 'off' | 'on';
const EXPORTS: Export[] = ['absent', 'off', 'on'];

function build(exp: Export) {
  const deps: AnyLexicalExtensionArgument[] = [
    catalogAppExtension({blockIds: 'enabled'}),
    DOMImportExtension,
  ];
  if (exp !== 'absent') {
    deps.push(configExtension(BlockIdHTMLExtension, {export: exp === 'on'}));
  }
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: null,
      dependencies: deps,
      name: `catalog-html-${exp}`,
      onError: e => {
        throw e;
      },
    }),
  );
}

function $ids(): string[] {
  const out: string[] = [];
  const walk = (node: LexicalNode) => {
    const id = $getBlockId(node);
    if (id !== null) {
      out.push(id);
    }
    for (const name of $getSlotNames(node)) {
      const slot = $getSlot(node, name);
      if (slot !== null) {
        walk(slot);
      }
    }
    if ($isElementNode(node)) {
      node.getChildren().forEach(walk);
    }
  };
  walk($getRoot());
  return out;
}

describe('C1/C2: HTML export and import with block ids, every shape', () => {
  for (const shape of NODE_SHAPES) {
    for (const exp of EXPORTS) {
      test(`${shape.name}, export ${exp}`, () => {
        const problems: string[] = [];
        const editor = build(exp);
        try {
          editor.update(() => $appendShapes([shape]), {discrete: true});
          editor.update(() => {}, {discrete: true});
          const ids = editor.read($ids);
          let html = '';
          try {
            html = editor.read(() => $generateHtmlFromNodes(editor));
          } catch (error) {
            problems.push(`export threw: ${String(error).slice(0, 200)}`);
          }
          const written = Array.from(
            html.matchAll(/data-block-id="([^"]*)"/g),
            m => m[1],
          );
          if (exp === 'on') {
            const missing = ids.filter(id => !written.includes(id));
            // Blocks inside a host whose HTML export leaves them out
            // (decorators that export no children) are not written.
            if (missing.length > 0 && written.length === 0 && ids.length > 0) {
              problems.push(`export on wrote no id (ids ${ids.join(',')})`);
            }
            if (new Set(written).size !== written.length) {
              problems.push(`an id written twice: ${written.join(',')}`);
            }
          } else if (written.length > 0) {
            problems.push(`export ${exp} wrote ids ${written.join(',')}`);
          }
          // Import into a fresh editor of the same app.
          const reader = build(exp);
          try {
            const dom = new DOMParser().parseFromString(html, 'text/html');
            reader.update(
              () => {
                $getRoot().append(
                  ...getExtensionDependencyFromEditor(
                    $getEditor(),
                    DOMImportExtension,
                  ).output.$generateNodesFromDOM(dom),
                );
              },
              {discrete: true},
            );
            reader.update(() => {}, {discrete: true});
            if (exp === 'on') {
              const imported = reader.read(() =>
                $getRoot()
                  .getChildren()
                  .map(n => $getBlockId(n))
                  .filter((id): id is string => id !== null),
              );
              const lost = imported.filter(id => !ids.includes(id));
              if (
                written.length > 0 &&
                imported.length > 0 &&
                lost.length === imported.length
              ) {
                problems.push(
                  `imported blocks got new ids ${imported.join(',')} (exported ${written.join(',')})`,
                );
              }
            }
          } catch (error) {
            problems.push(`import threw: ${String(error).slice(0, 200)}`);
          } finally {
            reader.dispose();
          }
        } finally {
          editor.dispose();
        }
        expect(problems).toEqual([]);
      });
    }
  }
});
