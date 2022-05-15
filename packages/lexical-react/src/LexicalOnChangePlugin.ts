import type {EditorState, LexicalEditor} from 'lexical';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import useLayoutEffect from 'shared/useLayoutEffect';

export function OnChangePlugin({
  ignoreInitialChange = true,
  ignoreSelectionChange = false,
  onChange,
}: {
  ignoreInitialChange?: boolean;
  ignoreSelectionChange?: boolean;
  onChange: (editorState: EditorState, editor: LexicalEditor) => void;
}): null {
  const [editor] = useLexicalComposerContext();
  useLayoutEffect(() => {
    if (onChange) {
      return editor.registerUpdateListener(
        ({editorState, dirtyElements, dirtyLeaves, prevEditorState}) => {
          if (
            ignoreSelectionChange &&
            dirtyElements.size === 0 &&
            dirtyLeaves.size === 0
          ) {
            return;
          }

          if (ignoreInitialChange && prevEditorState.isEmpty()) {
            return;
          }

          onChange(editorState, editor);
        },
      );
    }
  }, [editor, ignoreInitialChange, ignoreSelectionChange, onChange]);
  return null;
}