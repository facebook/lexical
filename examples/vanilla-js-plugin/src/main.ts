/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './styles.css';

import {ClipboardDOMImportExtension} from '@lexical/clipboard';
import {buildEditorFromExtensions} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {RichTextExtension} from '@lexical/rich-text';
import {configExtension, defineExtension} from 'lexical';

import {EmojiExtension} from './emoji-plugin/EmojiExtension';
import $prepopulatedRichText from './prepopulatedRichText';

const editorRef = document.getElementById('lexical-editor');
const stateRef = document.getElementById(
  'lexical-state',
) as HTMLTextAreaElement;

const appExtension = defineExtension({
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
    return editor.registerUpdateListener(({editorState}) => {
      stateRef.value = JSON.stringify(editorState.toJSON(true), null, 2);
    });
  },
});

const editor = buildEditorFromExtensions(appExtension);
editor.setRootElement(editorRef);

// Dispose the editor and its registrations when Vite replaces this module.
// In an application, also call dispose() when removing the editor permanently.
if (import.meta.hot) {
  import.meta.hot.dispose(() => editor.dispose());
}
