/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { Provider } from '.';
import type { CollabDecoratorNode } from './CollabDecoratorNode';
import type { CollabElementNode } from './CollabElementNode';
import type { CollabLineBreakNode } from './CollabLineBreakNode';
import type { CollabTextNode } from './CollabTextNode';
import type { Cursor } from './SyncCursors';
import type { LexicalEditor, NodeKey } from 'lexical';
import type { Doc } from 'yjs';
export declare type ClientID = number;
export declare type Binding = {
    clientID: number;
    collabNodeMap: Map<NodeKey, CollabElementNode | CollabTextNode | CollabDecoratorNode | CollabLineBreakNode>;
    cursors: Map<ClientID, Cursor>;
    cursorsContainer: null | HTMLElement;
    doc: Doc;
    docMap: Map<string, Doc>;
    editor: LexicalEditor;
    id: string;
    nodeProperties: Map<string, Array<string>>;
    root: CollabElementNode;
};
export declare function createBinding(editor: LexicalEditor, provider: Provider, id: string, doc: Doc | null | undefined, docMap: Map<string, Doc>): Binding;
