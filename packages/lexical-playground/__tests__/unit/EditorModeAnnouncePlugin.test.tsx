/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {type LexicalEditor} from 'lexical';
import * as React from 'react';
import {createRoot, type Root} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';

import EditorModeAnnouncePlugin from '../../src/plugins/EditorModeAnnouncePlugin';

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
    ReactTestUtils.act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    document.body.querySelectorAll('[aria-live]').forEach(el => el.remove());
  });

  function findRegion(): HTMLElement | null {
    return document.body.querySelector<HTMLElement>('[aria-live]');
  }

  test('announces mode change and toggles aria-readonly on the root element', () => {
    let editor: LexicalEditor | null = null;
    ReactTestUtils.act(() => {
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
    const e: LexicalEditor = editor;

    ReactTestUtils.act(() => {
      e.setEditable(false);
    });
    expect(findRegion()!.textContent).toBe('Editor is read-only');
    expect(e.getRootElement()!.getAttribute('aria-readonly')).toBe('true');

    ReactTestUtils.act(() => {
      e.setEditable(true);
    });
    expect(findRegion()!.textContent).toBe('Editor is editable');
    expect(e.getRootElement()!.getAttribute('aria-readonly')).toBe('false');
  });
});
