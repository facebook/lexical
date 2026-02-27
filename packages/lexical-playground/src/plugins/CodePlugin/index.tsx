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
      // Skip if not a direct child of root
      if (codeNode.getParent() !== $getRoot()) {
        return codeNode;
      }

      // Skip if this is markdown mode (single CodeNode with language 'markdown')
      if (codeNode.getLanguage() === 'markdown') {
        const root = $getRoot();
        const children = root.getChildren();
        if (children.length === 1) {
          return codeNode;
        }
      }

      // Ensure there is a paragraph node after the code node
      if (!codeNode.getNextSibling()) {
        codeNode.insertAfter($createParagraphNode());
      }

      // Ensure there is a paragraph node before the code node
      if (!codeNode.getPreviousSibling()) {
        codeNode.insertBefore($createParagraphNode());
      }

      return codeNode;
    });
  }, [editor]);

  return null;
}
