/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// [docs:app-extension] Read directly by the Quick Start guide.
import {ClipboardDOMImportExtension} from '@lexical/clipboard';
import {HMRExtension} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {RichTextExtension} from '@lexical/rich-text';
import {configExtension, defineExtension} from 'lexical';

import $prepopulatedRichText from './prepopulatedRichText';

export const AppExtension = defineExtension({
  $initialEditorState: $prepopulatedRichText,
  dependencies: [
    configExtension(HMRExtension, {hot: import.meta.hot ?? null}),
    RichTextExtension,
    ClipboardDOMImportExtension,
    configExtension(HistoryExtension, {delay: 300}),
  ],
  name: '@lexical/examples/vanilla-js',
  namespace: 'Vanilla JS Demo',
  register(editor) {
    const stateRef =
      document.querySelector<HTMLTextAreaElement>('#lexical-state')!;
    return editor.registerUpdateListener(({editorState}) => {
      stateRef.value = JSON.stringify(editorState.toJSON(true), null, 2);
    });
  },
  theme: {quote: 'PlaygroundEditorTheme__quote'},
});
// [/docs:app-extension]
