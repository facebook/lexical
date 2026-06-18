/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {type ErrorInfo, type JSX, useCallback} from 'react';
import {ErrorBoundary} from 'react-error-boundary';

/**
 * Props for the {@link LexicalErrorBoundary} component.
 */
export type LexicalErrorBoundaryProps = {
  children: JSX.Element;
  onError: (error: Error, info: ErrorInfo) => void;
};

/**
 * An error boundary used by {@link RichTextPlugin} and {@link PlainTextPlugin}
 * to isolate failures thrown while rendering decorator nodes. It renders a
 * small fallback in place of the failed subtree and forwards the error (coerced
 * to an `Error`) along with the React {@link ErrorInfo} to the `onError`
 * callback.
 *
 * @returns The wrapped `children`, or the fallback element if an error is
 * caught.
 */
export function LexicalErrorBoundary({
  children,
  onError,
}: LexicalErrorBoundaryProps): JSX.Element {
  const wrappedOnError = useCallback(
    (err: unknown, info: ErrorInfo) => {
      onError(
        err instanceof Error ? err : new Error(String(err), {cause: err}),
        info,
      );
    },
    [onError],
  );
  return (
    <ErrorBoundary
      fallback={
        <div
          style={{
            border: '1px solid #f00',
            color: '#f00',
            padding: '8px',
          }}>
          An error was thrown.
        </div>
      }
      onError={wrappedOnError}>
      {children}
    </ErrorBoundary>
  );
}
