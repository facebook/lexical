/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode} from 'lexical';

import invariant from 'shared/invariant';

import {getActiveEditor} from './LexicalUpdates';

export function $withNodeProxy<T extends LexicalNode>(createNode: () => T): T {
  const editor = getActiveEditor();
  const originalNode = createNode();
  const type = originalNode.__type;

  const registeredNode = editor._nodes.get(type);
  invariant(
    registeredNode !== undefined,
    'Node type %s is not registered',
    type,
  );
  const proxyFn = registeredNode.proxy;
  if (proxyFn === null) {
    return originalNode;
  }

  return proxyFn(originalNode);
}
