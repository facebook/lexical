/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import React from 'react';
import {useCallback} from 'react';
import './EquationEditor.css';

type BaseEquationEditorProps = {
  equation: string,
  setEquation: (string) => void,
  inline: boolean,
  inputRef: {current: null | HTMLElement},
};

export default function EquationEditor({
  equation,
  setEquation,
  inline,
  inputRef,
}: BaseEquationEditorProps): React$Node {
  const onChange = useCallback(
    (event) => {
      setEquation(event.target.value);
    },
    [setEquation],
  );

  const props = {
    equation,
    onChange,
    inputRef,
  };

  return inline ? (
    <InlineEquationEditor {...props} />
  ) : (
    <BlockEquationEditor {...props} />
  );
}

type EquationEditorImplProps = {
  equation: string,
  onChange: (SyntheticInputEvent<HTMLInputElement>) => void,
  inputRef: {current: null | HTMLElement},
};

function InlineEquationEditor({
  equation,
  onChange,
  inputRef,
}: EquationEditorImplProps): React$Node {
  return (
    <span className="EquationEditor_inputBackground">
      <span className="EquationEditor_dollarSign">$</span>
      <input
        className="EquationEditor_inlineEditor"
        value={equation}
        onChange={onChange}
      />
      <span className="EquationEditor_dollarSign">$</span>
    </span>
  );
}

function BlockEquationEditor({
  equation,
  onChange,
  inputRef,
}: EquationEditorImplProps): React$Node {
  return (
    <div className="EquationEditor_inputBackground">
      <span className="EquationEditor_dollarSign">{'$$\n'}</span>
      <textarea
        className="EquationEditor_blockEditor"
        value={equation}
        onChange={onChange}
      />
      <span className="EquationEditor_dollarSign">{'\n$$'}</span>
    </div>
  );
}
