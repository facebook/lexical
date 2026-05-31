/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalRovingTabIndex} from '@lexical/react/useLexicalRovingTabIndex';
import * as React from 'react';
import {useRef} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {act} from 'react-dom/test-utils';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';

function Group({
  count = 3,
  orientation,
}: {
  count?: number;
  orientation?: 'horizontal' | 'vertical' | 'both';
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLexicalRovingTabIndex(ref, orientation ? {orientation} : undefined);
  return (
    <div ref={ref} data-testid="group">
      {Array.from({length: count}, (_, i) => (
        <button key={i} data-testid={`btn-${i}`}>
          {i}
        </button>
      ))}
    </div>
  );
}

function dispatchKey(target: HTMLElement, key: string): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key}),
  );
}

describe('useLexicalRovingTabIndex', () => {
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

  function byId(id: string): HTMLElement {
    const el = container.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    if (el === null) {
      throw new Error(`Missing ${id}`);
    }
    return el;
  }

  test('sets tabindex=0 on the first item, -1 on the rest', () => {
    act(() => {
      root.render(<Group />);
    });
    expect(byId('btn-0').tabIndex).toBe(0);
    expect(byId('btn-1').tabIndex).toBe(-1);
    expect(byId('btn-2').tabIndex).toBe(-1);
  });

  test('ArrowRight moves focus to the next item and updates tabindex', () => {
    act(() => {
      root.render(<Group />);
    });
    act(() => {
      byId('btn-0').focus();
    });
    dispatchKey(byId('btn-0'), 'ArrowRight');
    expect(document.activeElement).toBe(byId('btn-1'));
    expect(byId('btn-1').tabIndex).toBe(0);
    expect(byId('btn-0').tabIndex).toBe(-1);
  });

  test('ArrowLeft wraps from the first item to the last', () => {
    act(() => {
      root.render(<Group />);
    });
    act(() => {
      byId('btn-0').focus();
    });
    dispatchKey(byId('btn-0'), 'ArrowLeft');
    expect(document.activeElement).toBe(byId('btn-2'));
  });

  test('ArrowRight wraps from the last item to the first', () => {
    act(() => {
      root.render(<Group />);
    });
    act(() => {
      byId('btn-2').focus();
    });
    dispatchKey(byId('btn-2'), 'ArrowRight');
    expect(document.activeElement).toBe(byId('btn-0'));
  });

  test('Home jumps to the first item, End to the last', () => {
    act(() => {
      root.render(<Group />);
    });
    act(() => {
      byId('btn-1').focus();
    });
    dispatchKey(byId('btn-1'), 'Home');
    expect(document.activeElement).toBe(byId('btn-0'));
    dispatchKey(byId('btn-0'), 'End');
    expect(document.activeElement).toBe(byId('btn-2'));
  });

  test('vertical orientation ignores ArrowLeft/Right', () => {
    act(() => {
      root.render(<Group orientation="vertical" />);
    });
    act(() => {
      byId('btn-0').focus();
    });
    dispatchKey(byId('btn-0'), 'ArrowRight');
    expect(document.activeElement).toBe(byId('btn-0'));
    dispatchKey(byId('btn-0'), 'ArrowDown');
    expect(document.activeElement).toBe(byId('btn-1'));
  });

  test('does nothing when the group is empty', () => {
    act(() => {
      root.render(<Group count={0} />);
    });
    const group = byId('group');
    expect(() => dispatchKey(group, 'ArrowRight')).not.toThrow();
  });
});
