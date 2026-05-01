/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $exportMimeTypeFromSelection,
  $getClipboardDataFromSelection,
  type GetClipboardDataConfig,
  GetClipboardDataExtension,
  setLexicalClipboardDataTransfer,
} from '@lexical/clipboard';
import {
  buildEditorFromExtensions,
  configExtension,
  defineExtension,
} from '@lexical/extension';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';
import {DataTransferMock} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

const SEED_TEXT = 'hello world';

function $initialEditorState(): void {
  const text = $createTextNode(SEED_TEXT);
  $getRoot().append($createParagraphNode().append(text));
  text.select(0, SEED_TEXT.length);
}

function buildSeededEditor(override: Partial<GetClipboardDataConfig> = {}) {
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState,
      dependencies: [configExtension(GetClipboardDataExtension, override)],
      name: '[test-root]',
    }),
  );
}

describe('GetClipboardDataExtension', () => {
  it('produces default text/plain, text/html, and application/x-lexical-editor entries', () => {
    using editor = buildSeededEditor();
    editor.read(() => {
      const data = $getClipboardDataFromSelection();
      expect(data['text/plain']).toBe(SEED_TEXT);
      expect(data['text/html']).toContain(SEED_TEXT);

      const lexicalPayload = data['application/x-lexical-editor'];
      expect(typeof lexicalPayload).toBe('string');
      const parsed = JSON.parse(lexicalPayload!);
      expect(parsed.namespace).toBe(editor._config.namespace);
      expect(Array.isArray(parsed.nodes)).toBe(true);
      expect(parsed.nodes.length).toBeGreaterThan(0);
    });
  });

  it('lets an override replace the default output for an existing MIME type', () => {
    using editor = buildSeededEditor({
      $exportMimeType: {
        'text/plain': [() => 'OVERRIDDEN'],
      },
    });
    editor.read(() => {
      const data = $getClipboardDataFromSelection();
      expect(data['text/plain']).toBe('OVERRIDDEN');
      // Other MIME types still come from the defaults below the override.
      expect(data['text/html']).toContain(SEED_TEXT);
    });
  });

  it('falls through to the default handler when the override calls next()', () => {
    using editor = buildSeededEditor({
      $exportMimeType: {
        'text/plain': [(_selection, next) => `[wrapped] ${next() ?? ''}`],
      },
    });
    editor.read(() => {
      const data = $getClipboardDataFromSelection();
      expect(data['text/plain']).toBe(`[wrapped] ${SEED_TEXT}`);
    });
  });

  it('omits a MIME type when its top handler returns null without calling next()', () => {
    using editor = buildSeededEditor({
      $exportMimeType: {
        'text/html': [() => null],
      },
    });
    editor.read(() => {
      const data = $getClipboardDataFromSelection();
      expect(data['text/html']).toBeUndefined();
      // Defaults for other MIME types are unaffected.
      expect(data['text/plain']).toBe(SEED_TEXT);
      expect(typeof data['application/x-lexical-editor']).toBe('string');
    });
  });

  it('registers a brand-new custom MIME type', () => {
    using editor = buildSeededEditor({
      $exportMimeType: {
        'application/x-myformat': [
          selection =>
            selection
              ? JSON.stringify({text: selection.getTextContent(), v: 1})
              : null,
        ],
      },
    });
    editor.read(() => {
      const data = $getClipboardDataFromSelection();
      expect(data['application/x-myformat']).toBe(
        JSON.stringify({text: SEED_TEXT, v: 1}),
      );
      // Defaults are still produced.
      expect(data['text/plain']).toBe(SEED_TEXT);
      expect(data['text/html']).toContain(SEED_TEXT);
    });
  });

  it('runs higher-indexed handlers first within a single MIME stack', () => {
    const calls: string[] = [];
    using editor = buildSeededEditor({
      $exportMimeType: {
        'text/plain': [
          (_selection, next) => {
            calls.push('A');
            return `A(${next() ?? ''})`;
          },
          (_selection, next) => {
            calls.push('B');
            return `B(${next() ?? ''})`;
          },
        ],
      },
    });
    editor.read(() => {
      const data = $getClipboardDataFromSelection();
      // Stack after merge: [defaultFn, A, B]; B runs first, calls next() -> A,
      // A calls next() -> defaultFn (returns SEED_TEXT).
      expect(data['text/plain']).toBe(`B(A(${SEED_TEXT}))`);
      expect(calls).toEqual(['B', 'A']);
    });
  });

  describe('$exportMimeTypeFromSelection', () => {
    it('returns the configured stack output for known MIME types', () => {
      using editor = buildSeededEditor({
        $exportMimeType: {
          'application/x-myformat': [() => 'custom-payload'],
        },
      });
      editor.read(() => {
        expect($exportMimeTypeFromSelection('text/plain')).toBe(SEED_TEXT);
        expect($exportMimeTypeFromSelection('application/x-myformat')).toBe(
          'custom-payload',
        );
      });
    });

    it('returns null for MIME types that have no registered handler', () => {
      using editor = buildSeededEditor();
      editor.read(() => {
        expect($exportMimeTypeFromSelection('application/x-unknown')).toBe(
          null,
        );
      });
    });

    it('uses the default config when GetClipboardDataExtension is not built into the editor', () => {
      using editor = buildEditorFromExtensions(
        defineExtension({
          $initialEditorState,
          name: '[test-root]',
        }),
      );
      editor.read(() => {
        expect($exportMimeTypeFromSelection('text/plain')).toBe(SEED_TEXT);
        expect($exportMimeTypeFromSelection('text/html')).toContain(SEED_TEXT);
      });
    });
  });

  it('setLexicalClipboardDataTransfer wires custom MIME types into the DataTransfer', () => {
    using editor = buildSeededEditor({
      $exportMimeType: {
        'application/x-myformat': [() => 'custom-payload'],
      },
    });
    const dt = new DataTransferMock();
    editor.read(() => {
      setLexicalClipboardDataTransfer(
        dt as unknown as DataTransfer,
        $getClipboardDataFromSelection(),
      );
    });
    expect(dt.getData('text/plain')).toBe(SEED_TEXT);
    expect(dt.getData('text/html')).toContain(SEED_TEXT);
    expect(dt.getData('application/x-myformat')).toBe('custom-payload');
  });
});
