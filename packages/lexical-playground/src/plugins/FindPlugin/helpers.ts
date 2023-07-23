/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorState, LexicalEditor} from 'lexical';

import {createRectsFromDOMRange} from '@lexical/selection';
import {mergeRegister} from '@lexical/utils';
import {$getSelection, $isRangeSelection, TextNode} from 'lexical';
import {v4 as uuidv4} from 'uuid';

const mutationObserverConfig = {
  attributes: true,
  characterData: true,
  childList: true,
  subtree: true,
};

function px(value: number): string {
  return `${value}px`;
}

export function lexicalPositionNodeOnRange(
  editor: LexicalEditor,
  range: Range,
  onReposition: (node: Array<HTMLElement>) => void,
): () => void {
  const uuid = uuidv4();
  let rootDOMNode: null | HTMLElement = null;
  let parentDOMNode: null | HTMLElement = null;
  let observer: null | MutationObserver = null;
  let lastNodes: Array<HTMLElement> = [];
  const wrapperNode = document.createElement('div');
  wrapperNode.setAttribute('data-id', uuid);

  function position(): void {
    const {left: rootLeft, top: rootTop} = rootDOMNode.getBoundingClientRect(); // const {left: rootLeft, top: rootTop} = nullthrows(rootDOMNode).getBoundingClientRect();
    const parentDOMNode_ = parentDOMNode; // const parentDOMNode_ = nullthrows(parentDOMNode);
    const rects = createRectsFromDOMRange(editor, range);
    if (!wrapperNode.isConnected) {
      parentDOMNode_.append(wrapperNode);
    }
    let hasRepositioned = false;
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      // Try to reuse the previously created Node when possible, no need to
      // remove/create on the most common case reposition case
      const rectNode = lastNodes[i] ?? document.createElement('div');
      const rectNodeStyle = rectNode.style;
      if (rectNodeStyle.position !== 'absolute') {
        rectNodeStyle.position = 'absolute';
        hasRepositioned = true;
      }
      const left = px(rect.left - rootLeft);
      if (rectNodeStyle.left !== left) {
        rectNodeStyle.left = left;
        hasRepositioned = true;
      }
      const top = px(rect.top - rootTop);
      if (rectNodeStyle.top !== top) {
        rectNode.style.top = top;
        hasRepositioned = true;
      }
      const width = px(rect.width);
      if (rectNodeStyle.width !== width) {
        rectNode.style.width = width;
        hasRepositioned = true;
      }
      const height = px(rect.height);
      if (rectNodeStyle.height !== height) {
        rectNode.style.height = height;
        hasRepositioned = true;
      }
      if (rectNode.parentNode !== wrapperNode) {
        wrapperNode.append(rectNode);
        hasRepositioned = true;
      }
      lastNodes[i] = rectNode;
    }
    while (lastNodes.length > rects.length) {
      lastNodes.pop();
    }
    if (hasRepositioned) {
      onReposition(lastNodes);
    }
  }

  function stop(): void {
    parentDOMNode = null;
    rootDOMNode = null;
    observer?.disconnect();
    observer = null;
    wrapperNode.remove();
    for (const node of lastNodes) {
      node.remove();
    }
    lastNodes = [];
  }

  function restart(): void {
    const currentRootDOMNode = editor.getRootElement();
    if (currentRootDOMNode === null) {
      return stop();
    }
    const currentParentDOMNode = currentRootDOMNode.parentElement;
    if (!(currentParentDOMNode instanceof HTMLElement)) {
      return stop();
    }
    stop();
    rootDOMNode = currentRootDOMNode;
    parentDOMNode = currentParentDOMNode;
    observer = new MutationObserver((mutations) => {
      const nextRootDOMNode = editor.getRootElement();
      const nextParentDOMNode = nextRootDOMNode?.parentElement;
      if (
        nextRootDOMNode !== rootDOMNode ||
        nextParentDOMNode !== parentDOMNode
      ) {
        return restart();
      }
      for (const mutation of mutations) {
        if (!wrapperNode.contains(mutation.target)) {
          // TODO throttle
          return position();
        }
      }
    });
    observer.observe(currentParentDOMNode, mutationObserverConfig);
    position();
  }

  const removeRootListener = editor.registerRootListener(restart);

  return () => {
    removeRootListener();
    stop();
  };
}

function emptyFunction() {
  // no statement or instructions
}

