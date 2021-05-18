/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {RootNode, TextNode} from 'outline';

import {isTextNode, isBlockNode} from 'outline';
import {IS_SAFARI} from './OutlineEnv';

const wordBreakPolyfillRegex =
  /[\s.,\\\/#!$%\^&\*;:{}=\-`~()\uD800-\uDBFF\uDC00-\uDFFF\u3000-\u303F]/;

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
      const characters = node.getTextContentSize();

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

export function getSegmentsFromString(
  string: string,
  granularity: 'grapheme' | 'word' | 'sentence',
): Array<Segment> {
  const segmenter = new Intl.Segmenter(undefined /* locale */, {
    granularity,
  });
  return Array.from(segmenter.segment(string));
}

export function isSegmentWordLike(segment: Segment): boolean {
  const isWordLike = segment.isWordLike;
  if (IS_SAFARI) {
    // Safari treats strings with only numbers as not word like.
    // This isn't correct, so we have to do an additional check for
    // these cases.
    return isWordLike || /^[0-9]*$/g.test(segment.segment);
  }
  return isWordLike;
}

function pushSegment(
  segments: Array<Segment>,
  index: number,
  str: string,
  isWordLike: boolean,
): void {
  segments.push({
    index: index - str.length,
    segment: str,
    isWordLike,
  });
}

export function getWordsFromString(string: string): Array<Segment> {
  const segments = [];
  let wordString = '';
  let nonWordString = '';
  let i;
  for (i = 0; i < string.length; i++) {
    const char = string[i];

    if (wordBreakPolyfillRegex.test(char)) {
      if (wordString !== '') {
        pushSegment(segments, i, wordString, true);
        wordString = '';
      }
      nonWordString += char;
    } else {
      if (nonWordString !== '') {
        pushSegment(segments, i, nonWordString, false);
        nonWordString = '';
      }
      wordString += char;
    }
  }
  if (wordString !== '') {
    pushSegment(segments, i, wordString, true);
  }
  if (nonWordString !== '') {
    pushSegment(segments, i, nonWordString, false);
  }
  return segments;
}
