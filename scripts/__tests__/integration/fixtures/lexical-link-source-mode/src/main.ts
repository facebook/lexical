/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {registerRichText} from '@lexical/rich-text';
import {createEditor} from 'lexical';

// Touch an export from several linked packages so the bundler can't tree-shake
// them away. Importing @lexical/rich-text also pulls in @lexical/clipboard,
// @lexical/selection and @lexical/utils transitively, and @lexical/extension
// pulls in @lexical/internal — so the build exercises source-mode resolution
// across the whole core graph, not just `lexical`. verify-bundle.mjs greps the
// output to confirm every package resolved to TypeScript source rather than a
// prebuilt dist artifact.
export function makeEditor() {
  return createEditor({namespace: 'lexical-link-source-mode'});
}

export function makeRichTextEditor() {
  const editor = makeEditor();
  registerRichText(editor);
  return editor;
}

export const sourceModeExtension = defineExtension({
  name: 'lexical-link-source-mode',
});

export function makeExtensionEditor() {
  return buildEditorFromExtensions({
    dependencies: [sourceModeExtension],
    name: 'lexical-link-source-mode',
  });
}
