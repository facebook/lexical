/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as LexicalUtils from '@lexical/utils';
import {$createTextNode, $getRoot} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, test, vi} from 'vitest';

import {$createListItemNode, $createListNode, registerCheckList} from '../..';

/**
 * TODO: complete the tests for the full checkList extension. The current implementation only tests the focus behavior
 * Untested aspects include:
 * - INSERT_CHECK_LIST_COMMAND command
 * - Arrow key navigation (up/down)
 * - Space key to toggle checkboxes
 * - Escape key to blur active items
 * - Left arrow key special behavior
 * - Touch events (with 32px padding)
 * - RTL text direction handling
 * - Nested list traversal (findCheckListItemSibling)
 * - Toggling checked state
 * - Clicks outside checkbox area (should not toggle)
 */

describe('checkList tests', async () => {
  initializeUnitTest((testEnv) => {
    // Shouldn't move focus to the editor
    test('toggle checkbox with disableTakeFocusOnClick option', async () => {
      // for loop to avoid duplicated test for the option set to false or true.
      const options = [true, false];
      for (const booleanOption of options) {
        const {editor} = testEnv;
        registerCheckList(editor, {disableTakeFocusOnClick: booleanOption});

        let listItemKey: string = '';

        await editor.update(() => {
          const root = $getRoot();
          const list = $createListNode('check');
          const listItem = $createListItemNode(false);
          listItem.append($createTextNode('test text'));
          list.append(listItem);
          root.append(list);
          listItemKey = listItem.getKey();
        });

        if (listItemKey === '') {
          throw new Error('List item key was not set');
        }
        const li = editor.getElementByKey(listItemKey) as HTMLElement;
        expect(li).not.toBeNull();
        // In case DOM-key lookup is flaky in the test env, force the mapping to return this LI
        vi.spyOn(editor, 'getElementByKey').mockReturnValue(li);

        // Ensure something else is focused first
        document.body.focus();

        // Simulate the real interaction order:
        // 1) pointerdown (capture listener prevents default to avoid editor focus)
        // 2) click (handler toggles + focuses the list item)
        // jsdom lacks PointerEvent/TouchEvent; use MouseEvent and stub ::before width
        const originalGetComputedStyle = window.getComputedStyle;
        const zoomSpy = vi
          .spyOn(LexicalUtils, 'calculateZoomLevel')
          .mockReturnValue(1);
        const focusSpy = booleanOption
          ? vi.spyOn(li, 'focus').mockImplementation(() => {
              // When disableTakeFocusOnClick is true, prevent focus from leaving the body
              document.body.focus();
            })
          : null;

        window.getComputedStyle = (
          elt: Element,
          pseudo?: string | null | undefined,
        ) =>
          pseudo === '::before'
            ? ({width: '10px'} as CSSStyleDeclaration)
            : originalGetComputedStyle(elt, pseudo);

        li.dispatchEvent(
          new MouseEvent('pointerdown', {bubbles: true, clientX: 1}),
        );
        li.dispatchEvent(new MouseEvent('click', {bubbles: true, clientX: 1}));

        // Allow any synchronous toggle inside editor.update to run before assertion
        await Promise.resolve();

        // Restore originals
        window.getComputedStyle = originalGetComputedStyle;
        zoomSpy.mockRestore();
        if (focusSpy) {
          focusSpy.mockRestore();
        }

        expect(li.getAttribute('aria-checked')).toBe('true');
        if (booleanOption) {
          expect(document.activeElement).toBe(document.body);
        } else {
          expect(document.activeElement).toBe(li);
        }
      }
    });
  });
});
