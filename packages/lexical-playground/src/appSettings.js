/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

export type SettingName =
  | 'disableBeforeInput'
  | 'measureTypingPerf'
  | 'isRichText'
  | 'isCollab'
  | 'isCharLimit'
  | 'isCharLimitUtf8'
  | 'isAutocomplete'
  | 'showTreeView'
  | 'showNestedEditorTreeView';

export type Settings = {[SettingName]: boolean};

export const DEFAULT_SETTINGS: Settings = {
  disableBeforeInput: false,
  measureTypingPerf: false,
  isRichText: true,
  isCollab: false,
  isCharLimit: false,
  isCharLimitUtf8: false,
  isAutocomplete: false,
  showTreeView: true,
  showNestedEditorTreeView: false,
};
