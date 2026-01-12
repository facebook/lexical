/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {CodeNode} from '@lexical/code';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$createParagraphNode, $getRoot} from 'lexical';
import {useEffect} from 'react';

export default function CodePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([CodeNode])) {
      return;
    }

    return editor.registerNodeTransform(CodeNode, (codeNode) => {
      // This is to ensure that there is a paragraph node always present after the code node
      if (codeNode.getParent() !== $getRoot()) {
        return codeNode;
      }

      if (!codeNode.getNextSibling()) {
        codeNode.insertAfter($createParagraphNode());
      }

      // This is to ensure that there is a paragraph node always present before the code node
      if (!codeNode.getPreviousSibling()) {
        codeNode.insertBefore($createParagraphNode());
      }

      return codeNode;
    });
  }, [editor]);

  return null;
}
