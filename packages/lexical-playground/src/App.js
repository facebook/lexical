/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import PlaygroundEditorTheme from './themes/PlaygroundEditorTheme';
import * as React from 'react';
import Editor from './Editor';
import Settings from './Settings';
import TestRecorderPlugin from './plugins/TestRecorderPlugin';
import TypingPerfPlugin from './plugins/TypingPerfPlugin';
import {SharedHistoryContext} from './context/SharedHistoryContext';
import {SettingsContext, useSettings} from './context/SettingsContext';
import LexicalComposer from '@lexical/react/LexicalComposer';
import PlaygroundNodes from './nodes/PlaygroundNodes';

function App(): React$Node {
  const {settings} = useSettings();
  const {measureTypingPerf} = settings;

  const initialConfig = {
    namespace: 'PlaygroundEditor',
    theme: PlaygroundEditorTheme,
    nodes: [...PlaygroundNodes],
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <SharedHistoryContext>
        <header>
          <img src="logo.svg" alt="Lexical Logo" />
        </header>
        <div className="editor-shell">
          <Editor />
        </div>
        <Settings />
        <TestRecorderPlugin />
        {measureTypingPerf && <TypingPerfPlugin />}
      </SharedHistoryContext>
    </LexicalComposer>
  );
}

export default function PlaygroundApp(): React$Node {
  return (
    <SettingsContext>
      <App />
    </SettingsContext>
  );
}
