/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalTextEntity} from '@lexical/react/useLexicalTextEntity';
import {TextNode} from 'lexical';
import {useCallback, useEffect} from 'react';

import {$createSpinNode, SpinNode} from '../../lexical-spin/src';

export function SpinPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([SpinNode])) {
      throw new Error('SpinPlugin: SpinNode not registered on editor');
    }
  }, [editor]);

  const createSpinNode = useCallback((textNode: TextNode): SpinNode => {
    return $createSpinNode(textNode.getTextContent());
  }, []);

  const getSpinMatch = (text: string) => {
    const matchArr = /^{{([^{}|]+(?:\|[^{}|]*)*)}}$/.exec(text);

    if (matchArr === null) {
      return null;
    }

    const spinContent = matchArr[1];
    const spinParts = spinContent.split('|');

    if (spinParts.length === 1 && !spinParts[0].includes('|')) {
      return null;
    }

    if (spinParts.length === 1 && spinParts[0].includes('|')) {
      return {
        end: matchArr.index + matchArr[0].length,
        start: matchArr.index,
      };
    }

    return {
      end: matchArr.index + matchArr[0].length,
      start: matchArr.index,
    };
  };

  useLexicalTextEntity<SpinNode>(getSpinMatch, SpinNode, createSpinNode);

  return null;
}
