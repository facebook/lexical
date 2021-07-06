/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor} from './OutlineEditor';
import type {NodeKey} from './OutlineNode';
import type {Node as ReactNode} from 'react';

import {OutlineNode} from './OutlineNode';
import invariant from 'shared/invariant';
import {IS_IMMUTABLE} from './OutlineConstants';

export class DecoratorNode extends OutlineNode {
  constructor(key?: NodeKey) {
    super(key);
    this.__type = 'decorator';
    this.__flags = IS_IMMUTABLE;
  }

  decorate(editor: OutlineEditor): ReactNode {
    invariant(false, 'decorate: base method not extended');
  }
}

export function isDecoratorNode(node: ?OutlineNode): boolean %checks {
  return node instanceof DecoratorNode;
}
