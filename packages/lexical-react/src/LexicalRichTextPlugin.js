/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as React from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useRichTextSetup} from './shared/useRichTextSetup';
import useDecorators from './shared/useDecorators';
import useCanShowPlaceholder from './shared/useCanShowPlaceholder';
import type {LexicalEditor} from 'lexical';

export default function RichTextPlugin({
  contentEditable,
  placeholder,
  initialPayloadFn,
  clearEditorFn,
}: {
  contentEditable: React$Node,
  placeholder: React$Node,
  initialPayloadFn?: (LexicalEditor) => void,
  clearEditorFn?: (LexicalEditor) => void,
}): React$Node {
  const [editor] = useLexicalComposerContext();
  const showPlaceholder = useCanShowPlaceholder(editor);
  useRichTextSetup(editor, initialPayloadFn, clearEditorFn);
  const decorators = useDecorators(editor);

  return (
    <>
      {contentEditable}
      {showPlaceholder && placeholder}
      {decorators}
    </>
  );
}
