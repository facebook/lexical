/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey} from 'outline';
import type {YjsNode, Binding} from '.';

export function diffText(
  startingA: number,
  startingB: number,
  currentText: string,
  text: string,
): [number, number, null | string, null | string] {
  let a = startingA;
  let b = startingB;
  let charA = currentText[a];
  let charB = text[b];
  let diffA = '';
  let diffB = '';
  let hasMismatch = false;
  while (a >= 0 || b >= 0) {
    if (charA === charB) {
      if (hasMismatch) {
        break;
      }
      charA = currentText[--a];
      charB = text[--b];
    } else {
      hasMismatch = true;
      if (a > b) {
        diffA = charA + diffA;
        charA = currentText[--a];
      } else {
        diffB = charB + diffB;
        charB = text[--b];
      }
    }
  }
  if (diffA !== '' || diffB !== '') {
    return [a, b, diffA, diffB];
  }
  return [0, 0, null, null];
}

export function getIndexOfYjsNode(
  yjsParentNode: YjsNode,
  yjsNode: YjsNode,
): number {
  let node = yjsParentNode.firstChild;
  let i = -1;

  if (node === null) {
    return -1;
  }
  do {
    i++;
    if (node === yjsNode) {
      return i;
    }
    node = node.nextSibling;
    if (node === null) {
      return -1;
    }
  } while (node !== null);
  return i;
}

export function spliceYjsText(
  yjsNode: YjsNode,
  text: string,
  index: number,
  delCount: number,
  newText: string,
): string {
  if (delCount !== 0) {
    yjsNode.delete(index, delCount);
  }
  if (newText !== '') {
    yjsNode.insert(index, newText);
  }
  return text.slice(0, index) + newText + text.slice(index + delCount);
}

export function registerYjsNode(
  binding: Binding,
  yjsNode: YjsNode,
  key: NodeKey,
) {
  const yjsNodeMap = binding.nodeMap;
  const reverseYjsNodeMap = binding.reverseNodeMap;
  yjsNodeMap.set(key, yjsNode);
  reverseYjsNodeMap.set(yjsNode, key);
}
