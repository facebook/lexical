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
  $create,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSlot,
  $isElementNode,
  $isTextNode,
  $setSelection,
  $setSlot,
  ElementNode,
  type LexicalNode,
  type TextNode,
} from 'lexical';
import {
  $createTestShadowRootNode,
  TestShadowRootNode,
} from 'lexical/src/__tests__/utils';
import {LexicalNode as LexicalNodeClass} from 'lexical/src/LexicalNode';
import {describe, expect, test, vi} from 'vitest';

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

// The walk up to a selected node's block never leaves the block container
// that holds the node: an inline shadow root inside a paragraph is a scope of
// its own, so the quote goes inside it and the paragraph around it stays.
// Input space: a shadow root that is inline (in the paragraph's text, inside
// a mark in it) or a block (at the root, or the paragraph's named slot
// value; a slot value is never inline); empty, holding a paragraph, or
// holding text directly; the
// selection as a caret in it (in the empty scope, or in the inner text) or
// the whole inner text; with and without NodeStructureExtension.
/** A block's content as $content prints it, with the scope's own content left out. */
function $outside(node: LexicalNode, scopeKey: string): string {
  if (node.getKey() === scopeKey) {
    return 'scope';
  }
  if ($isElementNode(node)) {
    return `${node.getType()}(${node
      .getChildren()
      .map(child => $outside(child, scopeKey))
      .join(',')})`;
  }
  return $content(node);
}

class InlineShadowNode extends ElementNode {
  $config() {
    return this.config('test_wrap_inline_shadow', {extends: ElementNode});
  }
  isInline(): true {
    return true;
  }
  isShadowRoot(): true {
    return true;
  }
  canBeEmpty(): true {
    return true;
  }
}

const SCOPES = [
  'inline, in the paragraph',
  'inline, in a mark in the paragraph',
  'block, at the root',
  "block, the paragraph's slot value",
] as const;

describe('$wrapNodes keeps a selection in a shadow root inside that scope', () => {
  for (const structure of [false, true]) {
    for (const scope of SCOPES) {
      for (const content of [
        'empty',
        'holding a paragraph',
        'holding text',
      ] as const) {
        const filled = content !== 'empty';
        for (const where of filled
          ? ['caret in the inner text', 'the whole inner text']
          : ['caret in the empty scope']) {
          test(`${scope}, ${content}, ${where}${structure ? ', NodeStructureExtension' : ''}`, () => {
            using editor = buildEditorFromExtensions({
              dependencies: structure ? [NodeStructureExtension] : [],
              name: '@wrapNodes-shadow-scope-test',
              nodes: [
                InlineShadowNode,
                MarkNode,
                QuoteNode,
                TestShadowRootNode,
              ],
            });
            let outside = '';
            let parentKey = '';
            let scopeKey = '';
            editor.update(
              () => {
                $getRoot().clear();
                const shadow = scope.startsWith('inline')
                  ? $create(InlineShadowNode)
                  : $createTestShadowRootNode();
                if (content === 'holding a paragraph') {
                  shadow.append(
                    $createParagraphNode().append($createTextNode('inside')),
                  );
                } else if (content === 'holding text') {
                  shadow.append($createTextNode('inside'));
                }
                // Token mode keeps the two outside texts apart when nothing
                // is left between them.
                const parent = $createParagraphNode().append(
                  $createTextNode('outside before').setMode('token'),
                );
                if (scope === 'inline, in the paragraph') {
                  parent.append(shadow);
                } else if (scope === 'inline, in a mark in the paragraph') {
                  parent.append($createMarkNode(['c1']).append(shadow));
                } else if (scope.endsWith('slot value')) {
                  $setSlot(parent, 'scope', shadow);
                }
                parent.append(
                  $createTextNode('outside after').setMode('token'),
                );
                $getRoot().append(parent);
                if (scope === 'block, at the root') {
                  $getRoot().append(shadow);
                }
                parentKey = parent.getKey();
                scopeKey = shadow.getKey();
                outside = $outside(parent, scopeKey);
              },
              {discrete: true},
            );
            editor.update(
              () => {
                const shadow = $getNodeByKey(scopeKey) as ElementNode;
                const selection = $createRangeSelection();
                if (!filled) {
                  selection.anchor.set(scopeKey, 0, 'element');
                  selection.focus.set(scopeKey, 0, 'element');
                } else {
                  const inside = $textOf(shadow, 'inside');
                  const caret = where === 'caret in the inner text';
                  selection.anchor.set(inside.getKey(), caret ? 3 : 0, 'text');
                  selection.focus.set(inside.getKey(), caret ? 3 : 6, 'text');
                }
                $setSelection(selection);
                $wrapNodes(selection, () => $createQuoteNode());
              },
              {discrete: true},
            );
            editor.read(() => {
              const parent = $getNodeByKey(parentKey) as ElementNode;
              const shadow = $getNodeByKey(scopeKey) as ElementNode;
              expect(parent.isAttached()).toBe(true);
              expect($outside(parent, scopeKey)).toBe(outside);
              if (scope.endsWith('slot value')) {
                expect($getSlot(parent, 'scope')?.getKey()).toBe(scopeKey);
              }
              expect($content(shadow)).toBe(
                `${shadow.getType()}(quote(${filled ? '"inside"' : ''}))`,
              );
            });
          });
        }
      }
    }
  }
});

