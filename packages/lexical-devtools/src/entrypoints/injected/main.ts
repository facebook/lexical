/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {onMessage} from 'webext-bridge/window';
import {StoreApi} from 'zustand';

import {ExtensionState} from '../../store';
import {LexicalHTMLElement} from '../../types';

export default async function main(
  tabID: number,
  extensionStore: StoreApi<ExtensionState>,
) {
  onMessage('refreshLexicalEditorsForTabID', () => {
    scanAndListenForEditors(tabID, extensionStore);
    return null;
  });
  scanAndListenForEditors(tabID, extensionStore);
}

function scanAndListenForEditors(
  tabID: number,
  extensionStore: StoreApi<ExtensionState>,
) {
  const {setStatesForTab, lexicalState} = extensionStore.getState();
  const states = lexicalState[tabID] ?? {};

  // TODO: refresh editors present of the page
  const lexicalNodes = Array.from(
    document.querySelectorAll('div[data-lexical-editor]').values(),
  ) as LexicalHTMLElement[];
  const editors = lexicalNodes.map((node) => node.__lexicalEditor);

  setStatesForTab(
    tabID,
    Object.fromEntries(editors.map((e) => [e._key, e.getEditorState()])),
  );

  editors.forEach((editor) => {
    if (states[editor._key] !== undefined) {
      // already registered
      return;
    }
    editor.registerUpdateListener((event) => {
      const oldVal = extensionStore.getState().lexicalState[tabID];
      setStatesForTab(tabID, {
        ...oldVal,
        [editor._key]: event.editorState,
      });
    });
  });
}
