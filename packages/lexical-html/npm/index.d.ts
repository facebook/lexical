/** @module @lexical/html */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { GridSelection, LexicalEditor, LexicalNode, NodeSelection, RangeSelection } from 'lexical';
/**
 * How you parse your html string to get a document is left up to you. In the browser you can use the native
 * DOMParser API to generate a document (see clipboard.ts), but to use in a headless environment you can use JSDom
 * or an equivilant library and pass in the document here.
 */
export declare function $generateNodesFromDOM(editor: LexicalEditor, dom: Document): Array<LexicalNode>;
export declare function $generateHtmlFromNodes(editor: LexicalEditor, selection?: RangeSelection | NodeSelection | GridSelection | null): string;
