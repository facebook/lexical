/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {EditorModeAnnouncePlugin} from '@lexical/react/LexicalEditorModeAnnouncePlugin';
import {type LexicalEditor} from 'lexical';
import * as React from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {act} from 'react-dom/test-utils';
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

describe('EditorModeAnnouncePlugin', () => {
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

  function findRegion(): HTMLElement | null {
    return document.body.querySelector<HTMLElement>('[aria-live]');
  }

  function mount(): LexicalEditor {
    let editor: LexicalEditor | null = null;
    act(() => {
      root.render(
        <LexicalComposer
          initialConfig={{
            editorState: null,
            namespace: 'mode-announce',
            nodes: [],
            onError: e => {
              throw e;
            },
            theme: {},
          }}>
          <EditorModeAnnouncePlugin />
          <Probe
            onEditor={e => {
              editor = e;
            }}
          />
        </LexicalComposer>,
      );
    });
    if (editor === null) {
      throw new Error('editor not ready');
    }
    return editor;
  }

  test('does not announce on mount (registerEditableListener does not fire-on-register)', () => {
    mount();
    expect(findRegion()!.textContent).toBe('');
  });

  test('announces mode transitions via the live region', () => {
    const e = mount();

    act(() => {
      e.setEditable(false);
    });
    expect(findRegion()!.textContent).toBe('Editor is read-only');

    act(() => {
      e.setEditable(true);
    });
    expect(findRegion()!.textContent).toBe('Editor is editable');
  });

  test('custom messages override the default English strings', () => {
    let editor: LexicalEditor | null = null;
    act(() => {
      root.render(
        <LexicalComposer
          initialConfig={{
            editorState: null,
            namespace: 'mode-announce-i18n',
            nodes: [],
            onError: e => {
              throw e;
            },
            theme: {},
          }}>
          <EditorModeAnnouncePlugin
            messages={{editable: '편집 가능', readOnly: '읽기 전용'}}
          />
          <Probe
            onEditor={e => {
              editor = e;
            }}
          />
        </LexicalComposer>,
      );
    });
    if (editor === null) {
      throw new Error('editor not ready');
    }
    const e: LexicalEditor = editor;
    act(() => {
      e.setEditable(false);
    });
    expect(findRegion()!.textContent).toBe('읽기 전용');
  });
});
