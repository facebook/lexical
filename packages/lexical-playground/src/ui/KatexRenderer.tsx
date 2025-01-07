/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */


import katex from 'katex';
import * as React from 'react';
import {useEffect, useRef} from 'react';

export default function KatexRenderer({
  equation,
  inline,
  onDoubleClick,
}: Readonly<{
  equation: string;
  inline: boolean;
  onDoubleClick: () => void;
}>): JSX.Element {
  const katexElementRef = useRef(null);

  // Detect if the browser is Safari
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  useEffect(() => {
    const katexElement = katexElementRef.current;

    if (katexElement !== null) {
      katex.render(equation, katexElement, {
        displayMode: !inline, // true === block display
        errorColor: '#cc0000',
        output: 'html',
        strict: 'warn',
        throwOnError: false,
        trust: false,
      });
    }
  }, [equation, inline]);

  return (
    <>
      {/* Add empty <img> tags only if the browser is not Safari */}
      {!isSafari && <img src="#" alt="" />}
      <span
        role="button"
        tabIndex={-1}
        onDoubleClick={onDoubleClick}
        ref={katexElementRef}
      />
      {!isSafari && <img src="#" alt="" />}
    </>
  );
}
