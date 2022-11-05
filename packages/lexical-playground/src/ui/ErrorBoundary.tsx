/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './ErrorBoundary.css';

import * as React from 'react';
import {ErrorBoundary as ReactErrorBoundary} from 'react-error-boundary';

type Props = {
  children: JSX.Element;
  onError: (error: Error) => void;
};

export default function ErrorBoundary({children, onError}: Props): JSX.Element {
  return (
    <ReactErrorBoundary
      fallback={
        <span className="ErrorBoundary__container">
          React crashed. Please,{' '}
          <a href="https://github.com/facebook/lexical/issues/new/choose">
            file a task
          </a>
          .
        </span>
      }
      onError={onError}>
      {children}
    </ReactErrorBoundary>
  );
}
