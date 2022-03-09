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
};

type EquationEditorProps = {
  ...BaseEquationEditorProps,
  inline: boolean,
};

export default function EquationEditor({
  equation,
  setEquation,
  inline,
}: EquationEditorProps): React$Node {
  const onChange = useCallback(
    (event) => {
      setEquation(event.target.value);
    },
    [setEquation],
  );

  const props = {
    equation,
    onChange,
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
};

function InlineEquationEditor({
  equation,
  onChange,
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
