/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import * as React from 'react';
import PlaygroundController from '../controllers/PlaygroundController';
import {useController} from 'outline-react/OutlineController';
import useOutlineEditor from 'outline-react/useOutlineEditor';
import useOutlinePlainText from 'outline-react/useOutlinePlainText';
import useOutlineDecorators from 'outline-react/useOutlineDecorators';
import ContentEditable from '../ui/ContentEditable';
import Placeholder from '../ui/Placeholder';
import useEditorListeners from '../hooks/useEditorListeners';

function onError(e: Error): void {
  throw e;
}

export default function PlainTextPlugin(): React$Node {
  const [editor, contract] = useController(PlaygroundController);
  const [rootElementRef, showPlaceholder] = useOutlineEditor(editor, onError);
  const clear = useOutlinePlainText(editor);
  const decorators = useOutlineDecorators(editor);
  const isReadOnly = useEditorListeners(contract, clear);

  return (
    <>
      <ContentEditable
        isReadOnly={isReadOnly}
        rootElementRef={rootElementRef}
      />
      {showPlaceholder && <Placeholder>Enter some plain text...</Placeholder>}
      {decorators}
    </>
  );
}
