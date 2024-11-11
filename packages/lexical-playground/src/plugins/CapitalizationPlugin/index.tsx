/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {LexicalEditor, TextNode} from 'lexical';
import {useEffect} from 'react';

import {
  $createCapitalizationNode,
  Capitalization,
  CapitalizationNode,
} from '../../nodes/CapitalizationNode';

function useCapitalization(editor: LexicalEditor): void {
  useEffect(() => {
    if (!editor.hasNodes([CapitalizationNode])) {
      throw new Error(
        'CapitalizationPlugin: CapitalizationNode not registered on editor',
      );
    }

    function $handleCapitalizationCommand(node: TextNode): TextNode {
      const targetNode = node;

      const capitalizationNode = $createCapitalizationNode(
        Capitalization.Titlecase,
        node.getTextContent(),
      );
      targetNode.replace(capitalizationNode);

      return targetNode;
    }

    return mergeRegister(
      editor.registerNodeTransform(TextNode, $handleCapitalizationCommand),
    );
  }, [editor]);
}

export default function CapitalizationPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  return null;
  useCapitalization(editor);
}
