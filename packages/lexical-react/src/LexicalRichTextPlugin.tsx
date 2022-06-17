/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {InitialEditorStateType} from '@lexical/rich-text';
import * as React from 'react';
import warnOnlyOnce from 'shared/warnOnlyOnce';

import {useCanShowPlaceholder} from './shared/useCanShowPlaceholder';
import {useDecorators} from './shared/useDecorators';
import {useRichTextSetup} from './shared/useRichTextSetup';

const deprecatedInitialEditorStateWarning = warnOnlyOnce(
  'initialEditorState on RichTextPlugin is deprecated and will be removed soon. Use LexicalComposer initialEditorState instead.',
);

export function RichTextPlugin({
  contentEditable,
  placeholder,
  initialEditorState,
}: Readonly<{
  contentEditable: JSX.Element;
  // TODO Remove in 0.4
  initialEditorState?: InitialEditorStateType;
  placeholder: JSX.Element | string;
}>): JSX.Element {
  if (
    __DEV__ &&
    deprecatedInitialEditorStateWarning &&
    initialEditorState !== undefined
  ) {
    deprecatedInitialEditorStateWarning();
  }
  const [editor] = useLexicalComposerContext();
  const showPlaceholder = useCanShowPlaceholder(editor);
  const decorators = useDecorators(editor);
  useRichTextSetup(editor, initialEditorState);

  return (
    <>
      {contentEditable}
      {showPlaceholder && placeholder}
      {decorators}
    </>
  );
}
