/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalNode, DecoratorMap} from 'lexical';

import {DecoratorNode} from 'lexical';
import * as React from 'react';
import useLexicalDecoratorMap from '@lexical/react/useLexicalDecoratorMap';

function PollComponent({
  decoratorMap,
}: {
  decoratorMap: DecoratorMap,
}): React$Node {
  const [name, setName] = useLexicalDecoratorMap(decoratorMap, 'question', '');
  const [password, setPassword] = useLexicalDecoratorMap(
    decoratorMap,
    'votes',
    '',
  );

  return (
    <div>
      <span>PollPlugin is a WIP</span>
      <input
        placeholder="Question"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        placeholder="Votes"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
    </div>
  );
}

export class PollNode extends DecoratorNode {
  static getType(): string {
    return 'poll';
  }

  static clone(node: PollNode): PollNode {
    return new PollNode(node.__state, node.__key);
  }

  createDOM(): HTMLElement {
    return document.createElement('span');
  }

  updateDOM(): false {
    return false;
  }

  decorate(): React$Node {
    return <PollComponent decoratorMap={this.__state} />;
  }
}

export function $createPollNode(): PollNode {
  return new PollNode();
}

export function $isPollNode(node: ?LexicalNode): boolean %checks {
  return node instanceof PollNode;
}
