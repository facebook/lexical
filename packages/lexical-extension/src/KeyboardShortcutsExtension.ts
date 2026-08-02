/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getSelection,
  type BaseSelection,
  COMMAND_PRIORITY_BEFORE_EDITOR,
  type CommandListenerPriority,
  type CommandListenerPriorityBefore,
  compileKeyboardShortcuts,
  defineExtension,
  IS_APPLE,
  KEY_DOWN_COMMAND,
  type KeyboardShortcut,
  type KeyboardShortcutMatch,
  type LexicalEditor,
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
  if (key === ' ') {
    segments.push('Space');
  } else {
    segments.push(key.length === 1 ? key.toUpperCase() : key);
  }
  return segments.join(separator);
}

/**
 * Keyboard shortcuts by name. The names exist so that other extensions and
 * applications can overlay the table: configuring an existing name remaps
 * that shortcut, configuring it to null disables it, and new names add new
 * shortcuts.
 */
export type NamedKeyboardShortcuts = Record<
  string,
  KeyboardShortcut | readonly KeyboardShortcut[] | null
>;

export interface KeyboardShortcutsConfig {
  /** When `true`, the shortcut listener is not registered */
  disabled: boolean;
  /** The `KEY_DOWN_COMMAND` priority (default {@link COMMAND_PRIORITY_BEFORE_EDITOR}) */
  priority: CommandListenerPriority | CommandListenerPriorityBefore;
  /** The named shortcut table, merged by name across the extension graph */
  shortcuts: NamedKeyboardShortcuts;
}

/**
 * @experimental @internal
 *
 * Compile the given shortcuts and register a single
 * {@link KEY_DOWN_COMMAND} listener that dispatches each matched shortcut's
 * command with the KeyboardEvent as its payload (unless its `$disabled`
 * predicate returns true for the current selection). When several
 * shortcuts match the same event they are tried in the given order until
 * one command dispatch is handled.
 *
 * @returns A cleanup function that unregisters the listener.
 */
function registerKeyboardShortcuts(
  editor: LexicalEditor,
  shortcuts: Iterable<KeyboardShortcut>,
  priority: CommandListenerPriority | CommandListenerPriorityBefore,
): () => void {
  const compiled = compileKeyboardShortcuts(shortcuts);
  return editor.registerCommand(
    KEY_DOWN_COMMAND,
    (event, fromEditor) => {
      let selection: undefined | null | BaseSelection;
      for (const shortcut of compiled.matches(event)) {
        if (editor !== fromEditor && !shortcut.bubbleFromNestedEditors) {
          continue;
        }
        if (shortcut.$disabled) {
          if (selection === undefined) {
            selection = $getSelection();
          }
          if (shortcut.$disabled(selection, fromEditor)) {
            continue;
          }
        }
        const $next = fromEditor.dispatchCommand.bind(
          fromEditor,
          shortcut.command,
          event,
        );
        if (
          shortcut.$dispatch
            ? shortcut.$dispatch(shortcut.command, event, $next, fromEditor)
            : $next()
        ) {
          return true;
        }
      }
      return false;
    },
    priority,
  );
}

function isReadonlyArray<T>(x: unknown): x is readonly T[] {
  return Array.isArray(x);
}

function flattenKeyboardShortcuts(
  shortcuts: readonly KeyboardShortcut[] | KeyboardShortcut | null,
): readonly KeyboardShortcut[] {
  return isReadonlyArray(shortcuts) ? shortcuts : shortcuts ? [shortcuts] : [];
}

function mergeNamedShortcuts(
  config: NamedKeyboardShortcuts,
  overrides: undefined | NamedKeyboardShortcuts,
) {
  if (!overrides) {
    return config;
  }
  // Ensure that overrides are *first* in object entry iteration
  const dest = {...overrides};
  for (const [k, v0] of Object.entries(config)) {
    const v1 = dest[k];
    if (v1 === undefined) {
      dest[k] = v0;
    } else if (v0 && v1 && !isReadonlyArray(v1)) {
      dest[k] = [v1, ...flattenKeyboardShortcuts(v0)];
    }
  }
  return dest;
}

/**
 * @experimental
 *
 * Dispatches a table of keyboard shortcuts from a single compiled
 * `KEY_DOWN_COMMAND` listener, in O(1) per keypress.
 *
 * The table is merged across the whole extension graph by name: any
 * extension or app config can add shortcuts under new names, remap an
 * existing name to a different key or handler, or disable one by
 * configuring it to null. The output exposes the config as signals, so the
 * table can also be remapped at runtime through the `shortcuts` signal
 * (the listener is recompiled on change).
 *
 * A mapping configured as null or an array always overrides all previous
 * mappings of that name. The
 */
export const KeyboardShortcutsExtension = /* @__PURE__ */ defineExtension({
  build(editor, config, state) {
    return namedSignals(config);
  },
  config: /* @__PURE__ */ safeCast<KeyboardShortcutsConfig>({
    disabled: false,
    priority: COMMAND_PRIORITY_BEFORE_EDITOR,
    shortcuts: {},
  }),
  mergeConfig(config, overrides) {
    const merged = shallowMergeConfig(config, overrides);
    merged.shortcuts = mergeNamedShortcuts(
      config.shortcuts,
      overrides.shortcuts,
    );
    return merged;
  },
  name: '@lexical/extension/KeyboardShortcuts',
  register(editor, config, state) {
    const {disabled, priority, shortcuts} = state.getOutput();
    return effect(() => {
      if (!disabled.value) {
        const allShortcuts: KeyboardShortcut[] = [];
        for (const shortcutConfig of Object.values(shortcuts.value)) {
          for (const v of flattenKeyboardShortcuts(shortcutConfig)) {
            allShortcuts.push(v);
          }
        }
        return registerKeyboardShortcuts(editor, allShortcuts, priority.value);
      }
    });
  },
});
