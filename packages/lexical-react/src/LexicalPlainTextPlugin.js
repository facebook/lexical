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
import usePlainTextSetup from './shared/usePlainTextSetup';
import useDecorators from './shared/useDecorators';
import useCanShowPlaceholder from './shared/useCanShowPlaceholder';

export default function PlainTextPlugin({
  contentEditable,
  placeholder,
  skipInit,
}: {
  contentEditable: React$Node,
  placeholder: React$Node,
  skipInit?: boolean,
}): React$Node {
  const [editor] = useLexicalComposerContext();
  const showPlaceholder = useCanShowPlaceholder(editor);
  usePlainTextSetup(editor, !skipInit);
  const decorators = useDecorators(editor);

  return (
    <>
      {contentEditable}
      {showPlaceholder && placeholder}
      {decorators}
    </>
  );
}
