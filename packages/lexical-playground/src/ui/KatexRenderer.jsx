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

export default function KatexRenderer({
  equation,
  inline,
  onClick,
}: $ReadOnly<{
  equation: string,
  inline: boolean,
  onClick: () => void,
}>): React$Node {
  return (
    <span
      onClick={onClick}
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(equation, {
          displayMode: !inline, // true === block display //
          throwOnError: false,
          errorColor: '#cc0000',
          strict: 'warn',
          output: 'html',
          trust: false,
        }),
      }}></span>
  );
}
