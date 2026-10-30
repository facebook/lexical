/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $create,
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $parseSerializedNode,
  defineExtension,
  ElementNode,
  type LexicalNode,
  type SerializedLexicalNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

// An element's textFormat and textStyle are persisted only when it has no
// text a reconcile would derive them from (#7968). A reconcile derives them
// from the element's first text at any depth; for an inline element (a link,
// a mark) the JSON now follows that rule too, so a link whose text sits in a
// mark no longer persists them. A block keeps the direct-children check, so
// the JSON of a paragraph whose text is all inside links is unchanged.

class InlineWrapperNode extends ElementNode {
  $config() {
    return this.config('test-inline-wrapper', {extends: ElementNode});
  }
  isInline(): boolean {
    return true;
  }
}

function $wrapper(...children: LexicalNode[]): InlineWrapperNode {
  return $create(InlineWrapperNode)
    .setTextFormat(1)
    .setTextStyle('color: red')
    .append(...children);
}

function withEditor(fn: () => void): void {
  using editor = buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: null,
      name: '[inline-element-text-fields]',
      nodes: [InlineWrapperNode],
    }),
  );
  editor.update(fn, {discrete: true});
}

type Fields = {textFormat?: number; textStyle?: string};

function fields(node: ElementNode): Fields {
  const json = node.exportJSON();
  return {textFormat: json.textFormat, textStyle: json.textStyle};
}

/**
 * What ElementNode persists for a block (ParagraphNode's exportJSON then
 * backfills them from its first text child for #7971).
 */
function serialized(node: ElementNode): Fields {
  return {
    textFormat: node.getSerializedTextFormat(),
    textStyle: node.getSerializedTextStyle(),
  };
}

const PERSISTED: Fields = {textFormat: 1, textStyle: 'color: red'};
const OMITTED: Fields = {textFormat: undefined, textStyle: undefined};

describe('textFormat and textStyle of an inline element', () => {
  test('are omitted when its text sits in an inline element inside it', () => {
    withEditor(() => {
      const inner = $wrapper($createTextNode('text'));
      const outer = $wrapper(inner);
      const outermost = $wrapper($wrapper($wrapper($createTextNode('deep'))));
      $getRoot().append($createParagraphNode().append(outer, outermost));
      expect(fields(outer)).toEqual(OMITTED);
      expect(fields(inner)).toEqual(OMITTED);
      expect(fields(outermost)).toEqual(OMITTED);
    });
  });

  test('are omitted when it holds text of its own, as before', () => {
    withEditor(() => {
      const wrapper = $wrapper($createTextNode('text'));
      $getRoot().append($createParagraphNode().append(wrapper));
      expect(fields(wrapper)).toEqual(OMITTED);
    });
  });

  test('are persisted when it holds no text at any depth, as before', () => {
    withEditor(() => {
      const empty = $wrapper();
      const lineBreak = $wrapper($createLineBreakNode());
      const nested = $wrapper($wrapper($createLineBreakNode()));
      $getRoot().append(
        $createParagraphNode().append(empty, lineBreak, nested),
      );
      expect(fields(empty)).toEqual(PERSISTED);
      expect(fields(lineBreak)).toEqual(PERSISTED);
      expect(fields(nested)).toEqual(PERSISTED);
    });
  });

  test('a stored value is read and no longer written once it has text inside', () => {
    withEditor(() => {
      const stored = {
        children: [
          {
            children: [
              {
                detail: 0,
                format: 1,
                mode: 'normal',
                style: 'color: red',
                text: 'text',
                type: 'text',
                version: 1,
              },
            ],
            direction: null,
            format: '',
            indent: 0,
            textFormat: 1,
            textStyle: 'color: red',
            type: 'test-inline-wrapper',
            version: 1,
          },
        ],
        direction: null,
        format: '',
        indent: 0,
        textFormat: 1,
        textStyle: 'color: red',
        type: 'test-inline-wrapper',
        version: 1,
      } as SerializedLexicalNode;
      const outer = $parseSerializedNode(stored) as InlineWrapperNode;
      expect(outer.getTextFormat()).toBe(1);
      expect(outer.getTextStyle()).toBe('color: red');
      $getRoot().append($createParagraphNode().append(outer));
      expect(fields(outer)).toEqual(OMITTED);
    });
  });
});

describe('textFormat and textStyle of a block', () => {
  test('are persisted when its text is all inside inline elements, as before', () => {
    withEditor(() => {
      const paragraph = $createParagraphNode()
        .setTextFormat(1)
        .setTextStyle('color: red')
        .append($wrapper($createTextNode('text')));
      $getRoot().append(paragraph);
      expect(serialized(paragraph)).toEqual(PERSISTED);
    });
  });

  test('are omitted when it holds text of its own, as before', () => {
    withEditor(() => {
      const paragraph = $createParagraphNode()
        .setTextFormat(1)
        .setTextStyle('color: red')
        .append($createTextNode('text'), $wrapper($createTextNode('more')));
      $getRoot().append(paragraph);
      expect(serialized(paragraph)).toEqual(OMITTED);
    });
  });
});
