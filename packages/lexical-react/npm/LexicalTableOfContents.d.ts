/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/// <reference types="react" />
import type { LexicalEditor, NodeKey } from 'lexical';
import { HeadingTagType } from '@lexical/rich-text';
export type TableOfContentsEntry = [
    key: NodeKey,
    text: string,
    tag: HeadingTagType
];
type Props = {
    children: (values: Array<TableOfContentsEntry>, editor: LexicalEditor) => JSX.Element;
};
export default function LexicalTableOfContentsPlugin({ children, }: Props): JSX.Element;
export {};
