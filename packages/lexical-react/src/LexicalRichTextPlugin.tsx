import {$ReadOnly} from 'utility-types';
import type {InitialEditorStateType} from './shared/PlainRichTextUtils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import * as React from 'react';

import {useCanShowPlaceholder} from './shared/useCanShowPlaceholder';
import {useDecorators} from './shared/useDecorators';
import {useRichTextSetup} from './shared/useRichTextSetup';

export function RichTextPlugin({
  contentEditable,
  placeholder,
  initialEditorState,
}: $ReadOnly<{
  contentEditable: React.ReactNode;
  initialEditorState?: InitialEditorStateType;
  placeholder: React.ReactNode;
}>): React.ReactNode {
  const [editor] = useLexicalComposerContext();
  const showPlaceholder = useCanShowPlaceholder(editor);
  useRichTextSetup(editor, initialEditorState);
  const decorators = useDecorators(editor);
  return (
    <>
      {contentEditable}
      {showPlaceholder && placeholder}
      {decorators}
    </>
  );
}