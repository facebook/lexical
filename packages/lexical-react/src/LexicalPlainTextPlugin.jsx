/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {InitialEditorStateType} from './shared/PlainRichTextUtils';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import * as React from 'react';

import useCanShowPlaceholder from './shared/useCanShowPlaceholder';
import useDecorators from './shared/useDecorators';
import usePlainTextSetup from './shared/usePlainTextSetup';

export default function PlainTextPlugin({
  contentEditable,
  placeholder,
  initialEditorState,
}: {
  contentEditable: React$Node,
  initialEditorState?: InitialEditorStateType,
  placeholder: React$Node,
}): React$Node {
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
