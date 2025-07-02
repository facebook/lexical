/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { SerializedMarkNode } from './MarkNode';
import type { RangeSelection, TextNode } from 'lexical';
import { $createMarkNode, $isMarkNode, MarkNode } from './MarkNode';
export declare function $unwrapMarkNode(node: MarkNode): void;
export declare function $wrapSelectionInMarkNode(selection: RangeSelection, isBackward: boolean, id: string, createNode?: (ids: Array<string>) => MarkNode): void;
export declare function $getMarkIDs(node: TextNode, offset: number): null | Array<string>;
export { $createMarkNode, $isMarkNode, MarkNode, SerializedMarkNode };
//# sourceMappingURL=index.d.ts.map