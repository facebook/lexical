/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useFocusManager} from '@lexical/react/useFocusManager';
import {createEditor, type LexicalEditor} from 'lexical';
import * as React from 'react';
import {useEffect, useMemo, useRef} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

function Harness({onEditor}: {onEditor: (editor: LexicalEditor) => void}) {
  const editor = useMemo(
    () =>
      createEditor({
        namespace: '',
        onError: e => {
          throw e;
        },
      }),
    [],
  );
  const editorRootRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useFocusManager(editor, toolbarRef);

  useEffect(() => {
    const root = editorRootRef.current;
    if (root === null) {
      return;
    }
    editor.setRootElement(root);
    onEditor(editor);
    return () => editor.setRootElement(null);
  }, [editor, onEditor]);

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

describe('useFocusManager', () => {
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

  function byId(id: string): HTMLElement {
    const el = container.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    if (el === null) {
      throw new Error(`Missing ${id}`);
    }
    return el;
  }

  test('Alt+F10 inside the editor focuses the first toolbar item', () => {
    const onEditor = vi.fn();
    ReactTestUtils.act(() => {
      root.render(<Harness onEditor={onEditor} />);
    });
    const editorRoot = byId('editor-root');
    ReactTestUtils.act(() => {
      editorRoot.focus();
    });
    dispatchKey(editorRoot, {altKey: true, key: 'F10'});
    expect(document.activeElement).toBe(byId('btn-0'));
  });

  test('Alt+F10 without Alt modifier is a no-op', () => {
    const onEditor = vi.fn();
    ReactTestUtils.act(() => {
      root.render(<Harness onEditor={onEditor} />);
    });
    const editorRoot = byId('editor-root');
    ReactTestUtils.act(() => {
      editorRoot.focus();
    });
    dispatchKey(editorRoot, {key: 'F10'});
    expect(document.activeElement).toBe(editorRoot);
  });

  test('Escape inside the toolbar returns focus to the editor', () => {
    const editorRef: {current: LexicalEditor | null} = {current: null};
    ReactTestUtils.act(() => {
      root.render(
        <Harness
          onEditor={e => {
            editorRef.current = e;
          }}
        />,
      );
    });
    const toolbarBtn = byId('btn-0');
    ReactTestUtils.act(() => {
      toolbarBtn.focus();
    });
    expect(document.activeElement).toBe(toolbarBtn);
    dispatchKey(toolbarBtn, {key: 'Escape'});
    expect(document.activeElement).toBe(byId('editor-root'));
  });
});
