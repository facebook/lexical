/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Regression test for #8885 — Safari/WebKit fires redundant `selectionchange`
 * events on interactions outside the editor (such as clicking the floating link
 * menu). Lexical must only dispatch SELECTION_CHANGE_COMMAND when the selection
 * has actually changed.
 */

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  COMMAND_PRIORITY_CRITICAL,
  type NodeKey,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import {describe, expect, onTestFinished, test, vi} from 'vitest';

const ext = defineExtension({
  dependencies: [RichTextExtension],
  name: '[8885-selection-change-browser]',
});

/**
 * Give the browser a beat to deliver any native selectionchange task from focus
 * before registering the listener.
 */
function settle(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 50));
}

function mountEditor() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const contentEditable = document.createElement('div');
  contentEditable.contentEditable = 'true';
  container.appendChild(contentEditable);

  const editor = buildEditorFromExtensions(ext);
  editor.setRootElement(contentEditable);

  onTestFinished(() => {
    editor.setRootElement(null);
    document.body.removeChild(container);
    editor.dispose();
  });

  return {contentEditable, editor};
}

describe('Issue #8885: SELECTION_CHANGE_COMMAND on redundant selectionchange', () => {
  test('suppresses redundant selectionchange without suppressing legitimate selection changes', async () => {
    const {contentEditable, editor} = mountEditor();

    let textKey: NodeKey = '';
    editor.update(
      () => {
        const text = $createTextNode('Hello world');
        textKey = text.getKey();
        $getRoot().clear().append($createParagraphNode().append(text));
        text.select(5, 5);
      },
      {discrete: true},
    );

    contentEditable.focus();
    await settle();

    let selectionChangeCount = 0;
    const unregister = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        selectionChangeCount += 1;
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
    onTestFinished(() => {
      unregister();
    });

    // 1. A redundant selectionchange event where the selection did not change.
    // On unmodified base, onSelectionChange blindly dispatches SELECTION_CHANGE_COMMAND.
    document.dispatchEvent(new Event('selectionchange'));
    expect(selectionChangeCount).toBe(0);

    // 2. Legitimate caret movement within the node must still dispatch.
    const textDOM = editor.getElementByKey(textKey);
    expect(textDOM).not.toBeNull();
    const domTextNode = textDOM!.firstChild as Text;
    document.getSelection()!.setBaseAndExtent(domTextNode, 2, domTextNode, 2);
    await vi.waitFor(() => expect(selectionChangeCount).toBe(1));

    // Another redundant selectionchange at the new position must not dispatch.
    document.dispatchEvent(new Event('selectionchange'));
    expect(selectionChangeCount).toBe(1);

    // 3. Legitimate range expansion must still dispatch.
    document.getSelection()!.setBaseAndExtent(domTextNode, 2, domTextNode, 8);
    await vi.waitFor(() => expect(selectionChangeCount).toBe(2));

    // Redundant selectionchange with range selection must not dispatch.
    document.dispatchEvent(new Event('selectionchange'));
    expect(selectionChangeCount).toBe(2);
  });
});
