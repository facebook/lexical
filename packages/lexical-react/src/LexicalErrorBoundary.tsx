/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as React from 'react';
import {ErrorBoundary as ReactErrorBoundary} from 'react-error-boundary';

export type LexicalErrorBoundaryProps = {
  children: JSX.Element;
  onError: (error: Error) => void;
};

export default function LexicalErrorBoundary({
  children,
  onError,
}: LexicalErrorBoundaryProps): JSX.Element {
  return (
    <ReactErrorBoundary
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
      onError={onError}>
      {children}
    </ReactErrorBoundary>
  );
}
