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
import {act} from 'react-dom/test-utils';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';

function Trap({
  isActive,
  buttons = 3,
  initialFocus = 'firstFocusable',
}: {
  isActive: boolean;
  buttons?: number;
  initialFocus?: 'firstFocusable' | 'container';
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, isActive, initialFocus);
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
    act(() => {
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
    act(() => {
      root.render(<Trap isActive={true} />);
    });
    expect(document.activeElement).toBe(getByTestId('btn-0'));
  });

  test('wraps Tab from the last focusable back to the first', () => {
    act(() => {
      root.render(<Trap isActive={true} />);
    });
    const last = getByTestId('btn-2');
    const first = getByTestId('btn-0');
    act(() => {
      last.focus();
    });
    expect(document.activeElement).toBe(last);
    dispatchTab(last);
    expect(document.activeElement).toBe(first);
  });

  test('wraps Shift+Tab from the first focusable back to the last', () => {
    act(() => {
      root.render(<Trap isActive={true} />);
    });
    const first = getByTestId('btn-0');
    const last = getByTestId('btn-2');
    act(() => {
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

    act(() => {
      root.render(<Trap isActive={true} />);
    });
    expect(document.activeElement).not.toBe(opener);

    act(() => {
      root.render(<Trap isActive={false} />);
    });
    expect(document.activeElement).toBe(opener);

    document.body.removeChild(opener);
  });

  test('restores focus to the previously-focused element on unmount', () => {
    const opener = document.createElement('button');
    opener.textContent = 'Opener';
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    act(() => {
      root.render(<Trap isActive={true} />);
    });
    expect(document.activeElement).not.toBe(opener);

    act(() => {
      root.render(<></>);
    });
    expect(document.activeElement).toBe(opener);

    document.body.removeChild(opener);
  });

  test('no-op when isActive is false', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    act(() => {
      root.render(<Trap isActive={false} />);
    });
    expect(document.activeElement).toBe(opener);
    document.body.removeChild(opener);
  });

  test('handles an empty container by preventing Tab without throwing', () => {
    act(() => {
      root.render(<Trap isActive={true} buttons={0} />);
    });
    const trap = getByTestId('trap');
    act(() => {
      trap.focus();
    });
    expect(() => dispatchTab(trap)).not.toThrow();
  });

  test("focuses the container itself when initialFocus is 'container'", () => {
    act(() => {
      root.render(<Trap isActive={true} initialFocus="container" />);
    });
    expect(document.activeElement).toBe(getByTestId('trap'));
  });

  test("Tab from container (initialFocus 'container') lands on first focusable", () => {
    act(() => {
      root.render(<Trap isActive={true} initialFocus="container" />);
    });
    const trap = getByTestId('trap');
    dispatchTab(trap);
    expect(document.activeElement).toBe(getByTestId('btn-0'));
  });

  test("Shift+Tab from container (initialFocus 'container') lands on last focusable", () => {
    act(() => {
      root.render(<Trap isActive={true} initialFocus="container" />);
    });
    const trap = getByTestId('trap');
    dispatchTab(trap, true);
    expect(document.activeElement).toBe(getByTestId('btn-2'));
  });

  test('advances Tab through middle focusables', () => {
    act(() => {
      root.render(<Trap isActive={true} buttons={4} />);
    });
    const btn1 = getByTestId('btn-1');
    act(() => {
      btn1.focus();
    });
    dispatchTab(btn1);
    expect(document.activeElement).toBe(getByTestId('btn-2'));
  });

  test('advances Shift+Tab through middle focusables', () => {
    act(() => {
      root.render(<Trap isActive={true} buttons={4} />);
    });
    const btn2 = getByTestId('btn-2');
    act(() => {
      btn2.focus();
    });
    dispatchTab(btn2, true);
    expect(document.activeElement).toBe(getByTestId('btn-1'));
  });

  test('focusin safety net pulls focus back inside when it escapes', () => {
    const outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.appendChild(outside);
    act(() => {
      root.render(<Trap isActive={true} />);
    });
    act(() => {
      outside.focus();
    });
    expect(document.activeElement).toBe(getByTestId('btn-0'));
    document.body.removeChild(outside);
  });
});
