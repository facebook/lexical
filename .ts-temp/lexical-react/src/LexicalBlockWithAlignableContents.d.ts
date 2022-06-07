/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/// <reference types="react" />
import type { ElementFormatType, NodeKey } from 'lexical';
declare type Props = Readonly<{
    children: JSX.Element;
    format: ElementFormatType | null | undefined;
    nodeKey: NodeKey;
}>;
export declare function BlockWithAlignableContents({ children, format, nodeKey, }: Props): JSX.Element;
export {};
