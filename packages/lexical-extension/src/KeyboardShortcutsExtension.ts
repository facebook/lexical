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
  IS_APPLE,
  type KeyboardShortcut,
  type KeyboardShortcutMatch,
  registerKeyboardShortcuts,
  safeCast,
  shallowMergeConfig,
} from 'lexical';

import {namedSignals} from './namedSignals';
import {effect} from './signals';

export interface FormatKeyboardShortcutOptions {
  /** Override the platform convention (defaults to the runtime platform) */
  isApple?: boolean;
  /** The separator between segments (default `'+'`) */
  separator?: string;
}

/**
 * Format the key binding of a shortcut as a human readable string for
 * menus, tooltips, and help dialogs (e.g. `'⌘+Shift+K'` on Apple platforms
 * and `'Ctrl+Shift+K'` elsewhere). Modifiers with an `'any'` mask are not
 * displayed.
 */
export function formatKeyboardShortcut(
  shortcut: KeyboardShortcutMatch,
  options: FormatKeyboardShortcutOptions = {},
): string {
  const {isApple = IS_APPLE, separator = '+'} = options;
  const {key, modifiers = {}} = shortcut;
  const segments: string[] = [];
  if (modifiers.ctrlKey === true) {
    segments.push(isApple ? '⌃' : 'Ctrl');
  }
  if (modifiers.metaKey === true) {
    segments.push(isApple ? '⌘' : 'Meta');
  }
  if (modifiers.altKey === true) {
    segments.push(isApple ? 'Opt' : 'Alt');
  }
  if (modifiers.shiftKey === true) {
    segments.push('Shift');
  }
  segments.push(
    key === ' ' ? 'Space' : key.length === 1 ? key.toUpperCase() : key,
  );
  return segments.join(separator);
}

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
