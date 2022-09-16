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
import {useDecorators} from './shared/useDecorators';
import {useRichTextSetup} from './shared/useRichTextSetup';

export function RichTextPlugin({
  contentEditable,
  placeholder,
}: Readonly<{
  contentEditable: JSX.Element;
  placeholder: JSX.Element | string;
}>): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const showPlaceholder = useCanShowPlaceholder(editor);
  const decorators = useDecorators(editor);
  useRichTextSetup(editor);

  return (
    <>
      {contentEditable}
      {showPlaceholder && placeholder}
      {decorators}
    </>
  );
}
