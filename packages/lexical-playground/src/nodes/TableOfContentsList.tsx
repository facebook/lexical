/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {NodeKey} from 'packages/lexical/src';
import {HeadingTagType} from 'packages/lexical-rich-text/src';
import {useState} from 'react';
import * as React from 'react';

export default function TableOfContentsList({
  tableOfContents,
}: {
  tableOfContents: Array<[key: NodeKey, text: string, tag: HeadingTagType]>;
}): JSX.Element {
  const [selectedKey, setSelectedKey] = useState('');
  const [editor] = useLexicalComposerContext();
  function scrollToNode(key: NodeKey) {
    editor.getEditorState().read(() => {
      const domElement = editor.getElementByKey(key);
      if (domElement) {
        domElement.scrollIntoView();
        setSelectedKey(key);
      }
    });
  }
  function indent(tagName: HeadingTagType) {
    if (tagName === 'h2') {
      return 'heading2';
    } else if (tagName === 'h3') {
      return 'heading3';
    }
  }
  return (
    <ul className="remove-ul-style">
      {tableOfContents.map(([key, text, tag]) => (
        <div
          className={selectedKey === key ? 'selectedHeading' : 'heading'}
          key={key}
          onClick={() => scrollToNode(key)}
          role="button"
          tabIndex={0}>
          <div className={selectedKey === key ? 'circle' : 'bar'} />
          <li className={indent(tag)}>{text}</li>
        </div>
      ))}
    </ul>
  );
}
