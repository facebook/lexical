/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {Settings, SettingName} from '../appSettings';

import * as React from 'react';
import {useState} from 'react';
import Switch from '../ui/Switch';

function useSettings(
  settings: Settings,
  onChange: (setting: SettingName, value: boolean) => void = () => {},
): [React$Node, React$Node] {
  const {
    measureTypingPerf,
    isCollab,
    isRichText,
    isCharLimit,
    isCharLimitUtf8,
    isAutocomplete,
    showTreeView,
  } = settings;
  const [showSettings, setShowSettings] = useState(false);

  const button = (
    <button
      id="options-button"
      className={`editor-dev-button ${showSettings ? 'active' : ''}`}
      onClick={() => setShowSettings(!showSettings)}
    />
  );

  const switches = showSettings ? (
    <div className="switches">
      {isRichText && (
        <Switch
          onClick={() => {
            onChange('isCollab', !isCollab);
            window.location.reload();
          }}
          checked={isCollab}
          text="Collaboration"
        />
      )}
      <Switch
        onClick={() => onChange('measureTypingPerf', !measureTypingPerf)}
        checked={measureTypingPerf}
        text="Measure Perf"
      />
      <Switch
        onClick={() => onChange('showTreeView', !showTreeView)}
        checked={showTreeView}
        text="Tree View"
      />
      <Switch
        onClick={() => {
          onChange('isRichText', !isRichText);
          onChange('isCollab', false);
        }}
        checked={isRichText}
        text="Rich Text"
      />
      <Switch
        onClick={() => onChange('isCharLimit', !isCharLimit)}
        checked={isCharLimit}
        text="Char Limit"
      />
      <Switch
        onClick={() => onChange('isCharLimitUtf8', !isCharLimitUtf8)}
        checked={isCharLimitUtf8}
        text="Char Limit (UTF-8)"
      />
      <Switch
        onClick={() => onChange('isAutocomplete', !isAutocomplete)}
        checked={isAutocomplete}
        text="Autocomplete"
      />
    </div>
  ) : null;

  return [button, switches];
}

export default useSettings;
