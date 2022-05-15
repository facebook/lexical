import type {LexicalEditor} from 'lexical';

import {useLexicalCanShowPlaceholder} from '@lexical/react/DEPRECATED_useLexicalCanShowPlaceholder';
import {useCallback} from 'react';

export function useLexicalEditor(
  editor: LexicalEditor,
): [(arg0: null | HTMLElement) => void, boolean] {
  const showPlaceholder = useLexicalCanShowPlaceholder(editor);
  const rootElementRef = useCallback(
    (rootElement: null | HTMLElement) => {
      editor.setRootElement(rootElement);
    },
    [editor],
  );
  return [rootElementRef, showPlaceholder];
}