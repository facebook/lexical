/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import * as React from 'react';

import {ErrorBoundary as ReactErrorBoundary} from './shared/ReactErrorBoundary';
import {ErrorBoundaryType, useDecorators} from './shared/useDecorators';

export function useLexicalDecorators(
  editor: LexicalEditor,
  // TODO 0.6 Make non-optional non-default
  ErrorBoundary: ErrorBoundaryType = ({children, onError}) => (
    <ReactErrorBoundary fallback={null} onError={onError}>
      {children}
    </ReactErrorBoundary>
  ),
): Array<JSX.Element> {
  return useDecorators(editor, ErrorBoundary);
}
