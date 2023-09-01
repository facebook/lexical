/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { Binding } from './Bindings';
import type { GridSelection, NodeKey, NodeSelection, RangeSelection } from 'lexical';
import { Provider } from '.';
export type CursorSelection = {
    anchor: {
        key: NodeKey;
        offset: number;
    };
    caret: HTMLElement;
    color: string;
    focus: {
        key: NodeKey;
        offset: number;
    };
    name: HTMLSpanElement;
    selections: Array<HTMLElement>;
};
export type Cursor = {
    color: string;
    name: string;
    selection: null | CursorSelection;
};
export declare function syncLocalCursorPosition(binding: Binding, provider: Provider): void;
export declare function syncCursorPositions(binding: Binding, provider: Provider): void;
export declare function syncLexicalSelectionToYjs(binding: Binding, provider: Provider, prevSelection: null | RangeSelection | NodeSelection | GridSelection, nextSelection: null | RangeSelection | NodeSelection | GridSelection): void;
