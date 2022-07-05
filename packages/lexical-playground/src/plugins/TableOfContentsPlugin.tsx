/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import '../ui/TableOfContentsStyle.css';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import LexicalTableOfContents__EXPERIMENTAL from '@lexical/react/LexicalTableOfContents__EXPERIMENTAL';
import {NodeKey} from 'packages/lexical/src';
import {HeadingTagType} from 'packages/lexical-rich-text/src';
import {useEffect, useState} from 'react';
import * as React from 'react';

function TableOfContentsList({
  tableOfContents,
}: {
  tableOfContents: Array<[key: NodeKey, text: string, tag: HeadingTagType]>;
}): JSX.Element {
  const [selectedKey, setSelectedKey] = useState('');
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting === true) {
            setSelectedKey(entry.target.id);
          }
        });
      },
      {threshold: 1.0},
    );

    tableOfContents.map((entry) => {
      const headingNode = editor.getElementByKey(entry[0]);
      if (headingNode !== null) {
        headingNode.id = entry[0];
        observer.observe(headingNode);
      }
    });

    return () => {
      tableOfContents.map((entry) => {
        const element = document.getElementById(entry[0]);
        if (element !== null) {
          observer.unobserve(element);
        }
      });
    };
  });
  function scrollToNode(key: NodeKey) {
    editor.getEditorState().read(() => {
      const domElement = editor.getElementByKey(key);
      if (domElement !== null) {
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

export default function TableOfContentsPlugin() {
  return (
    <LexicalTableOfContents__EXPERIMENTAL>
      {(tableOfContents) => {
        return <TableOfContentsList tableOfContents={tableOfContents} />;
      }}
    </LexicalTableOfContents__EXPERIMENTAL>
  );
}
