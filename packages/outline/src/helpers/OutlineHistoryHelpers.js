/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ViewModel, OutlineEditor, View} from 'outline';

export const viewModelsWithoutHistory: Set<ViewModel> = new Set();

export function updateWithoutHistory(
  editor: OutlineEditor,
  updateFn: (view: View) => void,
  updateName: string,
): boolean {
  const res = editor.update(updateFn, updateName);
  const pendingViewModel = editor._pendingViewModel;
  if (pendingViewModel !== null) {
    viewModelsWithoutHistory.add(pendingViewModel);
  }
  return res;
}
