/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {FocusManagerExtension} from '@lexical/a11y';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {useLexicalFocusManagerRef} from '@lexical/react/useLexicalFocusManagerRef';
import * as React from 'react';
import {act, useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  onTestFinished,
  test,
  vi,
} from 'vitest';

function Harness({onReady}: {onReady?: () => void}) {
  const [editor] = useLexicalComposerContext();
  const editorRootRef = React.useRef<HTMLDivElement>(null);
  const toolbarRef = useLexicalFocusManagerRef();

  useEffect(() => {
    const root = editorRootRef.current;
    if (root === null) {
      return;
    }
    editor.setRootElement(root);
    onReady?.();
    return () => editor.setRootElement(null);
  }, [editor, onReady]);

  return (
    <>
      <div ref={toolbarRef} data-testid="toolbar">
        <button data-testid="btn-0">First</button>
        <button data-testid="btn-1">Second</button>
      </div>
      <div
        ref={editorRootRef}
        contentEditable={true}
        data-testid="editor-root"
        role="textbox"
        tabIndex={0}
      />
    </>
  );
}

function WithExtension({children}: {children: React.ReactNode}) {
  return (
    <LexicalExtensionComposer extension={FocusManagerExtension}>
      {children}
    </LexicalExtensionComposer>
  );
}

function dispatchKey(
  target: HTMLElement,
  init: KeyboardEventInit,
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

describe('useLexicalFocusManagerRef', () => {
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

  test('Alt+F10 inside the editor focuses the first toolbar item', () => {
    const onReady = vi.fn();
    act(() => {
      root.render(
        <WithExtension>
          <Harness onReady={onReady} />
        </WithExtension>,
      );
    });
    const editorRoot = byId('editor-root');
    act(() => {
      editorRoot.focus();
    });
    dispatchKey(editorRoot, {altKey: true, key: 'F10'});
    expect(document.activeElement).toBe(byId('btn-0'));
  });

  test('Alt+F10 without Alt modifier is a no-op', () => {
    const onReady = vi.fn();
    act(() => {
      root.render(
        <WithExtension>
          <Harness onReady={onReady} />
        </WithExtension>,
      );
    });
    const editorRoot = byId('editor-root');
    act(() => {
      editorRoot.focus();
    });
    dispatchKey(editorRoot, {key: 'F10'});
    expect(document.activeElement).toBe(editorRoot);
  });

  test('Escape inside the toolbar returns focus to the editor', () => {
    act(() => {
      root.render(
        <WithExtension>
          <Harness />
        </WithExtension>,
      );
    });
    const toolbarBtn = byId('btn-0');
    act(() => {
      toolbarBtn.focus();
    });
    expect(document.activeElement).toBe(toolbarBtn);

    const windowSpy = vi.fn();
    window.addEventListener('keydown', windowSpy);
    onTestFinished(() => window.removeEventListener('keydown', windowSpy));
    dispatchKey(toolbarBtn, {key: 'Escape'});
    expect(document.activeElement).toBe(byId('editor-root'));
    expect(windowSpy).not.toHaveBeenCalled();
  });
});
