/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {HistoryAnnouncePlugin} from '@lexical/react/LexicalHistoryAnnouncePlugin';
import {type LexicalEditor, REDO_COMMAND, UNDO_COMMAND} from 'lexical';
import * as React from 'react';
import {createRoot, type Root} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';

function Probe({onEditor}: {onEditor: (editor: LexicalEditor) => void}) {
  const [editor] = useLexicalComposerContext();
  const rootRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (rootRef.current !== null) {
      editor.setRootElement(rootRef.current);
    }
    onEditor(editor);
  }, [editor, onEditor]);
  return (
    <div ref={rootRef} contentEditable={true} role="textbox" tabIndex={0} />
  );
}

describe('HistoryAnnouncePlugin', () => {
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

  function mount(
    extraProps?: React.ComponentProps<typeof HistoryAnnouncePlugin>,
  ): LexicalEditor {
    let editor: LexicalEditor | null = null;
    ReactTestUtils.act(() => {
      root.render(
        <LexicalComposer
          initialConfig={{
            editorState: null,
            namespace: 'history-announce',
            nodes: [],
            onError: e => {
              throw e;
            },
            theme: {},
          }}>
          <HistoryAnnouncePlugin {...extraProps} />
          <Probe onEditor={e => (editor = e)} />
        </LexicalComposer>,
      );
    });
    if (editor === null) {
      throw new Error('editor not ready');
    }
    return editor;
  }

  test('does not announce on mount', () => {
    mount();
    expect(findRegion()!.textContent).toBe('');
  });

  test('announces "Undone" / "Redone" on the corresponding command', () => {
    const editor = mount();
    ReactTestUtils.act(() => {
      editor.dispatchCommand(UNDO_COMMAND, undefined);
    });
    expect(findRegion()!.textContent).toBe('Undone');
    ReactTestUtils.act(() => {
      editor.dispatchCommand(REDO_COMMAND, undefined);
    });
    expect(findRegion()!.textContent).toBe('Redone');
  });

  test('custom messages override the defaults', () => {
    const editor = mount({messages: {redone: '재실행', undone: '되돌림'}});
    ReactTestUtils.act(() => {
      editor.dispatchCommand(UNDO_COMMAND, undefined);
    });
    expect(findRegion()!.textContent).toBe('되돌림');
    ReactTestUtils.act(() => {
      editor.dispatchCommand(REDO_COMMAND, undefined);
    });
    expect(findRegion()!.textContent).toBe('재실행');
  });
});
