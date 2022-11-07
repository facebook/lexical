/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import * as React from 'react';

import {useCanShowPlaceholder} from './shared/useCanShowPlaceholder';
import {ErrorBoundaryType, useDecorators} from './shared/useDecorators';
import {usePlainTextSetup} from './shared/usePlainTextSetup';

export function PlainTextPlugin({
  contentEditable,
  placeholder,
  ErrorBoundary,
}: {
  contentEditable: JSX.Element;
  placeholder: JSX.Element | string;
  ErrorBoundary: ErrorBoundaryType;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const showPlaceholder = useCanShowPlaceholder(editor);
  const decorators = useDecorators(editor, ErrorBoundary);
  usePlainTextSetup(editor);

  return (
    <>
      {contentEditable}
      {showPlaceholder && placeholder}
      {decorators}
    </>
  );
}
