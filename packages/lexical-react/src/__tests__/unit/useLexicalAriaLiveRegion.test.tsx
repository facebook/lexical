/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {AriaLiveRegionExtension} from '@lexical/a11y';
import {configExtension} from '@lexical/extension';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {useLexicalAriaLiveRegion} from '@lexical/react/useLexicalAriaLiveRegion';
import * as React from 'react';
import {act, useEffect, useImperativeHandle, useRef} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';

type Handle = {announce: (message: string) => void};

const Harness = React.forwardRef<Handle>(function HarnessImpl(_props, ref) {
  const [editor] = useLexicalComposerContext();
  const editorRootRef = useRef<HTMLDivElement>(null);
  const announce = useLexicalAriaLiveRegion();
  useImperativeHandle(ref, () => ({announce}), [announce]);

  useEffect(() => {
    const root = editorRootRef.current;
    if (root === null) {
      return;
    }
    editor.setRootElement(root);
    return () => editor.setRootElement(null);
  }, [editor]);

  return (
    <div
      ref={editorRootRef}
      contentEditable={true}
      data-testid="editor-root"
      role="textbox"
      tabIndex={0}
    />
  );
});

function WithExtension({
  children,
  politeness,
}: {
  children: React.ReactNode;
  politeness?: 'polite' | 'assertive';
}) {
  const ext = politeness
    ? configExtension(AriaLiveRegionExtension, {politeness})
    : AriaLiveRegionExtension;
  return (
    <LexicalExtensionComposer extension={ext}>
      {children}
    </LexicalExtensionComposer>
  );
}

describe('useLexicalAriaLiveRegion', () => {
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
    for (const region of Array.from(
      document.body.querySelectorAll('[aria-live]'),
    )) {
      region.remove();
    }
  });

  function findRegion(): HTMLElement | null {
    return document.body.querySelector<HTMLElement>('[aria-live]');
  }

  test('mounts an aria-live region with polite default and aria-atomic', () => {
    act(() => {
      root.render(
        <WithExtension>
          <Harness ref={React.createRef()} />
        </WithExtension>,
      );
    });
    const region = findRegion();
    expect(region).not.toBeNull();
    expect(region!.getAttribute('aria-live')).toBe('polite');
    expect(region!.getAttribute('aria-atomic')).toBe('true');
    expect(region!.getAttribute('role')).toBe('status');
  });

  test('writes a message into the region when announce is called', () => {
    const ref = React.createRef<Handle>();
    act(() => {
      root.render(
        <WithExtension>
          <Harness ref={ref} />
        </WithExtension>,
      );
    });
    act(() => {
      ref.current!.announce('Bold on');
    });
    expect(findRegion()!.textContent).toBe('Bold on');
  });

  test('repeating the same message toggles a zero-width space so SR re-announces', () => {
    const ref = React.createRef<Handle>();
    act(() => {
      root.render(
        <WithExtension>
          <Harness ref={ref} />
        </WithExtension>,
      );
    });
    act(() => {
      ref.current!.announce('Italic on');
    });
    expect(findRegion()!.textContent).toBe('Italic on');
    act(() => {
      ref.current!.announce('Italic on');
    });
    expect(findRegion()!.textContent).toBe('Italic on\u200B');
  });

  test('politeness=assertive sets aria-live="assertive"', () => {
    act(() => {
      root.render(
        <WithExtension politeness="assertive">
          <Harness ref={React.createRef()} />
        </WithExtension>,
      );
    });
    expect(findRegion()!.getAttribute('aria-live')).toBe('assertive');
  });
});
