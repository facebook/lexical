/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {$createTableNodeWithDimensions, TableExtension} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  defineExtension,
  KEY_ARROW_DOWN_COMMAND,
  type LexicalEditorWithDispose,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';

describe('LexicalTableSelectionHelpers', () => {
  describe('regression #8670', () => {
    let editor: LexicalEditorWithDispose;
    let container: HTMLDivElement;

    function $createTableBelowParagraph() {
      const paragraph = $createParagraphNode().append($createTextNode('above'));
      $getRoot()
        .clear()
        .append(paragraph, $createTableNodeWithDimensions(2, 2, false));
      paragraph.selectEnd();
    }

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      editor = buildEditorFromExtensions(
        defineExtension({
          dependencies: [TableExtension],
          name: 'regression-8670-test',
        }),
      );
      editor.setRootElement(container);
    });

    afterEach(() => {
      editor.dispose();
      document.body.removeChild(container);
    });

    test('selection change ignores the table recorded on ArrowDown when it was removed', () => {
      editor.update($createTableBelowParagraph, {discrete: true});

      // Pressing ArrowDown above the table records the table key to check
      // on the next selection change (the Firefox workaround for scrollable
      // tables, which TableExtension enables by default via
      // hasHorizontalScroll)
      editor.dispatchCommand(
        KEY_ARROW_DOWN_COMMAND,
        new KeyboardEvent('keydown', {key: 'ArrowDown'}),
      );

      // The table is removed before the next selection change occurs
      editor.update(
        () => {
          const root = $getRoot();
          root.getLastChildOrThrow().remove();
          root.selectEnd();
        },
        {discrete: true},
      );

      expect(() =>
        editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined),
      ).not.toThrow();
    });

    test('selection change self-heals observers for tables removed while the root element was detached', () => {
      editor.update($createTableBelowParagraph, {discrete: true});

      // Removing the table while the root element is detached skips
      // reconciliation, so the TableNode destroyed mutation never fires
      // and the observers registry keeps a stale entry
      editor.setRootElement(null);
      editor.update(
        () => {
          $getRoot().getLastChildOrThrow().remove();
        },
        {discrete: true},
      );
      editor.setRootElement(container);

      // Without self-healing every subsequent selection change throws
      expect(() => {
        editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
        editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
      }).not.toThrow();

      // New tables still work after the registry healed itself
      editor.update(
        () => {
          $getRoot().append($createTableNodeWithDimensions(2, 2, false));
        },
        {discrete: true},
      );
      expect(() =>
        editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined),
      ).not.toThrow();
    });
  });
});
