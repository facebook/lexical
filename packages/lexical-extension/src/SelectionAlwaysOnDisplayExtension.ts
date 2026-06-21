/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  type MarkSelectionColors,
  selectionAlwaysOnDisplay,
} from '@lexical/utils';
import {defineExtension, safeCast} from 'lexical';

import {namedSignals} from './namedSignals';
import {effect} from './signals';

export interface SelectionAlwaysOnDisplayConfig {
  disabled: boolean;
  onReposition: undefined | ((node: readonly HTMLElement[]) => void);
  colors: undefined | MarkSelectionColors;
}

/**
 * An extension that highlights selected content in the Lexical editor
 * even when the editor is not currently focused.
 */
export const SelectionAlwaysOnDisplayExtension =
  /* @__PURE__ */ defineExtension({
    build: (editor, config, state) => namedSignals(config),
    config: /* @__PURE__ */ safeCast<SelectionAlwaysOnDisplayConfig>({
      colors: undefined,
      disabled: false,
      onReposition: undefined,
    }),
    name: '@lexical/utils/SelectionAlwaysOnDisplay',
    register: (editor, config, state) => {
      const stores = state.getOutput();
      return effect(() => {
        if (!stores.disabled.value) {
          return selectionAlwaysOnDisplay(
            editor,
            stores.onReposition.value,
            stores.colors.value,
          );
        }
      });
    },
  });