export function lexicalMarkSelection(
  editor: LexicalEditor,
  onReposition?: (node: Array<HTMLElement>) => void,
): () => void {
  let previousAnchorNode = null;
  let previousAnchorOffset = null;
  let previousFocusNode = null;
  let previousFocusOffset = null;
  let removeRangeListener: () => void = emptyFunction;
  function compute(editorState: EditorState) {
    editorState.read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        // TODO
        previousAnchorNode = null;
        previousAnchorOffset = null;
        previousFocusNode = null;
        previousFocusOffset = null;
        removeRangeListener();
        removeRangeListener = emptyFunction;
        return;
      }
      const {anchor, focus} = selection;
      const currentAnchorNode = anchor.getNode();
      const currentAnchorNodeKey = currentAnchorNode.getKey();
      const currentAnchorOffset = anchor.offset;
      const currentFocusNode = focus.getNode();
      const currentFocusNodeKey = currentFocusNode.getKey();
      const currentFocusOffset = focus.offset;
      const currentAnchorNodeDOM = editor.getElementByKey(currentAnchorNodeKey);
      const currentFocusNodeDOM = editor.getElementByKey(currentFocusNodeKey);
      const differentAnchorDOM =
        previousAnchorNode === null ||
        currentAnchorNodeDOM === null ||
        currentAnchorOffset !== previousAnchorOffset ||
        currentAnchorNodeKey !== previousAnchorNode.getKey() ||
        (currentAnchorNode !== previousAnchorNode &&
          (!(previousAnchorNode instanceof TextNode) ||
            currentAnchorNode.updateDOM(
              previousAnchorNode,
              currentAnchorNodeDOM,
              editor._config,
            )));
      const differentFocusDOM =
        previousFocusNode === null ||
        currentFocusNodeDOM === null ||
        currentFocusOffset !== previousFocusOffset ||
        currentFocusNodeKey !== previousFocusNode.getKey() ||
        (currentFocusNode !== previousFocusNode &&
          (!(previousFocusNode instanceof TextNode) ||
            currentFocusNode.updateDOM(
              previousFocusNode,
              currentFocusNodeDOM,
              editor._config,
            )));
      if (differentAnchorDOM || differentFocusDOM) {
        const anchorHTMLElement = editor.getElementByKey(
          anchor.getNode().getKey(),
        );
        const focusHTMLElement = editor.getElementByKey(
          focus.getNode().getKey(),
        );
        // TODO handle selection beyond the common TextNode
        if (
          anchorHTMLElement !== null &&
          focusHTMLElement !== null &&
          anchorHTMLElement.tagName === 'SPAN' &&
          focusHTMLElement.tagName === 'SPAN'
        ) {
          const range = document.createRange();
          let firstHTMLElement;
          let firstOffset;
          let lastHTMLElement;
          let lastOffset;
          if (focus.isBefore(anchor)) {
            firstHTMLElement = focusHTMLElement;
            firstOffset = focus.offset;
            lastHTMLElement = anchorHTMLElement;
            lastOffset = anchor.offset;
          } else {
            firstHTMLElement = anchorHTMLElement;
            firstOffset = anchor.offset;
            lastHTMLElement = focusHTMLElement;
            lastOffset = focus.offset;
          }
          range.setStart(firstHTMLElement.firstChild, firstOffset); //   range.setStart(nullthrows(firstHTMLElement.firstChild), firstOffset);
          range.setEnd(lastHTMLElement.firstChild, lastOffset); //   range.setEnd(nullthrows(lastHTMLElement.firstChild), lastOffset);
          removeRangeListener();
          removeRangeListener = lexicalPositionNodeOnRange(
            editor,
            range,
            (domNodes) => {
              if (onReposition === undefined) {
                for (const domNode of domNodes) {
                  const domNodeStyle = domNode.style;
                  if (domNodeStyle.background !== 'Highlight') {
                    domNodeStyle.background = 'Highlight';
                  }
                  if (domNodeStyle.color !== 'HighlightText') {
                    domNodeStyle.color = 'HighlightText';
                  }
                  if (domNodeStyle.zIndex !== '-1') {
                    domNodeStyle.zIndex = '-1';
                  }
                }
              } else {
                onReposition(domNodes);
              }
            },
          );
        }
      }
      previousAnchorNode = currentAnchorNode;
      previousAnchorOffset = currentAnchorOffset;
      previousFocusNode = currentFocusNode;
      previousFocusOffset = currentFocusOffset;
    });
  }
  compute(editor.getEditorState());
  return mergeRegister(
    editor.registerUpdateListener(({editorState}) => compute(editorState)),
    removeRangeListener,
    () => {
      removeRangeListener();
    },
  );
}
