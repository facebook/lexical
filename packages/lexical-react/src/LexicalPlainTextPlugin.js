/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from 'lexical';

import * as React from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import usePlainTextSetup from './shared/usePlainTextSetup';
import useDecorators from './shared/useDecorators';
import useCanShowPlaceholder from './shared/useCanShowPlaceholder';

export default function PlainTextPlugin({
  contentEditable,
  placeholder,
  skipInit,
  initialPayloadFn,
  onError,
}: {
  contentEditable: React$Node,
  placeholder: React$Node,
  skipInit?: boolean,
  initialPayloadFn?: (LexicalEditor) => void,
  onError?: (error: Error, log: Array<string>) => void,
}): React$Node {
  const [editor] = useLexicalComposerContext();
  const showPlaceholder = useCanShowPlaceholder(editor);
  usePlainTextSetup(editor, !skipInit, initialPayloadFn);
  const decorators = useDecorators(editor);

  return (
    <>
      {contentEditable}
      {showPlaceholder && placeholder}
      {decorators}
    </>
  );
}
