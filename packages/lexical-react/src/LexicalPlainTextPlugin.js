/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as React from 'react';
import {useMemo} from 'react';

import {useLexicalComposerContext} from 'lexical-react/LexicalComposerContext';
import useLexicalEditor from 'lexical-react/useLexicalEditor';
import usePlainTextSetup from './shared/usePlainTextSetup';
import useLexicalDecorators from 'lexical-react/useLexicalDecorators';

function onError(e: Error): void {
  throw e;
}

export default function PlainTextPlugin({
  contentEditable,
  placeholder,
  skipInit,
}: {
  contentEditable: (
    rootElementRef: (node: null | HTMLElement) => void,
  ) => React$Node,
  placeholder: () => React$Node,
  skipInit?: boolean,
}): React$Node {
  const [editor] = useLexicalComposerContext();
  const [rootElementRef, showPlaceholder] = useLexicalEditor(editor, onError);
  usePlainTextSetup(editor, !skipInit);
  const decorators = useLexicalDecorators(editor);
  const contentEditableNode: React$Node = useMemo(
    () => contentEditable(rootElementRef),
    [contentEditable, rootElementRef],
  );
  const placeholderNode: React$Node = useMemo(placeholder, [placeholder]);

  return (
    <>
      {contentEditableNode}
      {showPlaceholder && placeholderNode}
      {decorators}
    </>
  );
}
