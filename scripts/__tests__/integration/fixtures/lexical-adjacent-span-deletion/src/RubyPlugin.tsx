import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';

import { RbNode } from './RbNode';
import { RubyNode } from './RubyNode';
// import { useSpanDeletion } from './span-deletion';
// import { useNavigateBase } from './navigate-base';

export function RubyPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([RbNode, RubyNode])) {
      throw new Error('Node types not registered on editor');
    }
  }, [editor]);

  // Smooth out navigation of base spans
  // useNavigateBase(editor);

  // Smooth out deletion of base spans
  // useSpanDeletion(editor);

  // Node-specific handlers
  useEffect(() => RubyNode.registerHandlers(editor), [editor]);

  return null;
}
