/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {InitialEditorStateType} from './shared/PlainRichTextUtils';

import * as React from 'react';

import {useLexicalComposerContext} from './LexicalComposerContext';
import {useCanShowPlaceholder} from './shared/useCanShowPlaceholder';
import {useDecorators} from './shared/useDecorators';
import {usePlainTextSetup} from './shared/usePlainTextSetup';

export function PlainTextPlugin({
  contentEditable,
  placeholder,
  initialEditorState,
}: {
  contentEditable: JSX.Element;
  initialEditorState?: InitialEditorStateType;
  placeholder: JSX.Element | string;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();

  const showPlaceholder = useCanShowPlaceholder(editor);
  usePlainTextSetup(editor, initialEditorState);
  const decorators = useDecorators(editor);

  return (
    <>
      {contentEditable}
      {showPlaceholder && placeholder}
      {decorators}
    </>
  );
}
