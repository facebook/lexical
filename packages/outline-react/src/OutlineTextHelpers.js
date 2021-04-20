/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {RootNode, OutlineNode, TextNode} from 'outline';

import {isTextNode, isBlockNode} from 'outline';
import {CAN_USE_INTL_SEGMENTER} from './OutlineEnv';

export function findTextIntersectionFromCharacters(
  root: RootNode,
  targetCharacters: number,
): null | {node: TextNode, offset: number} {
  let node = root.getFirstChild();
  let currentCharacters = 0;

  mainLoop: while (node !== null) {
    if (isBlockNode(node)) {
      const child = node.getFirstChild();
      if (child !== null) {
        node = child;
        continue;
      }
    } else if (isTextNode(node)) {
      const characters = node.getTextContent().length;

      if (currentCharacters + characters > targetCharacters) {
        return {node, offset: targetCharacters - currentCharacters};
      }
      currentCharacters += characters;
    }
    const sibling = node.getNextSibling();
    if (sibling !== null) {
      node = sibling;
      continue;
    }
    let parent = node.getParent();
    while (parent !== null) {
      const parentSibling = parent.getNextSibling();
      if (parentSibling !== null) {
        node = parentSibling;
        continue mainLoop;
      }
      parent = parent.getParent();
    }
    break;
  }
  return null;
}

export function announceString(s: string): void {
  const body = document.body;
  if (body != null) {
    const announce = document.createElement('div');
    announce.setAttribute('id', 'outline_announce_' + Date.now());
    announce.setAttribute('aria-live', 'polite');
    announce.style.cssText =
      'clip: rect(0, 0, 0, 0); height: 1px; overflow: hidden; position: absolute; width: 1px';
    body.appendChild(announce);

    // The trick to make all screen readers to read the text is to create AND update an element with a unique id:
    // - JAWS remains silent without update
    // - VO remains silent without create, if the text is the same (and doing `announce.textContent=''` doesn't help)
    setTimeout(() => {
      announce.textContent = s;
    }, 100);

    setTimeout(() => {
      body.removeChild(announce);
    }, 500);
  }
}

function hasAtLeastTwoVisibleChars(s: string): boolean {
  if (CAN_USE_INTL_SEGMENTER) {
    const segments = getSegmentsFromString(s, 'grapheme');
    return segments.length > 1;
  }
  // TODO: Implement polyfill for `Intl.Segmenter`.
  return [...s].length > 1;
}

export function announceNode(node: OutlineNode): void {
  if (isTextNode(node) && hasAtLeastTwoVisibleChars(node.getTextContent())) {
    announceString(node.getTextContent());
  }
}

export function getSegmentsFromString(
  string: string,
  granularity: 'grapheme' | 'word' | 'sentence',
): Array<Segment> {
  const segmenter = new Intl.Segmenter(undefined /* locale */, {
    granularity,
  });
  return Array.from(segmenter.segment(string));
}

export function getFirstWordIndex(string: string): number {
  let hasCharacter = false;
  for (let i = 0; i < string.length; i++) {
    const char = string[i];
    if (/\s/.test(char)) {
      if (hasCharacter) {
        return i;
      }
    } else {
      hasCharacter = true;
    }
  }
  return string.length;
}

export function getLastWordIndex(string: string): number {
  let hasCharacter = false;
  for (let i = string.length - 1; i >= 0; i--) {
    const char = string[i];
    if (/\s/.test(char)) {
      if (hasCharacter) {
        return i + 1;
      }
    } else {
      hasCharacter = true;
    }
  }
  return 0;
}
