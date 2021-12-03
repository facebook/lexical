/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {SettingName} from './appSettings';
import PlaygroundEditorTheme from './PlaygroundEditorTheme';
import * as React from 'react';
import {useCallback, useMemo, useState} from 'react';
import useSettings from './hooks/useSettings';
import {DEFAULT_SETTINGS} from './appSettings';
import Editor from './Editor';
import {
  createDefaultContext,
  PlaygroundEditorContext,
} from './context/PlaygroundEditorContext';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import TestRecorderPlugin from './plugins/TestRecorderPlugin';
import TypingPerfPlugin from './plugins/TypingPerfPlugin';
import type {PlaygroundContext} from './context/PlaygroundEditorContext';
import OutlineComposer from 'outline-react/OutlineComposer';

function setURLParam(param: SettingName, value: null | boolean) {
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);
  if (value !== null) {
    if (params.has(param)) {
      params.set(param, String(value));
    } else {
      params.append(param, String(value));
    }
  } else {
    if (params.has(param)) {
      params.delete(param);
    }
  }
  url.search = params.toString();
  window.history.pushState(null, '', url.toString());
}

function App(): React$Node {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const setOption = useCallback((setting: SettingName, value: boolean) => {
    setSettings((options) => ({
      ...options,
      [(setting: string)]: value,
    }));
    if (DEFAULT_SETTINGS[setting] === value) {
      setURLParam(setting, null);
    } else {
      setURLParam(setting, value);
    }
  }, []);
  const [settingsButton, settingsSwitches] = useSettings(settings, setOption);
  const {
    measureTypingPerf,
    isCharLimit,
    isCharLimitUtf8,
    isAutocomplete,
    isRichText,
    isCollab,
    showTreeView,
  } = settings;

  const playgroundContextValue = useMemo<PlaygroundContext>(
    () => createDefaultContext(),
    [],
  );

  return (
    <PlaygroundEditorContext.Provider value={playgroundContextValue}>
      <OutlineComposer theme={PlaygroundEditorTheme}>
        <header>
          <img src="logo.svg" alt="Outline Logo" />
        </header>
        <div className="editor-shell">
          <Editor
            isCharLimit={isCharLimit}
            isCharLimitUtf8={isCharLimitUtf8}
            isAutocomplete={isAutocomplete}
            isRichText={isRichText}
            isCollab={isCollab}
          />
        </div>
        {showTreeView && <TreeViewPlugin />}
        {settingsSwitches}
        {settingsButton}
        <TestRecorderPlugin />
        {measureTypingPerf && <TypingPerfPlugin />}
      </OutlineComposer>
    </PlaygroundEditorContext.Provider>
  );
}

export default App;
