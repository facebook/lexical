/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {HeadingTagType} from '@lexical/rich-text';
import type {NodeKey} from 'lexical';

import '../ui/TableOfContentsStyle.css';

import LexicalTableOfContents__EXPERIMENTAL from '@lexical/react/LexicalTableOfContents__EXPERIMENTAL';
import {useEffect, useRef, useState} from 'react';
import * as React from 'react';

import {useLexicalComposerContext} from '../../../lexical-react/src/LexicalComposerContext';

function TableOfContentsList({
  tableOfContents,
}: {
  tableOfContents: Array<[key: NodeKey, text: string, tag: HeadingTagType]>;
}): JSX.Element {
  const [selectedKey, setSelectedKey] = useState('');
  const selectedIndex = useRef(0);
  const [editor] = useLexicalComposerContext();
  let timerId: ReturnType<typeof setTimeout>;
  useEffect(() => {
    if (tableOfContents.length !== 0 && selectedKey === '') {
      scrollToNode(tableOfContents[0][0], 0);
    }
  });

  function scrollToNode(key: NodeKey, currIndex: number) {
    editor.getEditorState().read(() => {
      const domElement = editor.getElementByKey(key);
      if (domElement !== null) {
        domElement.scrollIntoView();
        setSelectedKey(key);
        selectedIndex.current = currIndex;
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
  let lastScrollTop = 0;

  function debounceFunction(func: () => void, delay: number) {
    clearTimeout(timerId);
    timerId = setTimeout(func, delay);
  }

  function isElementOnScreen(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }
  function scrollCallback() {
    const st = window.pageYOffset || document.documentElement.scrollTop;
    //scrolling up
    if (st > lastScrollTop) {
      if (selectedIndex.current < tableOfContents.length - 1) {
        const currHeading = editor.getElementByKey(
          tableOfContents[selectedIndex.current][0],
        );
        if (currHeading !== null) {
          const elementOnScreen = isElementOnScreen(currHeading);
          if (elementOnScreen === false) {
            const nextKey = tableOfContents[selectedIndex.current + 1][0];
            selectedIndex.current++;
            setSelectedKey(nextKey);
          }
        }
      }
    } else {
      // scrolling down
      if (
        selectedIndex.current > 0 &&
        selectedIndex.current < tableOfContents.length - 1
      ) {
        const prevHeading = editor.getElementByKey(
          tableOfContents[selectedIndex.current - 1][0],
        );
        if (prevHeading !== null) {
          const elementOnScreen = isElementOnScreen(prevHeading);
          if (elementOnScreen === true) {
            const prevKey = tableOfContents[selectedIndex.current - 1][0];
            setSelectedKey(prevKey);
            selectedIndex.current--;
          }
        }
      }
    }
    lastScrollTop = st <= 0 ? 0 : st;
  }
  function onScroll(): void {
    debounceFunction(scrollCallback, 10);
  }
  document.addEventListener('scroll', onScroll);

  return (
    <ul className="remove-ul-style">
      {tableOfContents.map(([key, text, tag], index) => (
        <div
          className={selectedKey === key ? 'selectedHeading' : 'heading'}
          key={key}
          onClick={() => scrollToNode(key, index)}
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
      {(tableOfContents) => {
        return <TableOfContentsList tableOfContents={tableOfContents} />;
      }}
    </LexicalTableOfContents__EXPERIMENTAL>
  );
}
