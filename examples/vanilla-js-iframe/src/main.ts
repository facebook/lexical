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
import {createEditor, HISTORY_MERGE_TAG} from 'lexical';

import prepopulatedRichText from './prepopulatedRichText';

const template = document.querySelector<HTMLTemplateElement>('#app-template')!;
const iframe = document.querySelector<HTMLIFrameElement>('#app-iframe')!;
const iframeDoc = iframe.contentDocument!;
iframeDoc.body.replaceChildren(iframeDoc.importNode(template.content, true));
const editorRef = iframeDoc.querySelector<HTMLDivElement>('#lexical-editor')!;
const stateRef =
  iframeDoc.querySelector<HTMLTextAreaElement>('#lexical-state')!;

const initialConfig = {
  namespace: 'Vanilla JS Demo',
  // Register nodes specific for @lexical/rich-text
  nodes: [HeadingNode, QuoteNode],
  onError: (error: Error) => {
    throw error;
  },
  theme: {
    // Adding styling to Quote node, see styles.css
    quote: 'PlaygroundEditorTheme__quote',
  },
};
const editor = createEditor(initialConfig);
editor.setRootElement(editorRef);

// Registering Plugins
mergeRegister(
  registerRichText(editor),
  registerDragonSupport(editor),
  registerHistory(editor, createEmptyHistoryState(), 300),
);

editor.update(prepopulatedRichText, {tag: HISTORY_MERGE_TAG});

editor.registerUpdateListener(({editorState}) => {
  stateRef!.value = JSON.stringify(editorState.toJSON(), undefined, 2);
});
