/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import React from 'react';

interface Props {
  /** Human-readable label for the example, used in the fallback message. */
  name: string;
  children: React.ReactNode;
}

/**
 * Isolates a single embedded homepage example. If the example throws while
 * rendering (for example, a Lexical node registration invariant firing in an
 * optimized dev build, see #8860) the failure is contained here instead of
 * taking down the entire homepage.
 *
 * The boundary mechanics are delegated to `@lexical/react`'s
 * {@link LexicalErrorBoundary}. The fallback renders a `data-example-error`
 * marker so automated checks can detect a broken example even though the error
 * itself is caught (see scripts/check-homepage-examples.mjs).
 */
export default function ExampleErrorBoundary({
  name,
  children,
}: Props): React.ReactNode {
  return (
    <LexicalErrorBoundary
      onError={error => {
        // Surface the failure on the console so it is visible in the browser
        // and to CI, while keeping the rest of the page interactive.
        console.error(`Homepage example "${name}" crashed:`, error);
      }}
      fallback={
        <div
          data-example-error={name}
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-6 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <p className="font-semibold">This example failed to load.</p>
          <p className="mt-1 opacity-80">
            Something went wrong rendering this demo. The rest of the page is
            unaffected.
          </p>
        </div>
      }>
      <>{children}</>
    </LexicalErrorBoundary>
  );
}
