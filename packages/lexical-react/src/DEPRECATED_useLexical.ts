import {Class} from 'utility-types';
import type {
  EditorState,
  EditorThemeClasses,
  LexicalEditor,
  LexicalNode,
} from 'lexical';
import {createEditor} from 'lexical';
import {useMemo} from 'react';
import useLexicalEditor from './DEPRECATED_useLexicalEditor';
export default function useLexical(editorConfig: {
  disableEvents?: boolean;
  editorState?: EditorState;
  namespace?: string;
  nodes?: ReadonlyArray<Class<LexicalNode>>;
  onError: (error: Error) => void;
  parentEditor?: LexicalEditor;
  readOnly?: boolean;
  theme?: EditorThemeClasses;
}): [LexicalEditor, (arg0: null | HTMLElement) => void, boolean] {
  const editor = useMemo(
    () => createEditor(editorConfig), // Init
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [rootElementRef, showPlaceholder] = useLexicalEditor(editor);
  return [editor, rootElementRef, showPlaceholder];
}