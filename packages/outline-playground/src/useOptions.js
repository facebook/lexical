/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import * as React from 'react';
import {useState} from 'react';
import Switch from './Switch';

export type Options = {
  measureTypingPerf: boolean,
  isRichText: boolean,
  isCharLimit: boolean,
  isAutocomplete: boolean,
  showTreeView: boolean,
};

function useOptions(
  options: Options,
  onChange: (option: $Keys<Options>, value: boolean) => void = () => {},
): [React$Node, React$Node] {
  const {
    measureTypingPerf,
    isRichText,
    isCharLimit,
    isAutocomplete,
    showTreeView,
  } = options;
  const [showOptions, setShowOptions] = useState(false);

  const button = (
    <button
      id="options-button"
      className={`editor-dev-button ${showOptions ? 'active' : ''}`}
      onClick={() => setShowOptions(!showOptions)}
    />
  );

  const switches = showOptions ? (
    <div className="switches">
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
        onClick={() => onChange('isRichText', !isRichText)}
        checked={isRichText}
        text="Rich Text"
      />
      <Switch
        onClick={() => onChange('isCharLimit', !isCharLimit)}
        checked={isCharLimit}
        text="Char Limit"
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

export default useOptions;
