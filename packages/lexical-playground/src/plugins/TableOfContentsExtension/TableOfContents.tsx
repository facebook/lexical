/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {TableOfContentsEntry} from '@lexical/react/LexicalTableOfContentsPlugin';
import type {HeadingTagType} from '@lexical/rich-text';
import type {JSX} from 'react';

import './TableOfContents.css';

import {autoUpdate, offset, useFloating} from '@floating-ui/react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {TableOfContentsPlugin as LexicalTableOfContentsPlugin} from '@lexical/react/LexicalTableOfContentsPlugin';
import {useLexicalEditable} from '@lexical/react/useLexicalEditable';
import {$isHeadingNode} from '@lexical/rich-text';
import {$findMatchingParent} from '@lexical/utils';
import {
  $setState,
  COMMAND_PRIORITY_LOW,
  createCommand,
  type LexicalCommand,
  LexicalNode,
  type NodeKey,
} from 'lexical';
import {
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
} from 'lexical';
import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import {$createContentsItemNode} from '../ContentsExtension/ContentsItemNode';
import {$createContentsLinkNode} from '../ContentsExtension/ContentsLinkNode';
import {
  $createContentsListNode,
  $isContentsListNode,
  ContentsListNode,
} from '../ContentsExtension/ContentsListNode';
import {idState} from '../IdStateExtension';

const MARGIN_ABOVE_EDITOR = 624;
const HEADING_WIDTH = 9;

function indent(tagName: HeadingTagType) {
  if (tagName === 'h2') {
    return 'heading2';
  } else if (tagName === 'h3') {
    return 'heading3';
  }
}

function isHeadingAtTheTopOfThePage(element: HTMLElement): boolean {
  const elementYPosition = element?.getClientRects()[0].y;
  return (
    elementYPosition >= MARGIN_ABOVE_EDITOR &&
    elementYPosition <= MARGIN_ABOVE_EDITOR + HEADING_WIDTH
  );
}
function isHeadingAboveViewport(element: HTMLElement): boolean {
  const elementYPosition = element?.getClientRects()[0].y;
  return elementYPosition < MARGIN_ABOVE_EDITOR;
}
function isHeadingBelowTheTopOfThePage(element: HTMLElement): boolean {
  const elementYPosition = element?.getClientRects()[0].y;
  return elementYPosition >= MARGIN_ABOVE_EDITOR + HEADING_WIDTH;
}

export const INSERT_CONTENTS_COMMAND: LexicalCommand<void> = createCommand(
  'INSERT_CONTENTS_COMMAND',
);

function $generateContentsNode(tableOfContents: Array<TableOfContentsEntry>) {
  const contentsNode = $createContentsListNode();
  tableOfContents.forEach(([key, text, tag], index) => {
    const anchorIndex = `heading-${index + 1}`;
    const item = $createContentsItemNode();
    const headingNode = $getNodeByKey(key);
    if ($isHeadingNode(headingNode)) {
      $setState(headingNode, idState, anchorIndex);
    }
    item.append(
      $createContentsLinkNode('#' + anchorIndex, {
        target: '_self',
      }).append($createTextNode(text)),
    );
    contentsNode.append(item);
    item.setIndent(Number(tag[1]) - 1);
  });
  return contentsNode;
}

function $getTopContentsNode(node: LexicalNode): ContentsListNode | null {
  let list = $findMatchingParent(node, $isContentsListNode);

  if (!list) {
    return null;
  }

  let parent: ContentsListNode | null = list;

  while (parent !== null) {
    parent = parent.getParent();

    if ($isContentsListNode(parent)) {
      list = parent;
    }
  }

  return list;
}

