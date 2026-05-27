/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  configExtension,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalEditor,
} from 'lexical';
import {afterEach, describe, expect, test} from 'vitest';

import {TabIndentationExtension} from '../../TabIndentationExtension';

function setUp(releaseOnEscape: boolean): {
  editor: LexicalEditor;
  errors: Error[];
} {
  const errors: Error[] = [];
  const editor = buildEditorFromExtensions({
    dependencies: [
      RichTextExtension,
      configExtension(TabIndentationExtension, {releaseOnEscape}),
    ],
    name: 'tab-indentation-release-on-escape',
    onError: e => {
      errors.push(e);
    },
  });
  editor.setRootElement(document.createElement('div'));
  editor.update(
    () => {
      const root = $getRoot().clear();
      const p = $createParagraphNode().append($createTextNode('hello'));
      root.append(p);
      p.selectEnd();
    },
    {discrete: true},
  );
  return {editor, errors};
}

function dispatch(editor: LexicalEditor, key: 'Tab' | 'Escape'): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
  });
  editor.dispatchCommand(
    key === 'Tab' ? KEY_TAB_COMMAND : KEY_ESCAPE_COMMAND,
    event,
  );
  return event;
}

describe('TabIndentationExtension: releaseOnEscape', () => {
  let teardowns: Array<() => void> = [];

  afterEach(() => {
    teardowns.forEach(fn => fn());
    teardowns = [];
  });

  test('default behavior: Tab calls preventDefault (handled by editor) on every press', () => {
    const {editor, errors} = setUp(false);
    teardowns.push(() => editor.setRootElement(null));

    const a = dispatch(editor, 'Tab');
    const b = dispatch(editor, 'Tab');
    expect(a.defaultPrevented).toBe(true);
    expect(b.defaultPrevented).toBe(true);
    expect(errors).toEqual([]);
  });

  test('Escape followed by Tab releases the next Tab (no preventDefault)', () => {
    const {editor, errors} = setUp(true);
    teardowns.push(() => editor.setRootElement(null));

    dispatch(editor, 'Escape');
    const releasedTab = dispatch(editor, 'Tab');
    expect(releasedTab.defaultPrevented).toBe(false);

    const indentedAgain = dispatch(editor, 'Tab');
    expect(indentedAgain.defaultPrevented).toBe(true);
    expect(errors).toEqual([]);
  });

  test('releaseOnEscape=false ignores Escape (Tab still preventsDefault after Esc)', () => {
    const {editor, errors} = setUp(false);
    teardowns.push(() => editor.setRootElement(null));

    dispatch(editor, 'Escape');
    const stillHandled = dispatch(editor, 'Tab');
    expect(stillHandled.defaultPrevented).toBe(true);
    expect(errors).toEqual([]);
  });
});
