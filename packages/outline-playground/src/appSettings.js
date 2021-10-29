/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

export type SettingName =
  | 'disableBeforeInput'
  | 'isRichText'
  | 'isCharLimit'
  | 'isCharLimitUtf8'
  | 'isAutocomplete'
  | 'showTreeView';

export type Settings = {[SettingName]: boolean};

export const DEFAULT_SETTINGS: Settings = {
  disableBeforeInput: false,
  isRichText: true,
  isCharLimit: false,
  isCharLimitUtf8: false,
  isAutocomplete: false,
  showTreeView: true,
};
