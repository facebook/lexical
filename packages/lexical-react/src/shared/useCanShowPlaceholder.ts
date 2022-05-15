import type {LexicalEditor} from 'lexical';
import {$canShowPlaceholderCurry} from '@lexical/text';
import {useState} from 'react';
import useLayoutEffect from 'shared/useLayoutEffect';

export function useCanShowPlaceholder(editor: LexicalEditor): boolean {
  const [canShowPlaceholder, setCanShowPlaceholder] = useState(
    editor
      .getEditorState()
      .read($canShowPlaceholderCurry(editor.isComposing())),
  );
  useLayoutEffect(() => {
    return editor.registerUpdateListener(({editorState}) => {
      const isComposing = editor.isComposing();
      const currentCanShowPlaceholder = editorState.read(
        $canShowPlaceholderCurry(isComposing),
      );
      setCanShowPlaceholder(currentCanShowPlaceholder);
    });
  }, [editor]);
  return canShowPlaceholder;
}