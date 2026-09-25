/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// [docs:app-extension] Read directly by the Creating an Extension guide.
import {ClipboardDOMImportExtension} from '@lexical/clipboard';
import {HistoryExtension} from '@lexical/history';
import {RichTextExtension} from '@lexical/rich-text';
import {configExtension, defineExtension} from 'lexical';

import {EmojiExtension} from './emoji-plugin/EmojiExtension';
import $prepopulatedRichText from './prepopulatedRichText';

export const AppExtension = defineExtension({
  $initialEditorState: $prepopulatedRichText,
  dependencies: [
    RichTextExtension,
    ClipboardDOMImportExtension,
    configExtension(HistoryExtension, {delay: 300}),
    EmojiExtension,
  ],
  name: '@lexical/examples/vanilla-js-plugin',
  namespace: 'Vanilla JS Emoji Demo',
  register(editor) {
    const stateRef =
      document.querySelector<HTMLTextAreaElement>('#lexical-state')!;
    return editor.registerUpdateListener(({editorState}) => {
      stateRef.value = JSON.stringify(editorState.toJSON(true), null, 2);
    });
  },
});
// [/docs:app-extension]
