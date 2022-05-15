/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {InitialEditorStateType} from './shared/PlainRichTextUtils';

import * as React from 'react';

import {useCanShowPlaceholder} from './shared/useCanShowPlaceholder';
import {useDecorators} from './shared/useDecorators';
import {useRichTextSetup} from './shared/useRichTextSetup';

export function RichTextPlugin({
  contentEditable,
  placeholder,
  initialEditorState,
}: Readonly<{
  contentEditable: JSX.Element;
  initialEditorState?: InitialEditorStateType;
  placeholder: JSX.Element | string;
}>): JSX.Element {
  const [editor] = useLexicalComposerContext();

  const showPlaceholder = useCanShowPlaceholder(editor);

  useRichTextSetup(editor, initialEditorState);

  const decorators = useDecorators(editor);

  return (
    <>
      {contentEditable}
      {showPlaceholder && placeholder}
      {decorators}
    </>
  );
}
