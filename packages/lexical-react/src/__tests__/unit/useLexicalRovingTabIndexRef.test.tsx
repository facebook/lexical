/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {RovingTabIndexExtension} from '@lexical/a11y';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {useLexicalRovingTabIndexRef} from '@lexical/react/useLexicalRovingTabIndexRef';
import * as React from 'react';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';

function Group({
  count = 3,
  orientation,
}: {
  count?: number;
  orientation?: 'horizontal' | 'vertical' | 'both';
}) {
  const ref = useLexicalRovingTabIndexRef(
    orientation ? {orientation} : undefined,
  );
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

function WithExtension({children}: {children: React.ReactNode}) {
  return (
    <LexicalExtensionComposer extension={RovingTabIndexExtension}>
      {children}
    </LexicalExtensionComposer>
  );
}

function dispatchKey(target: HTMLElement, key: string): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key}),
  );
}

describe('useLexicalRovingTabIndexRef', () => {
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
      root.render(
        <WithExtension>
          <Group />
        </WithExtension>,
      );
    });
    expect(byId('btn-0').tabIndex).toBe(0);
    expect(byId('btn-1').tabIndex).toBe(-1);
    expect(byId('btn-2').tabIndex).toBe(-1);
  });

  test('ArrowRight moves focus to the next item and updates tabindex', () => {
    act(() => {
      root.render(
        <WithExtension>
          <Group />
        </WithExtension>,
      );
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
      root.render(
        <WithExtension>
          <Group />
        </WithExtension>,
      );
    });
    act(() => {
      byId('btn-0').focus();
    });
    dispatchKey(byId('btn-0'), 'ArrowLeft');
    expect(document.activeElement).toBe(byId('btn-2'));
  });

  test('ArrowRight wraps from the last item to the first', () => {
    act(() => {
      root.render(
        <WithExtension>
          <Group />
        </WithExtension>,
      );
    });
    act(() => {
      byId('btn-2').focus();
    });
    dispatchKey(byId('btn-2'), 'ArrowRight');
    expect(document.activeElement).toBe(byId('btn-0'));
  });

  test('Home jumps to the first item, End to the last', () => {
    act(() => {
      root.render(
        <WithExtension>
          <Group />
        </WithExtension>,
      );
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
      root.render(
        <WithExtension>
          <Group orientation="vertical" />
        </WithExtension>,
      );
    });
    act(() => {
      byId('btn-0').focus();
    });
    dispatchKey(byId('btn-0'), 'ArrowRight');
    expect(document.activeElement).toBe(byId('btn-0'));
    dispatchKey(byId('btn-0'), 'ArrowDown');
    expect(document.activeElement).toBe(byId('btn-1'));
  });

  test('re-registers with new options when deps change but the node stays mounted', () => {
    act(() => {
      root.render(
        <WithExtension>
          <Group orientation="horizontal" />
        </WithExtension>,
      );
    });
    const groupBefore = byId('group');
    act(() => {
      byId('btn-0').focus();
    });
    // Horizontal: ArrowRight moves focus.
    dispatchKey(byId('btn-0'), 'ArrowRight');
    expect(document.activeElement).toBe(byId('btn-1'));

    // Re-render with a different orientation. The same <div> node is reused,
    // so only the ref-callback identity changes (the `orientation` dep). React
    // calls the previous callback with null — disposing the old registration —
    // and the new one with the node, re-registering with the new options.
    act(() => {
      root.render(
        <WithExtension>
          <Group orientation="vertical" />
        </WithExtension>,
      );
    });
    expect(byId('group')).toBe(groupBefore); // same DOM node, not remounted

    act(() => {
      byId('btn-0').focus();
    });
    // If the old horizontal registration had leaked, its keydown listener would
    // still move focus here. It must be gone: ArrowRight is now ignored and only
    // the new vertical registration responds to ArrowDown.
    dispatchKey(byId('btn-0'), 'ArrowRight');
    expect(document.activeElement).toBe(byId('btn-0'));
    dispatchKey(byId('btn-0'), 'ArrowDown');
    expect(document.activeElement).toBe(byId('btn-1'));
  });

  test('does nothing when the group is empty', () => {
    act(() => {
      root.render(
        <WithExtension>
          <Group count={0} />
        </WithExtension>,
      );
    });
    const group = byId('group');
    expect(() => dispatchKey(group, 'ArrowRight')).not.toThrow();
  });
});
