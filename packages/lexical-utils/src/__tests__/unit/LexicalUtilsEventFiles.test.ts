/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {eventFiles} from '@lexical/utils';
import {describe, expect, it} from 'vitest';

function makeClipboardEvent(types: string[], files: File[]): ClipboardEvent {
  const dt = new DataTransfer();
  for (const file of files) {
    dt.items.add(file);
  }
  for (const type of types) {
    if (type !== 'Files') {
      dt.items.add('', type);
    }
  }
  const event = new ClipboardEvent('paste', {clipboardData: dt});
  return event;
}

function makeDragEvent(types: string[], files: File[]): DragEvent {
  const dt = new DataTransfer();
  for (const file of files) {
    dt.items.add(file);
  }
  for (const type of types) {
    if (type !== 'Files') {
      dt.items.add('', type);
    }
  }
  const event = new DragEvent('drop', {dataTransfer: dt});
  return event;
}

const pngFile = new File(['png-data'], 'image.png', {type: 'image/png'});

describe('eventFiles', () => {
  it('returns false flags when event has no DataTransfer', () => {
    const event = new KeyboardEvent('keydown') as unknown as ClipboardEvent;
    expect(eventFiles(event)).toStrictEqual([false, [], false]);
    expect(eventFiles(event, true)).toStrictEqual([false, [], false]);
  });

  it('returns hasContent=true for text/html only clipboard (no files)', () => {
    const event = makeClipboardEvent(['text/html'], []);
    const [hasFiles, files, hasContent] = eventFiles(event);
    expect(hasFiles).toBe(false);
    expect(files).toHaveLength(0);
    expect(hasContent).toBe(true);
  });

  it('returns hasContent=true for text/plain only clipboard (no files)', () => {
    const event = makeClipboardEvent(['text/plain'], []);
    const [hasFiles, files, hasContent] = eventFiles(event);
    expect(hasFiles).toBe(false);
    expect(files).toHaveLength(0);
    expect(hasContent).toBe(true);
  });

  it('returns hasFiles=true and hasContent=false when only Files present', () => {
    const event = makeClipboardEvent([], [pngFile]);
    const [hasFiles, files, hasContent] = eventFiles(event);
    expect(hasFiles).toBe(true);
    expect(files).toHaveLength(1);
    expect(hasContent).toBe(false);
  });

  describe('browser-copied image: Files + text/html in clipboard', () => {
    it('returns hasContent=true by default (filesOnly=false)', () => {
      const event = makeClipboardEvent(['text/html'], [pngFile]);
      const [hasFiles, files, hasContent] = eventFiles(event);
      expect(hasFiles).toBe(true);
      expect(files).toHaveLength(1);
      // text/html present, so hasContent is true without filesOnly
      expect(hasContent).toBe(true);
    });

    it('returns hasContent=false when filesOnly=true', () => {
      const event = makeClipboardEvent(['text/html'], [pngFile]);
      const [hasFiles, files, hasContent] = eventFiles(event, true);
      expect(hasFiles).toBe(true);
      expect(files).toHaveLength(1);
      // filesOnly suppresses hasContent so DRAG_DROP_PASTE can fire
      expect(hasContent).toBe(false);
    });

    it('works the same way for DragEvent with files and text/html', () => {
      const event = makeDragEvent(['text/html'], [pngFile]);
      const [hasFiles, files, hasContent] = eventFiles(event, true);
      expect(hasFiles).toBe(true);
      expect(files).toHaveLength(1);
      expect(hasContent).toBe(false);
    });
  });

  it('filesOnly=true with text/html but no Files still returns hasContent=false', () => {
    const event = makeClipboardEvent(['text/html'], []);
    const [hasFiles, files, hasContent] = eventFiles(event, true);
    expect(hasFiles).toBe(false);
    expect(files).toHaveLength(0);
    // no files present, so hasContent is false (no files to conflict with)
    expect(hasContent).toBe(false);
  });
});
