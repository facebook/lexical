/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import LexicalComposer from '@lexical/react/LexicalComposer';
import * as React from 'react';

import {isDevPlayground} from './appSettings';
import {SettingsContext, useSettings} from './context/SettingsContext';
import {SharedHistoryContext} from './context/SharedHistoryContext';
import Editor from './Editor';
import logo from './images/logo.svg';
import PlaygroundNodes from './nodes/PlaygroundNodes';
import TestRecorderPlugin from './plugins/TestRecorderPlugin';
import TypingPerfPlugin from './plugins/TypingPerfPlugin';
import Settings from './Settings';
import PlaygroundEditorTheme from './themes/PlaygroundEditorTheme';

function App(): React$Node {
  const {settings} = useSettings();
  const {measureTypingPerf} = settings;

  const initialConfig = {
    namespace: 'PlaygroundEditor',
    nodes: [...PlaygroundNodes],
    onError: (error) => {
      throw error;
    },
    theme: PlaygroundEditorTheme,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <SharedHistoryContext>
        <header>
          <a href="https://lexical.dev" target="_blank" rel="noopener">
            <img src={logo} alt="Lexical Logo" />
          </a>
        </header>
        <div className="editor-shell">
          <Editor />
        </div>
        <Settings />
        {isDevPlayground && <TestRecorderPlugin />}
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
