/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  COMMAND_PRIORITY_NORMAL,
  type CommandListenerPriority,
  defineExtension,
  type KeyboardShortcut,
  registerKeyboardShortcuts,
  safeCast,
  shallowMergeConfig,
} from 'lexical';

import {namedSignals} from './namedSignals';
import {effect} from './signals';

/**
 * Keyboard shortcuts by name. The names exist so that other extensions and
 * applications can overlay the table: configuring an existing name remaps
 * that shortcut, configuring it to null disables it, and new names add new
 * shortcuts.
 */
export type NamedKeyboardShortcuts = Record<string, KeyboardShortcut | null>;

export interface KeyboardShortcutsConfig {
  disabled: boolean;
  /** The `KEY_DOWN_COMMAND` priority (default {@link COMMAND_PRIORITY_NORMAL}) */
  priority: CommandListenerPriority;
  shortcuts: NamedKeyboardShortcuts;
}

/**
 * Dispatches a table of keyboard shortcuts from a single compiled
 * `KEY_DOWN_COMMAND` listener, in O(1) per keypress (see
 * {@link registerKeyboardShortcuts}).
 *
 * The table is merged across the whole extension graph by name: any
 * extension or app config can add shortcuts under new names, remap an
 * existing name to a different key or handler, or disable one by
 * configuring it to null. The output exposes the config as signals, so the
 * table can also be remapped at runtime through the `shortcuts` signal
 * (the listener is recompiled on change).
 */
export const KeyboardShortcutsExtension = /* @__PURE__ */ defineExtension({
  build(editor, config, state) {
    return namedSignals(config);
  },
  config: /* @__PURE__ */ safeCast<KeyboardShortcutsConfig>({
    disabled: false,
    priority: COMMAND_PRIORITY_NORMAL,
    shortcuts: {},
  }),
  mergeConfig(config, overrides) {
    const merged = shallowMergeConfig(config, overrides);
    if (overrides.shortcuts) {
      merged.shortcuts = {...config.shortcuts, ...overrides.shortcuts};
    }
    return merged;
  },
  name: '@lexical/extension/KeyboardShortcuts',
  register(editor, config, state) {
    const {disabled, priority, shortcuts} = state.getOutput();
    return effect(() => {
      if (!disabled.value) {
        return registerKeyboardShortcuts(
          editor,
          Object.values(shortcuts.value).filter(
            (shortcut): shortcut is KeyboardShortcut => shortcut !== null,
          ),
          {priority: priority.value},
        );
      }
    });
  },
});
