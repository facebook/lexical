/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/// <reference types="react" />
import type { LexicalCommand, LexicalNode, SerializedLexicalNode } from 'lexical';
import { DecoratorNode } from 'lexical';
export declare type SerializedHorizontalRuleNode = SerializedLexicalNode & {
    type: 'horizontalrule';
    version: 1;
};
export declare const INSERT_HORIZONTAL_RULE_COMMAND: LexicalCommand<void>;
export declare class HorizontalRuleNode extends DecoratorNode<JSX.Element> {
    static getType(): string;
    static clone(node: HorizontalRuleNode): HorizontalRuleNode;
    static importJSON(serializedNode: SerializedHorizontalRuleNode): HorizontalRuleNode;
    exportJSON(): SerializedLexicalNode;
    createDOM(): HTMLElement;
    getTextContent(): '\n';
    isTopLevel(): true;
    updateDOM(): false;
    decorate(): JSX.Element;
}
export declare function $createHorizontalRuleNode(): HorizontalRuleNode;
export declare function $isHorizontalRuleNode(node: LexicalNode | null | undefined): node is HorizontalRuleNode;
