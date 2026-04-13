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

import './index.css';

import {autoUpdate, offset, useFloating} from '@floating-ui/react';
import {$createLinkNode, LinkNode} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {TableOfContentsPlugin as LexicalTableOfContentsPlugin} from '@lexical/react/LexicalTableOfContentsPlugin';
import {useLexicalEditable} from '@lexical/react/useLexicalEditable';
import {$isHeadingNode, HeadingNode} from '@lexical/rich-text';
import {$findMatchingParent} from '@lexical/utils';
import {
  $getState,
  $setState,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  createCommand,
  createState,
  DELETE_CHARACTER_COMMAND,
  type LexicalCommand,
  mergeRegister,
  type NodeKey,
  TextNode,
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

import {$createContentsItemNode} from '../../nodes/ContentsItemNode';
import {
  $createContentsLinkNode,
  $isContentsLinkNode,
  ContentsLinkNode,
} from '../../nodes/ContentsLinkNode';
import {
  $createContentsListNode,
  $isContentsListNode,
  ContentsListNode,
} from '../../nodes/ContentsListNode';

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

const anchorState = createState('anchor', {
  parse: (v) => (typeof v === 'string' ? v : null),
});

function $generateContentsNode(tableOfContents: Array<TableOfContentsEntry>) {
  const contentsNode = $createContentsListNode();
  tableOfContents.forEach(([key, text, tag], index) => {
    const anchorIndex = `heading-${index + 1}`;
    const item = $createContentsItemNode();
    const headingNode = $getNodeByKey(key);
    if ($isHeadingNode(headingNode)) {
      $setState(headingNode, anchorState, anchorIndex);
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

function TableOfContentsList({
  tableOfContents,
}: {
  tableOfContents: Array<TableOfContentsEntry>;
}): JSX.Element {
  const [selectedKey, setSelectedKey] = useState('');
  const selectedIndex = useRef(0);
  const [editor] = useLexicalComposerContext();

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
    return mergeRegister(
      editor.registerNodeTransform(TextNode, (textNode) => {
        const parent = textNode.getParent();
        const previousSibling = textNode.getPreviousSibling();
        const nextSibling = textNode.getNextSibling();
        // Skip if textNode is already part of an ContentsLink (idempotency check)
        if ($isContentsLinkNode(parent)) {
          return;
        }
        if ($isContentsLinkNode(previousSibling)) {
          previousSibling.append(textNode);
        } else if ($isContentsLinkNode(nextSibling)) {
          nextSibling.splice(0, 0, [textNode]);
        }
      }),
      // The contents link must be within the contents
      // If it's moved outside the contents, convert it to a regular link
      editor.registerNodeTransform(LinkNode, (node) => {
        if ($findMatchingParent(node, $isContentsListNode)) {
          node.replace(
            $createContentsLinkNode(node.getURL(), {
              rel: node.getRel(),
              target: node.getTarget(),
              title: node.getRel(),
            }),
            true,
          );
        }
      }),
      editor.registerNodeTransform(ContentsLinkNode, (node) => {
        if (!$findMatchingParent(node, $isContentsListNode)) {
          node.replace(
            $createLinkNode(node.getURL(), {
              rel: node.getRel(),
              target: node.getTarget(),
              title: node.getRel(),
            }),
            true,
          );
        }
        if (node.isEmpty()) {
          // When a ContentsLink becomes empty (e.g. all text deleted),
          // set element selection at the parent ContentsItem so the user
          // can type new text (TextNode transform moves it into the link)
          // or press backspace to remove the ContentsItem
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const anchorNode = selection.anchor.getNode();
            const contentsItem = node.getParent();
            if (
              contentsItem &&
              (anchorNode === node || anchorNode === contentsItem)
            ) {
              contentsItem.select(0, 0);
            }
          }
        }
      }),
      // Handle deletion within ContentsLink elements:
      // 1. When deleting the last character: keep the ContentsLink empty
      //    and set selection at the parent ContentsItem.
      // 2. When at ContentsItem with an empty ContentsLink:
      //    remove the ContentsItem entirely
      editor.registerCommand(
        DELETE_CHARACTER_COMMAND,
        (isBackward) => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return false;
          }
          const {anchor} = selection;

          // Case 1: Deleting text inside a ContentsLink
          if (anchor.type === 'text') {
            const textNode = anchor.getNode();
            const parent = textNode.getParent();
            if (!$isContentsLinkNode(parent)) {
              return false;
            }
            const contentsItem = parent.getParent();
            if (!contentsItem) {
              return false;
            }
            const textContent = textNode.getTextContent();
            // Collapsed selection: deleting the last remaining character
            if (
              selection.isCollapsed() &&
              textContent.length > 1 &&
              ((isBackward && anchor.offset === 1) ||
                (!isBackward && anchor.offset === 0))
            ) {
              textNode.remove();
              contentsItem.select(0, 0);
              return true;
            }
            // Non-collapsed selection: deleting all text in the link
            if (
              !selection.isCollapsed() &&
              selection.focus.type === 'text' &&
              selection.focus.getNode() === textNode &&
              selection.getTextContent().length === textContent.length
            ) {
              textNode.remove();
              contentsItem.select(0, 0);
              return true;
            }
            return false;
          }

          // Case 2: At a ContentsItem whose only child is empty ContentsLink
          // — remove the ContentsItem entirely
          if (anchor.type === 'element' && anchor.offset === 0) {
            const anchorNode = anchor.getNode();
            const firstChild = anchorNode.getFirstChild();
            if (
              anchorNode.getChildrenSize() === 1 &&
              $isContentsLinkNode(firstChild) &&
              firstChild.isEmpty()
            ) {
              anchorNode.remove();
              return true;
            }
          }

          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      // Synchronizing the anchorState and id attribute for each heading
      editor.registerMutationListener(HeadingNode, (mutations) => {
        mutations.forEach((mutation, key) => {
          if (mutation !== 'destroyed') {
            editor.update(() => {
              const node = $getNodeByKey(key);
              if ($isHeadingNode(node)) {
                const anchor = $getState(node, anchorState);
                const element = editor.getElementByKey(key);
                if (element && anchor) {
                  element.id = anchor;
                }
              }
            });
          }
        });
      }),
    );
  }, [editor]);

  useEffect(() => {
    const unregisterCommand = editor.registerCommand(
      INSERT_CONTENTS_COMMAND,
      () => {
        if (tableOfContents.length > 0) {
          $insertNodes([$generateContentsNode(tableOfContents)]);
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

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
    return () => {
      document.removeEventListener('scroll', onScroll);
      unregisterCommand();
    };
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
        const contentsNode = $findMatchingParent(
          anchorNode,
          $isContentsListNode,
        );
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

export default function TableOfContentsPlugin({
  anchorElem,
}: {
  anchorElem?: HTMLElement;
}) {
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
