/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import {createRectsFromDOMRange} from '@lexical/selection';
import invariant from 'shared/invariant';

import px from './px';

const mutationObserverConfig = {
  attributes: true,
  characterData: true,
  childList: true,
  subtree: true,
};

export default function positionNodeOnRange(
  editor: LexicalEditor,
  range: Range,
  onReposition: (node: Array<HTMLElement>) => void,
): () => void {
  let rootDOMNode: null | HTMLElement = null;
  let parentDOMNode: null | HTMLElement = null;
  let observer: null | MutationObserver = null;
  let lastNodes: Array<HTMLElement> = [];
  const wrapperNode = document.createElement('div');

  function position(): void {
    invariant(rootDOMNode !== null, 'Unexpected null rootDOMNode');
    invariant(parentDOMNode !== null, 'Unexpected null parentDOMNode');
    const {left: rootLeft, top: rootTop} = rootDOMNode.getBoundingClientRect();
    const parentDOMNode_ = parentDOMNode;
    const rects = createRectsFromDOMRange(editor, range);
    if (!wrapperNode.isConnected) {
      parentDOMNode_.append(wrapperNode);
    }
    let hasRepositioned = false;
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      // Try to reuse the previously created Node when possible, no need to
      // remove/create on the most common case reposition case
      const rectNode = lastNodes[i] || document.createElement('div');
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
    if (observer !== null) {
      observer.disconnect();
    }
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
      const nextParentDOMNode =
        nextRootDOMNode && nextRootDOMNode.parentElement;
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
