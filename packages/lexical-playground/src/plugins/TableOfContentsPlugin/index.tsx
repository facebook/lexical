/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './index.css';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import useLexicalTableOfContents from '@lexical/react/useLexicalTableOfContents';
import {$isHeadingNode, HeadingTagType} from '@lexical/rich-text';
import {$getNodeByKey, NodeKey} from 'lexical';
import {useEffect, useRef, useState} from 'react';
import * as React from 'react';

function indent(tagName: HeadingTagType) {
  if (tagName === 'h2') {
    return 'heading2';
  } else if (tagName === 'h3') {
    return 'heading3';
  }
}

type Props = {
  title?: string;
};

export default function TableOfContentsPlugin({title}: Props): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const nodeKeys: NodeKey[] = useLexicalTableOfContents();
  const [selectedKey, setSelectedKey] = useState<null | NodeKey>(null);
  const selectedIndex = useRef(0);

  function scrollToNode(key: NodeKey, currIndex: number) {
    const domElement = editor.getElementByKey(key);
    if (domElement !== null) {
      domElement.scrollIntoView();
      setSelectedKey(key);
      selectedIndex.current = currIndex;
    }
  }
  function isHeadingAtTheTopOfThePage(element: HTMLElement): boolean {
    const elementYPosition = element?.getClientRects()[0].y;
    return elementYPosition >= 0.26 && elementYPosition <= 9;
  }
  function isHeadingAboveViewport(element: HTMLElement): boolean {
    const elementYPosition = element?.getClientRects()[0].y;
    return elementYPosition <= 0;
  }
  function isHeadingBelowTheTopOfThePage(element: HTMLElement): boolean {
    const elementYPosition = element?.getClientRects()[0].y;
    return elementYPosition > 9;
  }

  useEffect(() => {
    function scrollCallback() {
      if (
        nodeKeys.length !== 0 &&
        selectedIndex.current < nodeKeys.length - 1
      ) {
        let currentHeading = editor.getElementByKey(
          nodeKeys[selectedIndex.current],
        );
        if (currentHeading !== null) {
          if (isHeadingBelowTheTopOfThePage(currentHeading)) {
            //On natural scroll, user is scrolling up
            while (
              currentHeading !== null &&
              isHeadingBelowTheTopOfThePage(currentHeading) &&
              selectedIndex.current > 0
            ) {
              const prevHeading = editor.getElementByKey(
                nodeKeys[selectedIndex.current - 1],
              );
              if (
                prevHeading !== null &&
                (isHeadingAboveViewport(prevHeading) ||
                  isHeadingBelowTheTopOfThePage(prevHeading))
              ) {
                selectedIndex.current--;
              }
              currentHeading = prevHeading;
            }
            const prevHeadingKey = nodeKeys[selectedIndex.current];
            setSelectedKey(prevHeadingKey);
          } else if (isHeadingAboveViewport(currentHeading)) {
            //On natural scroll, user is scrolling down
            while (
              currentHeading !== null &&
              isHeadingAboveViewport(currentHeading) &&
              selectedIndex.current < nodeKeys.length - 1
            ) {
              const nextHeading = editor.getElementByKey(
                nodeKeys[selectedIndex.current + 1],
              );
              if (
                nextHeading !== null &&
                (isHeadingAtTheTopOfThePage(nextHeading) ||
                  isHeadingAboveViewport(nextHeading))
              ) {
                selectedIndex.current++;
              }
              currentHeading = nextHeading;
            }
            const nextHeadingKey = nodeKeys[selectedIndex.current];
            setSelectedKey(nextHeadingKey);
          }
        }
      } else {
        selectedIndex.current = 0;
      }
    }
    let timerId: ReturnType<typeof setTimeout>;

    function debounceFunction(func: () => void, delay: number) {
      clearTimeout(timerId);
      timerId = setTimeout(func, delay);
    }

    function onScroll(): void {
      debounceFunction(scrollCallback, 10);
    }

    document.addEventListener('scroll', onScroll);
    return () => document.removeEventListener('scroll', onScroll);
  }, [nodeKeys, editor]);

  return (
    <div className="table-of-contents">
      <ul className="headings">
        {title != null && title.length > 0 && (
          <div className="normal-heading-wrapper">
            <li className="ToC__heading first-heading">{title}</li>
            <br />
          </div>
        )}
        {nodeKeys.map((nodeKey, i) => (
          <Item
            key={nodeKey}
            nodeKey={nodeKey}
            index={i}
            selectedKey={selectedKey}
            scrollToNode={scrollToNode}
          />
        ))}
      </ul>
    </div>
  );
}

type ItemProps = {
  nodeKey: NodeKey;
  index: number;
  selectedKey: null | NodeKey;
  scrollToNode: (key: NodeKey, currIndex: number) => void;
};

function Item({
  nodeKey,
  index,
  selectedKey,
  scrollToNode,
}: ItemProps): null | JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [text, tag] = editor.getEditorState().read(() => {
    const node = $getNodeByKey(nodeKey);
    if (node === null || !$isHeadingNode(node)) {
      return [null, null];
    }
    return [node.getTextContent(), node.getTag()];
  });
  if (text === null || tag === null) {
    return null;
  }

  return (
    <div
      className={`normal-heading-wrapper ${
        selectedKey === nodeKey ? 'selected-heading-wrapper' : ''
      }`}>
      <div
        key={nodeKey}
        onClick={() => scrollToNode(nodeKey, index)}
        role="button"
        className={indent(tag)}
        tabIndex={0}>
        <li
          className={`ToC__heading normal-heading ${
            selectedKey === nodeKey ? 'selected-heading' : ''
          }
      `}>
          {text}
        </li>
      </div>
    </div>
  );
}
