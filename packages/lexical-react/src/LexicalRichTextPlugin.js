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
import useLayoutEffect from 'shared/useLayoutEffect';
import type {LexicalEditor} from 'lexical';

function onErrorDefault(e: Error): void {
  throw e;
}

export default function RichTextPlugin({
  contentEditable,
  placeholder,
  initialPayloadFn,
  clearEditorFn,
  onError,
}: {
  contentEditable: React$Node,
  placeholder: React$Node,
  initialPayloadFn?: (LexicalEditor) => void,
  clearEditorFn?: (LexicalEditor) => void,
  onError?: (error: Error, log: Array<string>) => void,
}): React$Node {
  const [editor] = useLexicalComposerContext();
  const showPlaceholder = useCanShowPlaceholder(editor);
  useRichTextSetup(editor, initialPayloadFn, clearEditorFn);
  const decorators = useDecorators(editor);

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
