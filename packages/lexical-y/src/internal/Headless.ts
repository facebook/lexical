/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ClientIDRange} from './ClientID';
import type {Doc, Node as YNode} from '@y/y';
import type {LexicalEditor} from 'lexical';

import invariant from '@lexical/internal/invariant';

import {YBinding} from './Binding';

/**
 * @internal The one-off writer: write an editor's current document into the
 * empty layout root of `doc`, without a live binding (also next to an older
 * layout's root, for converters). Throws when the layout root is not empty;
 * warnings go to the editor's `onWarn`.
 * Not exported: the documented seeding path is `seedYState` in
 * `@lexical/y/headless`.
 */
export function writeEditorToYDoc(
  editor: LexicalEditor,
  doc: Doc,
  options: {root?: YNode; clientIDRange?: ClientIDRange} = {},
): void {
  const binding = new YBinding(editor, doc, {
    captureTimeout: null,
    clientIDRange: options.clientIDRange,
    convert: true,
    root: options.root,
  });
  const stop = binding.start();
  try {
    invariant(
      binding.status === 'pending',
      '@lexical/y: the shared root is not empty',
    );
    binding.initialize();
  } finally {
    stop();
  }
}
