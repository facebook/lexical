/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as React from 'react';

import {useLexicalComposerContext} from 'lexical-react/LexicalComposerContext';
import usePlainTextSetup from './shared/usePlainTextSetup';
import useLexicalDecorators from './useLexicalDecorators';
import useLexicalCanShowPlaceholder from './useLexicalCanShowPlaceholder';
import useLayoutEffect from 'shared/useLayoutEffect';

function onErrorDefault(e: Error): void {
  throw e;
}

export default function PlainTextPlugin({
  contentEditable,
  placeholder,
  skipInit,
  onError,
}: {
  contentEditable: React$Node,
  placeholder: React$Node,
  skipInit?: boolean,
  onError?: (error: Error, log: Array<string>) => void,
}): React$Node {
  const [editor] = useLexicalComposerContext();
  const showPlaceholder = useLexicalCanShowPlaceholder(editor);
  usePlainTextSetup(editor, !skipInit);
  const decorators = useLexicalDecorators(editor);

  useLayoutEffect(() => {
    return editor.addListener('error', onError || onErrorDefault);
  }, [editor, onError]);

  return (
    <>
      {contentEditable}
      {showPlaceholder && placeholder}
      {decorators}
    </>
  );
}
