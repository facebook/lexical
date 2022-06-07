/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalEditor } from '../LexicalEditor';
import type { NodeKey } from '../LexicalNode';
import { LexicalNode } from '../LexicalNode';
export declare class DecoratorNode<T = unknown> extends LexicalNode {
    constructor(key?: NodeKey);
    decorate(editor: LexicalEditor): T;
    isIsolated(): boolean;
    isTopLevel(): boolean;
}
export declare function $isDecoratorNode<T>(node: LexicalNode | null | undefined): node is DecoratorNode<T>;
