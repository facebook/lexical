/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {DRAG_DROP_PASTE, registerRichText} from '@lexical/rich-text';
import {PASTE_COMMAND} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {afterEach, describe, expect, test, vi} from 'vitest';

// Build a ClipboardEvent-shaped object that satisfies the PASTE_COMMAND
// handler in registerRichText. The handler reads:
//   - objectKlassEquals(event, ClipboardEvent)  -> needs constructor.name
//   - eventFiles(event) -> reads event.clipboardData.{types, files}
//   - event.clipboardData.types.includes('text/plain')
//
// We use new ClipboardEvent(...) so constructor.name is 'ClipboardEvent'
// and objectKlassEquals passes, then override clipboardData with a plain
// object carrying the types and files we need.
function makePasteEvent(
  types: readonly string[],
  files: File[],
): ClipboardEvent {
  const fileList = Object.assign(files.slice(), {
    item: (i: number) => files[i] ?? null,
  }) as unknown as FileList;

  const event = new ClipboardEvent('paste', {bubbles: true, cancelable: true});
  // Override the read-only clipboardData with our own shape.
  Object.defineProperty(event, 'clipboardData', {
    value: {files: fileList, getData: () => '', types},
  });
  return event;
}

const pngFile = new File(['img'], 'photo.png', {type: 'image/png'});

describe('registerRichText PASTE_COMMAND file handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  initializeUnitTest(testEnv => {
    test('browser-copied image (Files + text/html, no text/plain) dispatches DRAG_DROP_PASTE', async () => {
      const {editor} = testEnv;
      registerRichText(editor);

      const handler = vi.fn(() => true);
      editor.registerCommand(DRAG_DROP_PASTE, handler, 4);

      // Browser right-click Copy Image: clipboard has Files and text/html
      // but no text/plain. The handler must route this to DRAG_DROP_PASTE.
      const event = makePasteEvent(['Files', 'text/html'], [pngFile]);
      await editor.dispatchCommand(PASTE_COMMAND, event);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith([pngFile], expect.anything());
    });

    test('Word-copied text (Files + text/html + text/plain) does NOT dispatch DRAG_DROP_PASTE', async () => {
      const {editor} = testEnv;
      registerRichText(editor);

      const handler = vi.fn(() => true);
      editor.registerCommand(DRAG_DROP_PASTE, handler, 4);

      // Word places a rasterized PNG alongside text/plain and text/html.
      // The presence of text/plain signals that the user intends a text
      // paste, so DRAG_DROP_PASTE must NOT fire.
      const wordPng = new File(['img'], 'image.png', {type: 'image/png'});
      const event = makePasteEvent(
        ['text/plain', 'text/html', 'Files'],
        [wordPng],
      );
      await editor.dispatchCommand(PASTE_COMMAND, event);

      expect(handler).not.toHaveBeenCalled();
    });

    test('pure file paste (Files only, no text types) dispatches DRAG_DROP_PASTE', async () => {
      const {editor} = testEnv;
      registerRichText(editor);

      const handler = vi.fn(() => true);
      editor.registerCommand(DRAG_DROP_PASTE, handler, 4);

      const event = makePasteEvent(['Files'], [pngFile]);
      await editor.dispatchCommand(PASTE_COMMAND, event);

      expect(handler).toHaveBeenCalledOnce();
    });

    test('text/html-only paste (no files) does NOT dispatch DRAG_DROP_PASTE', async () => {
      const {editor} = testEnv;
      registerRichText(editor);

      const handler = vi.fn(() => true);
      editor.registerCommand(DRAG_DROP_PASTE, handler, 4);

      const event = makePasteEvent(['text/html'], []);
      await editor.dispatchCommand(PASTE_COMMAND, event);

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
