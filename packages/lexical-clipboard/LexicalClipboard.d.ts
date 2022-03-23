/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, RangeSelection} from 'lexical';

/*
 * Rich Text
 */

export function $insertDataTransferForRichText(
  dataTransfer: DataTransfer,
  selection: RangeSelection,
  editor: LexicalEditor,
): void;

export function getHtmlContent(editor: LexicalEditor): string;
export function $getLexicalContent(editor: LexicalEditor): string;

/*
 * Plain Text
 */

export function $insertDataTransferForPlainText(
  dataTransfer: DataTransfer,
  selection: RangeSelection,
): void;
