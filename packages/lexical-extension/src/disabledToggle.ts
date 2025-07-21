/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {registerStoreToggle} from './registerStoreToggle';
import {Store, type WritableStore} from './Store';

export interface DisabledToggleOptions {
  disabled?: boolean;
  register: () => () => void;
}
export interface DisabledToggleOutput {
  disabled: WritableStore<boolean>;
}
export function disabledToggle(
  opts: DisabledToggleOptions,
): [DisabledToggleOutput, () => void] {
  const disabled = new Store(Boolean(opts.disabled));
  return [{disabled}, registerStoreToggle(disabled, (v) => !v, opts.register)];
}
