import {Class} from 'utility-types';
import type {EntityMatch} from '@lexical/text';
import type {TextNode} from 'lexical';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {registerLexicalTextEntity} from '@lexical/text';
import {mergeRegister} from '@lexical/utils';
import {useEffect} from 'react';

export function useLexicalTextEntity<N: TextNode>(
  getMatch: (text: string) => null | EntityMatch,
  targetNode: Class<N>,
  createNode: (textNode: TextNode) => N,
): void {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return mergeRegister(
      ...registerLexicalTextEntity(editor, getMatch, targetNode, createNode),
    );
  }, [createNode, editor, getMatch, targetNode]);
}