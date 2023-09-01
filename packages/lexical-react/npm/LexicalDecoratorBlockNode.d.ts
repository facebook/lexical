/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/// <reference types="react" />
import type { ElementFormatType, LexicalNode, NodeKey, SerializedLexicalNode, Spread } from 'lexical';
import { DecoratorNode } from 'lexical';
export type SerializedDecoratorBlockNode = Spread<{
    format: ElementFormatType;
}, SerializedLexicalNode>;
export declare class DecoratorBlockNode extends DecoratorNode<JSX.Element> {
    __format: ElementFormatType;
    constructor(format?: ElementFormatType, key?: NodeKey);
    exportJSON(): SerializedDecoratorBlockNode;
    createDOM(): HTMLElement;
    updateDOM(): false;
    setFormat(format: ElementFormatType): void;
    isInline(): false;
}
export declare function $isDecoratorBlockNode(node: LexicalNode | null | undefined): node is DecoratorBlockNode;
