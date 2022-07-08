/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {HeadingTagType} from '@lexical/rich-text';
import type {LexicalEditor, NodeKey} from 'lexical';

import '../ui/TableOfContentsStyle.css';

import LexicalTableOfContents__EXPERIMENTAL from '@lexical/react/LexicalTableOfContents__EXPERIMENTAL';
import {$getNearestNodeFromDOMNode} from 'lexical';
import {useEffect, useState} from 'react';
import * as React from 'react';

function TableOfContentsList({
  tableOfContents,
  editor,
}: {
  tableOfContents: Array<[key: NodeKey, text: string, tag: HeadingTagType]>;
  editor: LexicalEditor;
}): JSX.Element {
  const [selectedKey, setSelectedKey] = useState(tableOfContents[0][0]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting === true) {
            editor.update(() => {
              const node = $getNearestNodeFromDOMNode(entry.target);
              if (node !== null) {
                setSelectedKey(node.getKey());
              }
            });
          }
        });
      },
      {rootMargin: '0px -10px 0px 0px'},
    );

    tableOfContents.map((entry) => {
      const headingNode = editor.getElementByKey(entry[0]);
      if (headingNode !== null) {
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
  }, [editor, tableOfContents]);
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
          <li className={indent(tag)}>
            {('' + text).length > 30 ? text.substring(0, 27) + '...' : text}
          </li>
        </div>
      ))}
    </ul>
  );
}

export default function TableOfContentsPlugin() {
  return (
    <LexicalTableOfContents__EXPERIMENTAL>
      {(tableOfContents, editor) => {
        return (
          <TableOfContentsList
            tableOfContents={tableOfContents}
            editor={editor}
          />
        );
      }}
    </LexicalTableOfContents__EXPERIMENTAL>
  );
}
