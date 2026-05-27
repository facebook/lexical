/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useAriaLiveRegion} from '@lexical/react/useAriaLiveRegion';
import * as React from 'react';
import {useImperativeHandle} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';

type Handle = {announce: (message: string) => void};

const Harness = React.forwardRef<Handle, {politeness?: 'polite' | 'assertive'}>(
  function HarnessImpl({politeness}, ref) {
    const announce = useAriaLiveRegion(politeness ? {politeness} : undefined);
    useImperativeHandle(ref, () => ({announce}), [announce]);
    return null;
  },
);

describe('useAriaLiveRegion', () => {
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

  function findRegion(): HTMLElement | null {
    return document.body.querySelector<HTMLElement>('[aria-live]');
  }

  test('mounts an aria-live region with polite default and aria-atomic', () => {
    ReactTestUtils.act(() => {
      root.render(<Harness ref={React.createRef()} />);
    });
    const region = findRegion();
    expect(region).not.toBeNull();
    expect(region!.getAttribute('aria-live')).toBe('polite');
    expect(region!.getAttribute('aria-atomic')).toBe('true');
    expect(region!.getAttribute('role')).toBe('status');
  });

  test('writes a message into the region when announce is called', () => {
    const ref = React.createRef<Handle>();
    ReactTestUtils.act(() => {
      root.render(<Harness ref={ref} />);
    });
    ReactTestUtils.act(() => {
      ref.current!.announce('Bold on');
    });
    expect(findRegion()!.textContent).toBe('Bold on');
  });

  test('repeating the same message toggles a zero-width space so SR re-announces', () => {
    const ref = React.createRef<Handle>();
    ReactTestUtils.act(() => {
      root.render(<Harness ref={ref} />);
    });
    ReactTestUtils.act(() => {
      ref.current!.announce('Italic on');
    });
    expect(findRegion()!.textContent).toBe('Italic on');
    ReactTestUtils.act(() => {
      ref.current!.announce('Italic on');
    });
    expect(findRegion()!.textContent).toBe('Italic on\u200B');
  });

  test('politeness=assertive sets aria-live="assertive"', () => {
    ReactTestUtils.act(() => {
      root.render(<Harness ref={React.createRef()} politeness="assertive" />);
    });
    expect(findRegion()!.getAttribute('aria-live')).toBe('assertive');
  });

  test('removes the region on unmount', () => {
    ReactTestUtils.act(() => {
      root.render(<Harness ref={React.createRef()} />);
    });
    expect(findRegion()).not.toBeNull();
    ReactTestUtils.act(() => {
      root.unmount();
    });
    expect(findRegion()).toBeNull();
    // Re-render so afterEach's unmount is a no-op.
    root = createRoot(container);
  });
});
