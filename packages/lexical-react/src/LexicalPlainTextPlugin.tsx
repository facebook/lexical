import type {InitialEditorStateType} from './shared/PlainRichTextUtils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import * as React from 'react';

import {useCanShowPlaceholder} from './shared/useCanShowPlaceholder';
import {useDecorators} from './shared/useDecorators';
import {usePlainTextSetup} from './shared/usePlainTextSetup';

export function PlainTextPlugin({
  contentEditable,
  placeholder,
  initialEditorState,
}: {
  contentEditable: React.ReactNode;
  initialEditorState?: InitialEditorStateType;
  placeholder: React.ReactNode;
}): React.ReactNode {
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