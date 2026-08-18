/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {FocusTrapExtension} from '@lexical/a11y';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {useLexicalFocusTrapRef} from '@lexical/react/useLexicalFocusTrapRef';
import * as React from 'react';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';

function Trap({
  isActive,
  buttons = 3,
  initialFocus = 'firstFocusable',
  allowOutside,
}: {
  isActive: boolean;
  buttons?: number;
  initialFocus?: 'firstFocusable' | 'container';
  allowOutside?: (target: HTMLElement) => boolean;
}) {
  const ref = useLexicalFocusTrapRef(isActive, initialFocus, allowOutside);
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

function WithExtension({children}: {children: React.ReactNode}) {
  return (
    <LexicalExtensionComposer extension={FocusTrapExtension}>
      {children}
    </LexicalExtensionComposer>
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

describe('useLexicalFocusTrapRef', () => {
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
      root.render(
        <WithExtension>
          <Trap isActive={true} />
        </WithExtension>,
      );
    });
    expect(document.activeElement).toBe(getByTestId('btn-0'));
  });

  test('wraps Tab from the last focusable back to the first', () => {
    act(() => {
      root.render(
        <WithExtension>
          <Trap isActive={true} />
        </WithExtension>,
      );
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
      root.render(
        <WithExtension>
          <Trap isActive={true} />
        </WithExtension>,
      );
    });
    const first = getByTestId('btn-0');
    const last = getByTestId('btn-2');
    act(() => {
      first.focus();
    });
    dispatchTab(first, true);
    expect(document.activeElement).toBe(last);
  });

  test('deactivates the trap when isActive becomes false', () => {
    act(() => {
      root.render(
        <WithExtension>
          <Trap isActive={true} />
        </WithExtension>,
      );
    });
    expect(document.activeElement).toBe(getByTestId('btn-0'));

    act(() => {
      root.render(
        <WithExtension>
          <Trap isActive={false} />
        </WithExtension>,
      );
    });

    const outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.appendChild(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);
    document.body.removeChild(outside);
  });

  test('deactivates the trap on unmount', () => {
    act(() => {
      root.render(
        <WithExtension>
          <Trap isActive={true} />
        </WithExtension>,
      );
    });
    expect(document.activeElement).toBe(getByTestId('btn-0'));

    act(() => {
      root.render(<></>);
    });

    const outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.appendChild(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);
    document.body.removeChild(outside);
  });

  test('no-op when isActive is false', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    act(() => {
      root.render(
        <WithExtension>
          <Trap isActive={false} />
        </WithExtension>,
      );
    });
    expect(document.activeElement).toBe(opener);
    document.body.removeChild(opener);
  });

  test('handles an empty container by preventing Tab without throwing', () => {
    act(() => {
      root.render(
        <WithExtension>
          <Trap isActive={true} buttons={0} />
        </WithExtension>,
      );
    });
    const trap = getByTestId('trap');
    act(() => {
      trap.focus();
    });
    expect(() => dispatchTab(trap)).not.toThrow();
  });

  test("focuses the container itself when initialFocus is 'container'", () => {
    act(() => {
      root.render(
        <WithExtension>
          <Trap isActive={true} initialFocus="container" />
        </WithExtension>,
      );
    });
    expect(document.activeElement).toBe(getByTestId('trap'));
  });

  test("Tab from container (initialFocus 'container') lands on first focusable", () => {
    act(() => {
      root.render(
        <WithExtension>
          <Trap isActive={true} initialFocus="container" />
        </WithExtension>,
      );
    });
    const trap = getByTestId('trap');
    dispatchTab(trap);
    expect(document.activeElement).toBe(getByTestId('btn-0'));
  });

  test("Shift+Tab from container (initialFocus 'container') lands on last focusable", () => {
    act(() => {
      root.render(
        <WithExtension>
          <Trap isActive={true} initialFocus="container" />
        </WithExtension>,
      );
    });
    const trap = getByTestId('trap');
    dispatchTab(trap, true);
    expect(document.activeElement).toBe(getByTestId('btn-2'));
  });

  test('advances Tab through middle focusables', () => {
    act(() => {
      root.render(
        <WithExtension>
          <Trap isActive={true} buttons={4} />
        </WithExtension>,
      );
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
      root.render(
        <WithExtension>
          <Trap isActive={true} buttons={4} />
        </WithExtension>,
      );
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
      root.render(
        <WithExtension>
          <Trap isActive={true} />
        </WithExtension>,
      );
    });
    act(() => {
      outside.focus();
    });
    expect(document.activeElement).toBe(getByTestId('btn-0'));
    document.body.removeChild(outside);
  });

  test('allowOutside lets a matching element keep focus (no pull-back)', () => {
    const outside = document.createElement('button');
    outside.setAttribute('data-allow', 'true');
    outside.textContent = 'Outside';
    document.body.appendChild(outside);
    act(() => {
      root.render(
        <WithExtension>
          <Trap
            isActive={true}
            allowOutside={target =>
              target.getAttribute('data-allow') === 'true'
            }
          />
        </WithExtension>,
      );
    });
    act(() => {
      outside.focus();
    });
    // allowOutside returned true for this target, so the trap does not pull
    // focus back into the container.
    expect(document.activeElement).toBe(outside);
    document.body.removeChild(outside);
  });
});
