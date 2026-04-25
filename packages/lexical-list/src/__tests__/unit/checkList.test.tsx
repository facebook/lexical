/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$getRoot} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest';

import {$createListItemNode, $createListNode} from '../..';
import {registerCheckList} from '../../checkList';

// Polyfill PointerEvent for jsdom (mirrors LexicalTableMobileSelection.test.tsx).
interface PointerEventInit extends EventInit {
  clientX?: number;
  clientY?: number;
  pointerType?: string;
}

(global as unknown as {PointerEvent: unknown}).PointerEvent =
  class PointerEventPolyfill extends Event {
    clientX: number;
    clientY: number;
    pointerType: string;

    constructor(type: string, options: PointerEventInit = {}) {
      super(type, options);
      this.clientX = options.clientX || 0;
      this.clientY = options.clientY || 0;
      this.pointerType = options.pointerType || 'mouse';
    }
  };

describe('registerCheckList — mobile tap toggle', () => {
  // jsdom does not implement getComputedStyle with pseudo-elements (see
  // https://github.com/jsdom/jsdom/issues/1928), but the checklist hit-test
  // reads the ::before width to size the marker area. Stub a 16px width so
  // the bounds check resolves to a concrete number; vi.restoreAllMocks
  // returns the original implementation afterwards so the mock cannot leak
  // to other test files in the same worker.
  const originalGetComputedStyle = window.getComputedStyle;
  beforeAll(() => {
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      (element: Element, pseudoElement?: string | null) => {
        if (pseudoElement === '::before') {
          return {width: '16px'} as unknown as CSSStyleDeclaration;
        }
        return originalGetComputedStyle.call(window, element, pseudoElement);
      },
    );
  });
  afterAll(() => {
    vi.restoreAllMocks();
  });

  initializeUnitTest((testEnv) => {
    let cleanup: (() => void) | null = null;

    beforeEach(async () => {
      cleanup = registerCheckList(testEnv.editor);
      await testEnv.editor.update(
        () => {
          const list = $createListNode('check');
          list.append($createListItemNode(false));
          $getRoot().clear().append(list);
        },
        {discrete: true},
      );
    });

    afterEach(() => {
      cleanup?.();
      cleanup = null;
    });

    function getCheckListItem(): HTMLLIElement {
      const li = testEnv.container.querySelector('li');
      if (!li) {
        throw new Error('No <li> rendered');
      }
      return li as HTMLLIElement;
    }

    function isChecked(li: HTMLLIElement): boolean {
      return li.getAttribute('aria-checked') === 'true';
    }

    test('touch pointerup over the marker area toggles the item', async () => {
      const li = getCheckListItem();
      expect(isChecked(li)).toBe(false);

      // clientX is well inside the marker hit area for any plausible
      // ::before width / touch padding combination.
      li.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          clientX: 10,
          clientY: 5,
          pointerType: 'touch',
        }),
      );

      // editor.update() reconciles asynchronously — wait for the DOM rather
      // than assuming a fixed number of microtasks.
      await vi.waitFor(() => expect(isChecked(li)).toBe(true));
    });

    test('mouse pointerup is ignored (click stays the desktop path)', () => {
      const li = getCheckListItem();
      expect(isChecked(li)).toBe(false);

      li.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          clientX: 10,
          clientY: 5,
          pointerType: 'mouse',
        }),
      );

      expect(isChecked(li)).toBe(false);
    });

    test('pointerup followed by a synthesized click does not double-toggle', async () => {
      const li = getCheckListItem();
      expect(isChecked(li)).toBe(false);

      const baseTimeStamp = 1000;
      const pointerUp = new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        clientX: 10,
        clientY: 5,
        pointerType: 'touch',
      });
      Object.defineProperty(pointerUp, 'timeStamp', {value: baseTimeStamp});
      li.dispatchEvent(pointerUp);
      await vi.waitFor(() => expect(isChecked(li)).toBe(true));

      // Browsers where touchstart preventDefault did not suppress click will
      // also fire it shortly after. The dedup window must absorb it.
      const click = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 10,
        clientY: 5,
      });
      Object.defineProperty(click, 'timeStamp', {value: baseTimeStamp + 50});
      li.dispatchEvent(click);

      // Give any queued reconciliation a chance to run, then assert the
      // state has not flipped back.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(isChecked(li)).toBe(true);
    });
  });
});
