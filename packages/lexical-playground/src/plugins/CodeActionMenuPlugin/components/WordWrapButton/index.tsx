/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$isCodeNode} from '@lexical/code';
import {$getNearestNodeFromDOMNode, LexicalEditor} from 'lexical';
import * as React from 'react';

interface Props {
  editor: LexicalEditor;
  getCodeDOMNode: () => HTMLElement | null;
}

export function WordWrapButton({editor, getCodeDOMNode}: Props) {
  const [isWordWrap, setIsWordWrap] = React.useState(false);

  function handleClick(): void {
    const codeDOMNode = getCodeDOMNode();

    if (!codeDOMNode) {
      return;
    }

    editor.update(() => {
      const codeNode = $getNearestNodeFromDOMNode(codeDOMNode);

      if ($isCodeNode(codeNode)) {
        const newWordWrap = !codeNode.getWordWrap();
        codeNode.setWordWrap(newWordWrap);
        setIsWordWrap(newWordWrap);
      }
    });
  }

  return (
    <button
      className="menu-item"
      onClick={handleClick}
      aria-label="word wrap"
      title={isWordWrap ? 'Disable word wrap' : 'Enable word wrap'}>
      {isWordWrap ? '↩ unwrap' : '↩ wrap'}
    </button>
  );
}
