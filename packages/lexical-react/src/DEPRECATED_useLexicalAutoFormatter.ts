import type {LexicalEditor} from 'lexical';
import {registerMarkdownShortcuts, TRANSFORMERS} from '@lexical/markdown';
import {useEffect} from 'react';

export function useLexicalAutoFormatter(editor: LexicalEditor): void {
  useEffect(() => {
    return registerMarkdownShortcuts(editor, TRANSFORMERS);
  }, [editor]);
}