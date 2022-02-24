/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {
  $insertDataTransferForPlainText,
  onCopyForPlainText,
  onCutForPlainText,
  onPasteForPlainText,
} from './plainText';
import {
  $insertDataTransferForRichText,
  onCopyForRichText,
  onCutForRichText,
  onPasteForRichText,
} from './richText';

export {
  $insertDataTransferForPlainText,
  $insertDataTransferForRichText,
  onCopyForPlainText,
  onCopyForRichText,
  onCutForPlainText,
  onCutForRichText,
  onPasteForPlainText,
  onPasteForRichText,
};
