/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {SerializedDocument} from '@lexical/file';

import {buildEditorFromExtensions} from '@lexical/extension';
import {$convertToMarkdownString} from '@lexical/mdast';
import {configExtension, defineExtension} from 'lexical';
import {expect, onTestFinished, test, vi} from 'vitest';

import {MarkdownPersistenceExtension} from '../../extensions/MarkdownPersistenceExtension';
import {docFromHash, docToHash} from '../../utils/docSerialization';

// The `#doc=` codec runs on CompressionStream/DecompressionStream, so these
// are browser tests. The malformed-link cases matter because a `#doc=` hash
// is user input (a pasted repro link): decoding must fail into a logged
// error, never an unhandled promise rejection.

test('docToHash/docFromHash round-trip a serialized document', async () => {
  const doc: SerializedDocument = {
    editorState: {root: {children: []}},
    lastSaved: 0,
    source: 'MdastEditor',
    version: 'test',
  } as unknown as SerializedDocument;
  const hash = await docToHash(doc);
  expect(hash).toMatch(/^#doc=./);
  expect(await docFromHash(hash)).toEqual(doc);
});

test('docFromHash rejects on a malformed payload', async () => {
  await expect(docFromHash('#doc=%not-base64%')).rejects.toThrow();
});

test('a malformed #doc= link logs and falls back instead of rejecting unhandled', async () => {
  window.history.replaceState({}, '', '#doc=%not-base64%');
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const rejections: PromiseRejectionEvent[] = [];
  const onRejection = (event: PromiseRejectionEvent) => {
    event.preventDefault();
    rejections.push(event);
  };
  window.addEventListener('unhandledrejection', onRejection);
  onTestFinished(() => {
    window.removeEventListener('unhandledrejection', onRejection);
    errorSpy.mockRestore();
    window.history.replaceState(
      {},
      '',
      window.location.pathname + window.location.search,
    );
  });

  const editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        configExtension(MarkdownPersistenceExtension, {
          defaultMarkdown: 'the fallback document',
          storageKey: '',
        }),
      ],
      name: '[mdast-editor-example-persistence-test]',
    }),
  );
  onTestFinished(() => editor.dispose());

  // The rejection (if any) and the catch both land in microtasks queued by
  // the stream decode; a macrotask hop lets them all settle.
  await new Promise(resolve => setTimeout(resolve, 50));

  expect(rejections).toEqual([]);
  expect(errorSpy).toHaveBeenCalledWith(
    'Failed to load the #doc= document from the URL',
    expect.anything(),
  );
  // The editor is not left empty: the default document loaded instead.
  expect(editor.read(() => $convertToMarkdownString())).toBe(
    'the fallback document',
  );
});
