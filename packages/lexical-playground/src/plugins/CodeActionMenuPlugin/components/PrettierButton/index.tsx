/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './index.css';

import {$isCodeNode} from '@lexical/code';
import {$getNearestNodeFromDOMNode, LexicalEditor} from 'lexical';
import {useState} from 'react';

import {formatCodeWithPrettier} from '../../formatCodeWithPrettier';

interface Props {
  lang: string;
  editor: LexicalEditor;
  getCodeDOMNode: () => HTMLElement | null;
}

export function PrettierButton({lang, editor, getCodeDOMNode}: Props) {
  const [syntaxError, setSyntaxError] = useState<string>('');
  const [tipsVisible, setTipsVisible] = useState<boolean>(false);

  async function handleClick(): Promise<void> {
    const codeDOMNode = getCodeDOMNode();
    if (!codeDOMNode) {
      return;
    }

    let content = '';
    editor.update(() => {
      const codeNode = $getNearestNodeFromDOMNode(codeDOMNode);
      if ($isCodeNode(codeNode)) {
        content = codeNode.getTextContent();
      }
    });
    if (content === '') {
      return;
    }

    try {
      const formattedCode = await formatCodeWithPrettier(content, lang);
      editor.update(() => {
        const codeNode = $getNearestNodeFromDOMNode(codeDOMNode);
        if ($isCodeNode(codeNode)) {
          const selection = codeNode.select(0);
          selection.insertText(formattedCode);
          setSyntaxError('');
          setTipsVisible(false);
        }
      });
    } catch (error: unknown) {
      setError(error);
    }
  }

  function setError(error: unknown) {
    if (error instanceof Error) {
      setSyntaxError(error.message);
      setTipsVisible(true);
    } else {
      console.error('Unexpected error: ', error);
    }
  }

  function handleMouseEnter() {
    if (syntaxError !== '') {
      setTipsVisible(true);
    }
  }

  function handleMouseLeave() {
    if (syntaxError !== '') {
      setTipsVisible(false);
    }
  }

  return (
    <div className="prettier-wrapper">
      <button
        className="menu-item"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label="prettier">
        {syntaxError ? (
          <i className="format prettier-error" />
        ) : (
          <i className="format prettier" />
        )}
      </button>
      {tipsVisible ? (
        <pre className="code-error-tips">{syntaxError}</pre>
      ) : null}
    </div>
  );
}
