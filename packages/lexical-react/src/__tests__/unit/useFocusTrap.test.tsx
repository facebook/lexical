/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useFocusTrap} from '@lexical/react/useFocusTrap';
import * as React from 'react';
import {useRef} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';

function Trap({isActive, buttons = 3}: {isActive: boolean; buttons?: number}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, isActive);
  return (
    <div ref={ref} tabIndex={-1} data-testid="trap">
      {Array.from({length: buttons}, (_, i) => (
        <button key={i} data-testid={`btn-${i}`}>
          Button {i}
        </button>
      ))}
    </div>
  );
}

function dispatchTab(target: HTMLElement, shiftKey = false): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Tab',
      shiftKey,
    }),
  );
}

describe('useFocusTrap', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    ReactTestUtils.act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  function getByTestId(id: string): HTMLElement {
    const el = container.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    if (el === null) {
      throw new Error(`Element with data-testid=${id} not found`);
    }
    return el;
  }

  test('focuses the first focusable element on activate', () => {
    ReactTestUtils.act(() => {
      root.render(<Trap isActive={true} />);
    });
    expect(document.activeElement).toBe(getByTestId('btn-0'));
  });

  test('wraps Tab from the last focusable back to the first', () => {
    ReactTestUtils.act(() => {
      root.render(<Trap isActive={true} />);
    });
    const last = getByTestId('btn-2');
    const first = getByTestId('btn-0');
    ReactTestUtils.act(() => {
      last.focus();
    });
    expect(document.activeElement).toBe(last);
    dispatchTab(last);
    expect(document.activeElement).toBe(first);
  });

  test('wraps Shift+Tab from the first focusable back to the last', () => {
    ReactTestUtils.act(() => {
      root.render(<Trap isActive={true} />);
    });
    const first = getByTestId('btn-0');
    const last = getByTestId('btn-2');
    ReactTestUtils.act(() => {
      first.focus();
    });
    dispatchTab(first, true);
    expect(document.activeElement).toBe(last);
  });

  test('restores focus to the previously-focused element on deactivate', () => {
    const opener = document.createElement('button');
    opener.textContent = 'Opener';
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    ReactTestUtils.act(() => {
      root.render(<Trap isActive={true} />);
    });
    expect(document.activeElement).not.toBe(opener);

    ReactTestUtils.act(() => {
      root.render(<Trap isActive={false} />);
    });
    expect(document.activeElement).toBe(opener);

    document.body.removeChild(opener);
  });

  test('no-op when isActive is false', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    ReactTestUtils.act(() => {
      root.render(<Trap isActive={false} />);
    });
    expect(document.activeElement).toBe(opener);
    document.body.removeChild(opener);
  });

  test('handles an empty container by preventing Tab without throwing', () => {
    ReactTestUtils.act(() => {
      root.render(<Trap isActive={true} buttons={0} />);
    });
    const trap = getByTestId('trap');
    ReactTestUtils.act(() => {
      trap.focus();
    });
    expect(() => dispatchTab(trap)).not.toThrow();
  });
});
