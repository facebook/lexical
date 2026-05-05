/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {type ErrorInfo, type JSX, useCallback} from 'react';
import {ErrorBoundary} from 'react-error-boundary';

export type LexicalErrorBoundaryProps = {
  children: JSX.Element;
  onError: (error: Error, info: ErrorInfo) => void;
};

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
