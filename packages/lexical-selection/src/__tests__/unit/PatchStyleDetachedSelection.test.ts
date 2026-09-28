/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {buildEditorFromExtensions} from '@lexical/extension';
import {$patchStyleText} from '@lexical/selection';
import {
  $createNodeSelection,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isTextNode,
  $setSelection,
} from 'lexical';
import {expect, test} from 'vitest';

test.each(
  (['none', 'collapsed', 'range'] as const).flatMap(active =>
    (['whole', 'partial', 'collapsed', 'node'] as const).map(target => ({
      active,
      target,
    })),
  ),
)(
  'styles the supplied detached selection (active=$active, target=$target)',
  ({active, target}) => {
    using editor = buildEditorFromExtensions({name: 'detached-style'});
    editor.update(
      () => {
        const text = $createTextNode('abc');
        const paragraph = $createParagraphNode().append(text);
        const other = $createTextNode('xyz');
        $getRoot().append(paragraph, $createParagraphNode().append(other));
        const activeSelection =
          active === 'none'
            ? null
            : other.select(0, active === 'range' ? 2 : 0);
        $setSelection(activeSelection);
        const originalActive = activeSelection && activeSelection.clone();
        const selection =
          target === 'node' ? $createNodeSelection() : $createRangeSelection();
        if ('add' in selection) {
          selection.add(text.getKey());
        } else {
          selection.anchor.set(
            text.getKey(),
            target === 'whole' ? 0 : 1,
            'text',
          );
          selection.focus.set(
            text.getKey(),
            target === 'collapsed' ? 1 : target === 'partial' ? 2 : 3,
            'text',
          );
        }
        $patchStyleText(selection, {color: 'red'});
        expect(
          paragraph
            .getChildren()
            .map(node => [
              node.getTextContent(),
              $isTextNode(node) && node.getStyle(),
            ]),
        ).toEqual(
          target === 'partial'
            ? [
                ['a', ''],
                ['b', 'color: red;'],
                ['c', ''],
              ]
            : [['abc', target === 'collapsed' ? '' : 'color: red;']],
        );
        if (target === 'collapsed' && 'style' in selection)
          expect(selection.style).toBe('color: red;');
        expect(other.getParentOrThrow().getChildren()).toEqual([other]);
        expect(other.getStyle()).toBe('');
        expect($getSelection()).toBe(activeSelection);
        if (activeSelection && originalActive) {
          expect(activeSelection.anchor).toMatchObject({
            key: originalActive.anchor.key,
            offset: originalActive.anchor.offset,
            type: originalActive.anchor.type,
          });
          expect(activeSelection.focus).toMatchObject({
            key: originalActive.focus.key,
            offset: originalActive.focus.offset,
            type: originalActive.focus.type,
          });
        }
      },
      {discrete: true},
    );
  },
);
