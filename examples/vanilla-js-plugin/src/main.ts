/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './styles.css';

import {registerDragonSupport} from '@lexical/dragon';
import {createEmptyHistoryState, registerHistory} from '@lexical/history';
import {HeadingNode, QuoteNode, registerRichText} from '@lexical/rich-text';
import {mergeRegister} from '@lexical/utils';
import {createEditor} from 'lexical';

import {EmojiNode} from './emoji-plugin/EmojiNode';
import {registerEmoji} from './emoji-plugin/EmojiPlugin';
import prepopulatedRichText from './prepopulatedRichText';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>Vanilla JS Lexical Plugin</h1>
    <div class="editor-wrapper">
      <div id="lexical-editor" contenteditable></div>
    </div>
    <h4>Editor state:</h4>
    <textarea id="lexical-state"></textarea>
  </div>
`;
const editorRef = document.getElementById('lexical-editor');
const stateRef = document.getElementById(
  'lexical-state',
) as HTMLTextAreaElement;

const initialConfig = {
  namespace: 'Vanilla JS Plugin Demo',
  // Register nodes specific for @lexical/rich-text and our plugin
  nodes: [HeadingNode, QuoteNode, EmojiNode],
  onError: (error: Error) => {
    throw error;
  },
};
const editor = createEditor(initialConfig);
editor.setRootElement(editorRef);

// Registering Plugins
mergeRegister(
  registerRichText(editor),
  registerDragonSupport(editor),
  registerHistory(editor, createEmptyHistoryState(), 300),
  registerEmoji(editor),
);

editor.update(prepopulatedRichText, {tag: 'history-merge'});

editor.registerUpdateListener(({editorState}) => {
  stateRef!.value = JSON.stringify(editorState.toJSON(), undefined, 2);
});
