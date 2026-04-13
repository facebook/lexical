/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {ChildEmitterConfig, StatefulNodeEmitter} from './types';

import {
  $copyNode,
  $createLineBreakNode,
  $createParagraphNode,
  $isDecoratorNode,
  $isElementNode,
  ArtificialNode__DO_NOT_USE,
  type DecoratorNode,
  type ElementNode,
  type LexicalNode,
} from 'lexical';

import {$unwrapArtificialNodes, $wrapContinuousInlinesInPlace} from '.';

type SOFT_BREAK_STATE = 'canSoftBreak' | 'shouldSoftBreak';

abstract class BaseEmitter<
  T extends ElementNode,
  Result,
> implements StatefulNodeEmitter<Result> {
  element: T;
  softBreakState: undefined | SOFT_BREAK_STATE;
  constructor(element: T) {
    this.element = element;
  }
  softBreak(): void {
    if (this.softBreakState === 'canSoftBreak') {
      this.softBreakState = 'shouldSoftBreak';
    }
  }
  abstract close(): Result;
  $emitInlineNode(node: LexicalNode): void {
    this.element.append(node);
  }
  $emitBlockNode(node: ElementNode | DecoratorNode<unknown>): void {
    this.element.append(node);
  }
  $emitNode(node: LexicalNode): void {
    if (($isElementNode(node) || $isDecoratorNode(node)) && !node.isInline()) {
      this.$emitBlockNode(node);
      this.softBreakState = undefined;
    } else {
      if (this.softBreakState === 'shouldSoftBreak') {
        this.$emitInlineNode($createLineBreakNode());
      }
      this.$emitInlineNode(node);
      this.softBreakState = 'canSoftBreak';
    }
  }
}

function $hasInlineAndBlockNodes(children: readonly LexicalNode[]): boolean {
  if (children.length > 1) {
    for (let i = 1, state = children[0].isInline(); i < children.length; i++) {
      const nextState = children[i].isInline();
      if (state !== nextState) {
        return true;
      }
      state = nextState;
    }
  }
  return false;
}

class RootEmitter extends BaseEmitter<
  ArtificialNode__DO_NOT_USE,
  LexicalNode[]
> {
  artificialNodes: ArtificialNode__DO_NOT_USE[];
  $createBlockNode: () => ElementNode;
  constructor($createBlockNode: () => ElementNode) {
    super(new ArtificialNode__DO_NOT_USE());
    this.artificialNodes = [];
    this.$createBlockNode = $createBlockNode;
  }
  close() {
    $unwrapArtificialNodes(this.artificialNodes);
    this.artificialNodes.length = 0;
    const children = this.element.getChildren();
    this.element.clear();
    if ($hasInlineAndBlockNodes(children)) {
      $wrapContinuousInlinesInPlace(children, this.$createBlockNode);
    }
    return children;
  }
  $createArtificialNode(): ArtificialNode__DO_NOT_USE {
    const node = new ArtificialNode__DO_NOT_USE();
    this.artificialNodes.push(node);
    return node;
  }
}

class DelegateEmitter implements StatefulNodeEmitter<void> {
  closeAction: undefined | 'softBreak';
  parent: StatefulNodeEmitter<unknown>;
  constructor(
    parent: StatefulNodeEmitter<unknown>,
    closeAction: undefined | 'softBreak' = undefined,
  ) {
    while (parent instanceof DelegateEmitter) {
      parent = parent.parent;
    }
    this.parent = parent;
    this.closeAction = closeAction;
  }
  close(): void {
    const {closeAction} = this;
    if (closeAction) {
      this.parent[closeAction]();
    }
  }
  softBreak(): void {
    this.parent.softBreak();
  }
  $emitNode(node: LexicalNode): void {
    this.parent.$emitNode(node);
  }
}

class ShadowRootEmitter<T extends ElementNode> extends BaseEmitter<T, void> {
  parent: StatefulNodeEmitter<unknown>;
  currentInlineEmitter: undefined | StatefulNodeEmitter<void>;
  $createBlockNode: (node: LexicalNode) => ElementNode;

  constructor(
    parent: StatefulNodeEmitter<unknown>,
    element: T,
    $createBlockNode: (node: LexicalNode) => ElementNode,
  ) {
    super(element);
    this.parent = parent;
    this.$createBlockNode = $createBlockNode;
  }
  $emitBlockNode(node: ElementNode | DecoratorNode<unknown>): void {
    super.$emitBlockNode(node);
    this.currentInlineEmitter = undefined;
  }
  $emitInlineNode(node: LexicalNode): void {
    if (!this.currentInlineEmitter) {
      const currentBlock = this.$createBlockNode(node);
      this.$emitBlockNode(currentBlock);
      this.currentInlineEmitter = new BlockEmitter(this, currentBlock);
    }
    this.currentInlineEmitter.$emitNode(node);
  }
  close(): void {}
}

class BlockEmitter<T extends ElementNode> extends BaseEmitter<T, void> {
  parent: StatefulNodeEmitter<unknown>;
  initialBlock: T;
  state: undefined | 'requires-new-block';
  $copyBlock: (block: T) => T;
  constructor(
    parent: StatefulNodeEmitter<unknown>,
    initialBlock: T,
    $copyBlock: (block: T) => T = $copyNode,
  ) {
    super(initialBlock);
    this.parent = parent;
    this.initialBlock = initialBlock;
    this.$copyBlock = $copyBlock;
  }
  $emitBlockNode(node: ElementNode | DecoratorNode<unknown>): void {
    this.parent.$emitNode(node);
    this.state = 'requires-new-block';
  }
  $emitInlineNode(node: LexicalNode): void {
    if (this.state === 'requires-new-block') {
      const newBlock = this.$copyBlock(this.initialBlock);
      this.parent.$emitNode(newBlock);
      this.element = newBlock;
      this.state = undefined;
    }
    super.$emitInlineNode(node);
  }
  close(): void {}
}

export function $createRootEmitter(
  $createBlockNode = $createParagraphNode,
): StatefulNodeEmitter<LexicalNode[]> & {
  artificialNodes: ArtificialNode__DO_NOT_USE[];
} {
  return new RootEmitter($createBlockNode);
}

const DEFAULT_EMITTER_CONFIG: ChildEmitterConfig = {
  $copyBlock: $copyNode,
  $createBlockNode: $createParagraphNode,
};

export function $createChildEmitter(
  parent: StatefulNodeEmitter<unknown>,
  node: null | LexicalNode,
  closeAction: undefined | 'softBreak',
  config: ChildEmitterConfig = DEFAULT_EMITTER_CONFIG,
): StatefulNodeEmitter<void> {
  return $isElementNode(node)
    ? node.isShadowRoot()
      ? new ShadowRootEmitter(parent, node, config.$createBlockNode)
      : new BlockEmitter(parent, node, config.$copyBlock)
    : new DelegateEmitter(parent, closeAction);
}
