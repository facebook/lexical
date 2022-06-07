/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorConfig, LexicalEditor } from '../LexicalEditor';
import type { DOMConversionMap, DOMExportOutput, LexicalNode } from '../LexicalNode';
import type { SerializedElementNode } from './LexicalElementNode';
import type { Spread } from 'lexical';
import { ElementNode } from './LexicalElementNode';
export declare type SerializedParagraphNode = Spread<{
    type: 'paragraph';
    version: 1;
}, SerializedElementNode>;
export declare class ParagraphNode extends ElementNode {
    static getType(): string;
    static clone(node: ParagraphNode): ParagraphNode;
    createDOM(config: EditorConfig): HTMLElement;
    updateDOM(prevNode: ParagraphNode, dom: HTMLElement): boolean;
    static importDOM(): DOMConversionMap | null;
    exportDOM(editor: LexicalEditor): DOMExportOutput;
    static importJSON(serializedNode: SerializedParagraphNode): ParagraphNode;
    exportJSON(): SerializedElementNode;
    insertNewAfter(): ParagraphNode;
    collapseAtStart(): boolean;
}
export declare function $createParagraphNode(): ParagraphNode;
export declare function $isParagraphNode(node: LexicalNode | null | undefined): node is ParagraphNode;