// Each selected node's block is found by walking up its inline ancestors; the
// walks share what they found, so a whole paragraph with content nested n
// inline elements deep costs parent lookups linear in n.
class DeepInlineNode extends ElementNode {
  $config() {
    return this.config('test_wrap_deep_inline', {extends: ElementNode});
  }
  isInline(): true {
    return true;
  }
}

function parentLookups(depth: number): {calls: number; nodes: number} {
  using editor = buildEditorFromExtensions({
    name: '@wrapNodes-depth-cost-test',
    nodes: [DeepInlineNode, QuoteNode],
  });
  let calls = 0;
  let nodes = 0;
  editor.update(
    () => {
      $getRoot().clear();
      let inner: LexicalNode = $createTextNode('inner');
      for (let i = 0; i < depth; i++) {
        inner = $create(DeepInlineNode).append(inner);
      }
      $getRoot().append(
        $createParagraphNode().append(
          $createTextNode('prefix'),
          inner,
          $createTextNode('suffix'),
        ),
      );
    },
    {discrete: true},
  );
  editor.update(
    () => {
      const paragraph = $getRoot().getFirstChildOrThrow() as ElementNode;
      const selection = $createRangeSelection();
      selection.anchor.set(paragraph.getKey(), 0, 'element');
      selection.focus.set(
        paragraph.getKey(),
        paragraph.getChildrenSize(),
        'element',
      );
      $setSelection(selection);
      nodes = selection.getNodes().length;
      const getParent = LexicalNodeClass.prototype.getParent;
      const spy = vi
        .spyOn(LexicalNodeClass.prototype, 'getParent')
        .mockImplementation(function (this: LexicalNode) {
          calls++;
          return getParent.call(this);
        });
      try {
        $wrapNodes(selection, () => $createQuoteNode());
      } finally {
        spy.mockRestore();
      }
    },
    {discrete: true},
  );
  return {calls, nodes};
}

test('$wrapNodes looks up parents linearly in the inline nesting depth', () => {
  const [d32, d64, d128] = [32, 64, 128].map(parentLookups);
  expect(d128.nodes).toBeGreaterThan(d64.nodes);
  // Doubling the depth at most a little more than doubles the lookups (a
  // walk per node from scratch quadruples them).
  expect(d128.calls / d64.calls).toBeLessThan(2.5);
  expect(d64.calls / d32.calls).toBeLessThan(2.5);
});
