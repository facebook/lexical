/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export interface CONTENT_SCRIPT_TAB_ID {
  message: 'CONTENT_SCRIPT_TAB_ID';
  sendResponse: (tabID: number) => void;
}
