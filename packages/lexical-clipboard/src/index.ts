/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export {
  $exportMimeTypeFromSelection,
  $generateJSONFromSelectedNodes,
  $generateNodesFromSerializedNodes,
  $getClipboardDataFromSelection,
  $getHtmlContent,
  $getLexicalContent,
  $handlePlainTextDrop,
  $handleRichTextDrop,
  $insertDataTransferForPlainText,
  $insertDataTransferForRichText,
  $insertGeneratedNodes,
  $writeDragSourceToDataTransfer,
  copyToClipboard,
  type ExportMimeTypeConfig,
  type ExportMimeTypeFunction,
  type GetClipboardDataConfig,
  GetClipboardDataExtension,
  type LexicalClipboardData,
  setLexicalClipboardDataTransfer,
} from './clipboard';
