/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {
  buildEditorFromExtensions,
  NodeStructureExtension,
} from '@lexical/extension';
import {$createLinkNode, LinkNode} from '@lexical/link';
import {$createMarkNode, MarkNode} from '@lexical/mark';
import {$createOverflowNode, OverflowNode} from '@lexical/overflow';
import {$createQuoteNode, QuoteNode} from '@lexical/rich-text';
import {$wrapNodes} from '@lexical/selection';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isTextNode,
  $setSelection,
  type ElementNode,
  type LexicalNode,
  type TextNode,
} from 'lexical';
import {
  $createTestShadowRootNode,
  TestShadowRootNode,
} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

// #9612: $wrapNodes moves the content of each selected text's block into a
// new element. It took that block to be the text's parent, or its
// grandparent when the parent is inline, so an inline element two levels
// up (a link inside a mark) or one that is inline content although its
// isInline() is false (the character limit's OverflowNode) became a "block":
// the paragraph was split and the inline element dropped. The block of a
// selected node is its nearest ancestor that is not inline content.
//
// Input space: every nesting of up to three inline wrappers (link, mark,
// overflow) around the inner text; the selection as a caret before the
// wrappers, a caret inside the innermost text, the whole paragraph, a range
// from inside the innermost text to the end, and a range over this paragraph
// and the next; at the root and inside a shadow root; with and without
// NodeStructureExtension; with and without a wrapping element (a quote).

type Wrapper = 'link' | 'mark' | 'overflow';
const WRAPPERS: Wrapper[] = ['link', 'mark', 'overflow'];

function nestings(depth: number): Wrapper[][] {
  if (depth === 0) {
    return [[]];
  }
  return nestings(depth - 1).flatMap(rest => WRAPPERS.map(w => [w, ...rest]));
}
const SHAPES: Wrapper[][] = [1, 2, 3].flatMap(nestings);

function $wrapper(kind: Wrapper): ElementNode {
  switch (kind) {
    case 'link':
      return $createLinkNode('https://example.net');
    case 'mark':
      return $createMarkNode(['c1']);
    case 'overflow':
      return $createOverflowNode();
  }
}

function $paragraph(shape: Wrapper[]): ElementNode {
  let inner: LexicalNode = $createTextNode('inner');
  for (let i = shape.length - 1; i >= 0; i--) {
    inner = $wrapper(shape[i]).append(inner);
  }
  return $createParagraphNode().append(
    $createTextNode('abc '),
    inner,
    $createTextNode(' end'),
  );
}

/** A block's content as a string: types, nesting and text. */
function $content(node: LexicalNode): string {
  if ($isElementNode(node)) {
    return `${node.getType()}(${node.getChildren().map($content).join(',')})`;
  }
  return $isTextNode(node)
    ? JSON.stringify(node.getTextContent())
    : node.getType();
}

function $textOf(parent: ElementNode, text: string): TextNode {
  const found = parent
    .getAllTextNodes()
    .find(node => node.getTextContent() === text);
  if (!found) {
    throw new Error(`no text node ${text}`);
  }
  return found;
}

const WHERE = [
  'caret before the wrappers',
  'caret inside the inner text',
  'the whole paragraph',
  'from the inner text to the end',
  'this paragraph and the next',
] as const;

const CONTEXTS = ['root', 'shadow root'] as const;

describe('$wrapNodes keeps the inline content of the blocks it wraps (#9612)', () => {
  for (const structure of [false, true]) {
    // Under NodeStructureExtension a quote holds inline content only, so a
    // quote wrapping quotes is not a shape it allows.
    for (const wrapping of structure ? [false] : [false, true]) {
      for (const context of CONTEXTS) {
        for (const where of WHERE) {
          for (const shape of SHAPES) {
            test(`${shape.join(' > ')}, ${where}, in the ${context}${structure ? ', NodeStructureExtension' : ''}${wrapping ? ', with a wrapping element' : ''}`, () => {
              using editor = buildEditorFromExtensions({
                dependencies: structure ? [NodeStructureExtension] : [],
                name: '@wrapNodes-inline-content-test',
                nodes: [
                  LinkNode,
                  MarkNode,
                  OverflowNode,
                  QuoteNode,
                  TestShadowRootNode,
                ],
              });
              let expected = '';
              editor.update(
                () => {
                  $getRoot().clear();
                  const first = $paragraph(shape);
                  const second = $createParagraphNode().append(
                    $createTextNode('next'),
                  );
                  const holder =
                    context === 'root'
                      ? $getRoot()
                      : $createTestShadowRootNode();
                  holder.append(first, second);
                  if (context !== 'root') {
                    $getRoot().append(holder);
                  }
                },
                {discrete: true},
              );
              editor.update(
                () => {
                  const holder =
                    context === 'root'
                      ? $getRoot()
                      : ($getRoot().getFirstChildOrThrow() as ElementNode);
                  const first = holder.getFirstChildOrThrow() as ElementNode;
                  const second = first.getNextSibling() as ElementNode;
                  const inner = $textOf(first, 'inner');
                  const abc = $textOf(first, 'abc ');
                  const end = $textOf(first, ' end');
                  const selection = $createRangeSelection();
                  switch (where) {
                    case 'caret before the wrappers':
                      selection.anchor.set(abc.getKey(), 2, 'text');
                      selection.focus.set(abc.getKey(), 2, 'text');
                      break;
                    case 'caret inside the inner text':
                      selection.anchor.set(inner.getKey(), 2, 'text');
                      selection.focus.set(inner.getKey(), 2, 'text');
                      break;
                    case 'the whole paragraph':
                      selection.anchor.set(abc.getKey(), 0, 'text');
                      selection.focus.set(end.getKey(), 4, 'text');
                      break;
                    case 'from the inner text to the end':
                      selection.anchor.set(inner.getKey(), 2, 'text');
                      selection.focus.set(end.getKey(), 4, 'text');
                      break;
                    case 'this paragraph and the next': {
                      const next = $textOf(second, 'next');
                      selection.anchor.set(inner.getKey(), 2, 'text');
                      selection.focus.set(next.getKey(), 2, 'text');
                      break;
                    }
                  }
                  $setSelection(selection);
                  const wraps =
                    where === 'this paragraph and the next'
                      ? [first, second]
                      : [first];
                  const quoted = wraps
                    .map(
                      block =>
                        `quote(${block.getChildren().map($content).join(',')})`,
                    )
                    .join(',');
                  const rest =
                    wraps.length === 1 ? [$content(second)] : ([] as string[]);
                  expected = (
                    wrapping ? [`quote(${quoted})`, ...rest] : [quoted, ...rest]
                  ).join(',');
                  $wrapNodes(
                    selection,
                    () => $createQuoteNode(),
                    wrapping ? $createQuoteNode() : null,
                  );
                },
                {discrete: true},
              );
              const actual = editor.read(() => {
                const holder =
                  context === 'root'
                    ? $getRoot()
                    : ($getRoot().getFirstChildOrThrow() as ElementNode);
                return holder.getChildren().map($content).join(',');
              });
              expect(actual).toBe(expected);
            });
          }
        }
      }
    }
  }
});
