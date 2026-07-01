/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {
  $addUpdateTag,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  FOCUS_TAG,
  HISTORY_MERGE_TAG,
} from 'lexical';
import * as React from 'react';
import {act} from 'react';
import {createRoot, Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

describe('LexicalOnChangePlugin', () => {
  let container: HTMLDivElement | null = null;
  let reactRoot: Root;

  beforeEach(() => {
    container = document.createElement('div');
    reactRoot = createRoot(container);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container!);
    container = null;
    vi.restoreAllMocks();
  });

  async function renderWithOnChange(ignoreFocusChange: boolean) {
    let capturedEditor: LexicalEditor | undefined;
    const onChange = vi.fn();

    function CaptureEditor() {
      [capturedEditor] = useLexicalComposerContext();
      return null;
    }

    await act(async () => {
      reactRoot.render(
        <LexicalComposer
          initialConfig={{
            namespace: '',
            nodes: [],
            onError: err => {
              throw err;
            },
          }}>
          <CaptureEditor />
          <OnChangePlugin
            onChange={onChange}
            ignoreFocusChange={ignoreFocusChange}
            ignoreHistoryMergeTagChange={false}
          />
        </LexicalComposer>,
      );
    });

    // Initial update to populate editor state so prevEditorState.isEmpty() is false
    await capturedEditor!.update(() => {
      $getRoot().append(
        $createParagraphNode().append($createTextNode('initial')),
      );
    });

    return {editor: capturedEditor!, onChange};
  }

  it('ignoreFocusChange={true} suppresses onChange for FOCUS_TAG updates', async () => {
    const {editor, onChange} = await renderWithOnChange(true);

    onChange.mockClear();

    await editor.update(() => {
      $addUpdateTag(FOCUS_TAG);
      $getRoot().append($createParagraphNode().append($createTextNode('test')));
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignoreFocusChange={false} (default) calls onChange for FOCUS_TAG updates', async () => {
    const {editor, onChange} = await renderWithOnChange(false);

    onChange.mockClear();

    await editor.update(() => {
      $addUpdateTag(FOCUS_TAG);
      $getRoot().append($createParagraphNode().append($createTextNode('test')));
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('ignoreFocusChange={true} does not suppress onChange for non-focus updates', async () => {
    const {editor, onChange} = await renderWithOnChange(true);

    onChange.mockClear();

    await editor.update(() => {
      $addUpdateTag(HISTORY_MERGE_TAG);
      $getRoot().append($createParagraphNode().append($createTextNode('test')));
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('ignoreFocusChange={true} with no tag still fires onChange', async () => {
    const {editor, onChange} = await renderWithOnChange(true);

    onChange.mockClear();

    await editor.update(() => {
      $getRoot().append($createParagraphNode().append($createTextNode('test')));
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('onChange receives the FOCUS_TAG in the tags set', async () => {
    const {editor, onChange} = await renderWithOnChange(false);

    onChange.mockClear();

    await editor.update(() => {
      $addUpdateTag(FOCUS_TAG);
      $getRoot().append($createParagraphNode().append($createTextNode('test')));
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const tags = onChange.mock.calls[0][2];
    expect(tags).toBeInstanceOf(Set);
    expect(tags.has(FOCUS_TAG)).toBe(true);
  });

  it('ignoreFocusChange={true} suppresses onChange when editor.focus() is called', async () => {
    const {editor, onChange} = await renderWithOnChange(true);

    const rootElement = document.createElement('div');
    rootElement.contentEditable = 'true';
    container!.appendChild(rootElement);

    await act(async () => {
      editor.setRootElement(rootElement);
    });

    onChange.mockClear();

    await act(async () => {
      editor.focus();
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignoreFocusChange={false} calls onChange when editor.focus() is called', async () => {
    const {editor, onChange} = await renderWithOnChange(false);

    const rootElement = document.createElement('div');
    rootElement.contentEditable = 'true';
    container!.appendChild(rootElement);

    await act(async () => {
      editor.setRootElement(rootElement);
    });

    onChange.mockClear();

    await act(async () => {
      editor.focus();
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