function TableOfContentsList({
  tableOfContents,
}: {
  tableOfContents: Array<TableOfContentsEntry>;
}): JSX.Element {
  const [selectedKey, setSelectedKey] = useState('');
  const selectedIndex = useRef(0);
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      INSERT_CONTENTS_COMMAND,
      () => {
        if (tableOfContents.length > 0) {
          $insertNodes([$generateContentsNode(tableOfContents)]);
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, tableOfContents]);

  function scrollToNode(key: NodeKey, currIndex: number) {
    editor.getEditorState().read(() => {
      const domElement = editor.getElementByKey(key);
      if (domElement !== null) {
        domElement.scrollIntoView({behavior: 'smooth', block: 'center'});
        setSelectedKey(key);
        selectedIndex.current = currIndex;
      }
    });
  }

  useEffect(() => {
    function scrollCallback() {
      if (
        tableOfContents.length !== 0 &&
        selectedIndex.current < tableOfContents.length - 1
      ) {
        let currentHeading = editor.getElementByKey(
          tableOfContents[selectedIndex.current][0],
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
                tableOfContents[selectedIndex.current - 1][0],
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
            const prevHeadingKey = tableOfContents[selectedIndex.current][0];
            setSelectedKey(prevHeadingKey);
          } else if (isHeadingAboveViewport(currentHeading)) {
            //On natural scroll, user is scrolling down
            while (
              currentHeading !== null &&
              isHeadingAboveViewport(currentHeading) &&
              selectedIndex.current < tableOfContents.length - 1
            ) {
              const nextHeading = editor.getElementByKey(
                tableOfContents[selectedIndex.current + 1][0],
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
            const nextHeadingKey = tableOfContents[selectedIndex.current][0];
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
  }, [tableOfContents, editor]);

  return (
    <div className="table-of-contents">
      <ul className="headings">
        {tableOfContents.map(([key, text, tag], index) => {
          if (index === 0) {
            return (
              <div className="normal-heading-wrapper" key={key}>
                <div
                  className="first-heading"
                  onClick={() => scrollToNode(key, index)}
                  role="button"
                  tabIndex={0}>
                  {('' + text).length > 20
                    ? text.substring(0, 20) + '...'
                    : text}
                </div>
                <br />
              </div>
            );
          } else {
            return (
              <div
                className={`normal-heading-wrapper ${
                  selectedKey === key ? 'selected-heading-wrapper' : ''
                }`}
                key={key}>
                <div
                  onClick={() => scrollToNode(key, index)}
                  role="button"
                  className={indent(tag)}
                  tabIndex={0}>
                  <li
                    className={`normal-heading ${
                      selectedKey === key ? 'selected-heading' : ''
                    } `}>
                    {('' + text).length > 27
                      ? text.substring(0, 27) + '...'
                      : text}
                  </li>
                </div>
              </div>
            );
          }
        })}
      </ul>
    </div>
  );
}

function ContentsHoverActions({
  tableOfContents,
  anchorElem = document.body,
}: {
  tableOfContents: Array<TableOfContentsEntry>;
  anchorElem?: HTMLElement;
}) {
  const [editor] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();
  const [focusedContents, setFocusedContents] =
    useState<ContentsListNode | null>(null);
  const contentsElemRef = useRef<HTMLElement | null>(null);

  const {refs, floatingStyles} = useFloating({
    middleware: [offset({crossAxis: -12, mainAxis: -5})],
    placement: 'top-start',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    return editor.registerUpdateListener(({editorState}) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          contentsElemRef.current?.classList.remove('active');
          contentsElemRef.current = null;
          setFocusedContents(null);
          refs.setReference(null);
          return;
        }
        const anchorNode = selection.anchor.getNode();
        const contentsNode = $getTopContentsNode(anchorNode);
        const prevElem = contentsElemRef.current;
        if (contentsNode) {
          const elem = editor.getElementByKey(contentsNode.getKey());
          setFocusedContents(contentsNode);
          refs.setReference(elem);
          if (elem !== prevElem) {
            prevElem?.classList.remove('active');
            elem?.classList.add('active');
          }
          contentsElemRef.current = elem;
        } else {
          prevElem?.classList.remove('active');
          contentsElemRef.current = null;
          setFocusedContents(null);
          refs.setReference(null);
        }
      });
    });
  }, [editor, refs]);

  if (!isEditable || !contentsElemRef.current) {
    return null;
  }

  const handleUpdate = () => {
    if (focusedContents && tableOfContents.length > 0) {
      editor.update(() => {
        const newContents = $generateContentsNode(tableOfContents);
        focusedContents.replace(newContents);
        newContents.selectEnd();
      });
    }
  };

  return createPortal(
    <button
      ref={refs.setFloating}
      style={floatingStyles}
      className="contents-update-button"
      aria-label="Update the table of contents"
      type="button"
      onClick={handleUpdate}
    />,
    anchorElem,
  );
}

export type TableOfContentsProps = {
  anchorElem?: HTMLElement;
};

export function TableOfContentsComponent({anchorElem}: TableOfContentsProps) {
  return (
    <LexicalTableOfContentsPlugin>
      {(tableOfContents) => {
        return (
          <>
            <TableOfContentsList tableOfContents={tableOfContents} />
            <ContentsHoverActions
              tableOfContents={tableOfContents}
              anchorElem={anchorElem}
            />
          </>
        );
      }}
    </LexicalTableOfContentsPlugin>
  );
}
