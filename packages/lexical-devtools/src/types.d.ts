/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { BaseSelection, EditorState, LexicalEditor, LexicalNode, NodeKey } from 'lexical';
export type LexicalKey = `__lexicalKey_${string}`;
export interface LexicalHTMLElement extends HTMLElement {
    [key: LexicalKey]: string;
    __lexicalEditor: LexicalEditor;
}
/**
 * Map utility that maps type of all keys in the object to unknown.
 */
type MapObjectPropsToUnknown<T> = {
    [K in keyof T]: T[K] extends (...args: any) => any ? unknown : T[K];
};
export type SerializedRawEditorState = {
    _nodeMap: {
        [key: NodeKey]: MapObjectPropsToUnknown<LexicalNode>;
    } & MapObjectPropsToUnknown<Map<unknown, unknown>>;
    _selection: MapObjectPropsToUnknown<BaseSelection>;
} & MapObjectPropsToUnknown<EditorState>;
export {};
//# sourceMappingURL=types.d.ts.map