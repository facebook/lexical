/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {Klass, LexicalEditor, LexicalNode} from 'lexical';

import {$descendantsMatching} from '@lexical/utils';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isTextNode,
  ParagraphNode,
} from 'lexical';
import {createTestEditor} from 'lexical/src/__tests__/utils';

function assertClass<T extends LexicalNode>(v: unknown, klass: Klass<T>): T {
  if (v instanceof klass) {
    return v as T;
  }
  throw new Error(`Value does not extend ${klass.name}`);
}

function $createTextAndParagraphWithDepth(depth: number): LexicalNode[] {
  if (depth <= 0) {
    return [$createTextNode(`<${depth} />`)];
  }
  return [
    $createTextNode(`<${depth}>`),
    $createParagraphNode().append(
      ...$createTextAndParagraphWithDepth(depth - 1),
    ),
    $createTextNode(`</${depth}>`),
  ];
}

function textContentForDepth(i: number): string {
  return i > 0 ? `<${i}>${textContentForDepth(i - 1)}</${i}>` : `<${i} />`;
}

describe('$descendantsMatching', () => {
  let editor: LexicalEditor;

  beforeEach(async () => {
    editor = createTestEditor();
    editor._headless = true;
  });

  [0, 1, 2].forEach((depth) =>
    it(`Can un-nest children at depth ${depth}`, () => {
      editor.update(
        () => {
          const firstNode = $createParagraphNode();
          $getRoot()
            .clear()
            .append(
              firstNode.append(...$createTextAndParagraphWithDepth(depth)),
            );
        },
        {discrete: true},
      );
      editor.update(
        () => {
          const firstNode = assertClass(
            $getRoot().getFirstChildOrThrow(),
            ParagraphNode,
          );
          expect(firstNode.getChildren().every($isTextNode)).toBe(depth === 0);
          firstNode.splice(
            0,
            firstNode.getChildrenSize(),
            $descendantsMatching(firstNode.getChildren(), $isTextNode),
          );
          expect(firstNode.getChildren().every($isTextNode)).toBe(true);
          expect(firstNode.getTextContent()).toBe(textContentForDepth(depth));
        },
        {discrete: true},
      );
    }),
  );
});
