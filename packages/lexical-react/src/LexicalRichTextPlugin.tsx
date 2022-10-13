/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import * as React from 'react';

import {ErrorBoundary as ReactErrorBoundary} from './shared/ReactErrorBoundary';
import {useCanShowPlaceholder} from './shared/useCanShowPlaceholder';
import {ErrorBoundaryType, useDecorators} from './shared/useDecorators';
import {useRichTextSetup} from './shared/useRichTextSetup';

export function RichTextPlugin({
  contentEditable,
  placeholder,
  // TODO 0.6 Make non-optional non-default
  ErrorBoundary = ({children, onError}) => (
    <ReactErrorBoundary fallback={null} onError={onError}>
      {children}
    </ReactErrorBoundary>
  ),
}: Readonly<{
  contentEditable: JSX.Element;
  placeholder: JSX.Element | string;
  // TODO 0.6 Make non-optional non-default
  ErrorBoundary?: ErrorBoundaryType;
}>): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const showPlaceholder = useCanShowPlaceholder(editor);
  const decorators = useDecorators(editor, ErrorBoundary);
  useRichTextSetup(editor);

  return (
    <>
      {contentEditable}
      {showPlaceholder && placeholder}
      {decorators}
    </>
  );
}
