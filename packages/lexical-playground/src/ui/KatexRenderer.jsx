/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

// $FlowFixMe
import katex from 'katex';
import * as React from 'react';
import {useEffect, useRef} from 'react';

export default function KatexRenderer({
  equation,
  inline,
  onClick,
}: $ReadOnly<{
  equation: string,
  inline: boolean,
  onClick: () => void,
}>): React$Node {
  const katexElementRef = useRef(null);

  useEffect(() => {
    const katexElement = katexElementRef.current;

    if (katexElement !== null) {
      katex.render(equation, katexElement, {
        displayMode: !inline, // true === block display //
        errorColor: '#cc0000',
        output: 'html',
        strict: 'warn',
        throwOnError: false,
        trust: false,
      });
    }
  }, [equation, inline]);

  return (
    <span role="button" tabIndex={-1} onClick={onClick} ref={katexElementRef} />
  );
}
