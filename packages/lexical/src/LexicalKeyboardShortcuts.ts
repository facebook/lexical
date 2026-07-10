/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  CommandListenerPriority,
  LexicalCommand,
  LexicalEditor,
} from './LexicalEditor';
import type {BaseSelection} from './LexicalSelection';
import type {
  KeyboardEventModifierMask,
  KeyboardEventModifiers,
} from './LexicalUtils';

import {IS_APPLE} from './environment';
import {KEY_DOWN_COMMAND} from './LexicalCommands';
import {COMMAND_PRIORITY_NORMAL} from './LexicalEditor';
import {$getSelection} from './LexicalSelection';

/**
 * The data that describes which keyboard events a shortcut matches: an
 * `event.key` value (case-insensitive) plus a
 * {@link KeyboardEventModifierMask}. The matching semantics are identical to
 * {@link isExactShortcutMatch}, including the `event.code` fallback for
 * single-character keys on non-Latin keyboard layouts.
 */
export interface KeyboardShortcutMatch {
  /**
   * The `KeyboardEvent.key` to match, case-insensitive
   * (e.g. `'b'`, `'1'`, `'Enter'`, `'ArrowLeft'`)
   */
  key: string;
  /**
   * The expected state of the modifier keys. A modifier that is omitted or
   * `false` must not be pressed, `true` must be pressed, and `'any'` is
   * ignored. The default of `{}` matches only events with no modifiers.
   */
  modifiers?: KeyboardEventModifierMask;
}

/**
 * A keyboard shortcut is pure data: the key and modifiers to match, and the
 * command to dispatch (with the matched KeyboardEvent as its payload) when
 * it does. Keeping the action to a command keeps the mapping declarative -
 * a shortcut table can be rendered as a menu (see
 * {@link formatKeyboardShortcut}), remapped, or serialized, and the
 * behavior lives in command listeners where any other UI can share it.
 */
export interface KeyboardShortcut extends KeyboardShortcutMatch {
  /**
   * The command dispatched with the matched KeyboardEvent as its payload.
   * The event is considered handled when the dispatch is handled; an
   * unhandled dispatch falls through to any other shortcut on the same key
   * and modifiers. Listeners are responsible for calling
   * `event.preventDefault()` if the default action must be suppressed.
   */
  command: LexicalCommand<KeyboardEvent>;
  /**
   * A human readable description of what the shortcut does, for building
   * menus or help dialogs from a shortcut table
   */
  description?: string;
  /**
   * Called with the current selection before the command is dispatched;
   * returning true skips this shortcut (falling through to any other
   * shortcut on the same key and modifiers). Menu builders may use the
   * same predicate to render an item as disabled.
   */
  $disabled?: (
    selection: null | BaseSelection,
    editor: LexicalEditor,
  ) => boolean;
  /**
   * Optional middleware around the command dispatch, for shortcuts that
   * must run additional code (e.g. setting some state) without defining a
   * wrapper command. It is responsible for calling `$next()` - which is
   * `editor.dispatchCommand(command, event)` - and returning whether the
   * event was handled (an unhandled event falls through to any other
   * shortcut on the same key and modifiers).
   */
  $dispatch?: (
    command: LexicalCommand<KeyboardEvent>,
    event: KeyboardEvent,
    $next: () => boolean,
    editor: LexicalEditor,
  ) => boolean;
}

/**
 * The modifier mask for the primary shortcut modifier:
 * ⌘ (metaKey) on Apple platforms and Ctrl elsewhere.
 */
export const CONTROL_OR_META: KeyboardEventModifierMask = {
  ctrlKey: !IS_APPLE,
  metaKey: IS_APPLE,
};

/**
 * The modifier mask conventionally used for word-level editing shortcuts:
 * Option (altKey) on Apple platforms and Ctrl elsewhere.
 */
export const CONTROL_OR_ALT: KeyboardEventModifierMask = {
  altKey: IS_APPLE,
  ctrlKey: !IS_APPLE,
};

const MODIFIER_BITS = [
  ['altKey', 1],
  ['ctrlKey', 2],
  ['metaKey', 4],
  ['shiftKey', 8],
] as const;

function getEventModifierBits(event: KeyboardEventModifiers): number {
  let bits = 0;
  for (const [prop, bit] of MODIFIER_BITS) {
    if (event[prop]) {
      bits |= bit;
    }
  }
  return bits;
}

/**
 * Enumerate the modifier bitmasks that satisfy the mask, expanding each
 * `'any'` into both states (so a mask with two `'any'` yields four
 * bitmasks, and a fully concrete mask yields exactly one).
 */
function getMaskModifierBits(mask: KeyboardEventModifierMask): number[] {
  let combos = [0];
  for (const [prop, bit] of MODIFIER_BITS) {
    const expected = mask[prop] || false;
    if (expected === 'any') {
      combos = combos.concat(combos.map(bits => bits | bit));
    } else if (expected) {
      combos = combos.map(bits => bits | bit);
    }
  }
  return combos;
}

function pushEntry<S>(map: Map<string, S[]>, mapKey: string, shortcut: S) {
  const entry = map.get(mapKey);
  if (entry) {
    entry.push(shortcut);
  } else {
    map.set(mapKey, [shortcut]);
  }
}

/**
 * A shortcut table compiled for O(1) dispatch. Look-up is by a composite of
 * the event's modifier bitmask and its `key` (with a second look-up by
 * `code` for non-Latin layouts), so the cost of {@link match} is independent
 * of the number of shortcuts in the table.
 */
export class CompiledKeyboardShortcuts<
  S extends KeyboardShortcutMatch = KeyboardShortcut,
> {
  /** `${modifierBits}:${key.toLowerCase()}` -> shortcuts in insertion order */
  private byKey: Map<string, S[]> = new Map();
  /**
   * `${modifierBits}:${code}` (e.g. `Digit1`, `KeyB`) -> shortcuts, used
   * only when `event.key` is not a single ASCII character so that
   * single-character shortcuts still work on non-Latin keyboard layouts
   * (the same fallback as {@link isExactShortcutMatch})
   */
  private byCode: Map<string, S[]> = new Map();

  add(shortcut: S): this {
    const {key, modifiers = {}} = shortcut;
    const lowerKey = key.toLowerCase();
    for (const bits of getMaskModifierBits(modifiers)) {
      pushEntry(this.byKey, `${bits}:${lowerKey}`, shortcut);
      if (key.length === 1) {
        if (/[0-9]/.test(key)) {
          pushEntry(this.byCode, `${bits}:Digit${key}`, shortcut);
        } else if (/[a-z]/.test(lowerKey)) {
          pushEntry(
            this.byCode,
            `${bits}:Key${lowerKey.toUpperCase()}`,
            shortcut,
          );
        }
      }
    }
    return this;
  }

  /**
   * Iterate all shortcuts matching the event in insertion order.
   * Matches by `key` precede matches by the `code` fallback.
   */
  *matches(event: KeyboardEventModifiers): Generator<S, void> {
    const bits = getEventModifierBits(event);
    const byKey = this.byKey.get(`${bits}:${event.key.toLowerCase()}`);
    if (byKey) {
      yield* byKey;
    }
    // The code fallback only applies when event.key is not a single ASCII
    // character, otherwise it would break remapped layouts (Dvorak, etc.)
    if (
      this.byCode.size > 0 &&
      !(event.key.length === 1 && event.key.charCodeAt(0) <= 127)
    ) {
      const byCode = this.byCode.get(`${bits}:${event.code}`);
      if (byCode) {
        yield* byCode;
      }
    }
  }

  /** The first shortcut matching the event, if any */
  match(event: KeyboardEventModifiers): S | undefined {
    for (const shortcut of this.matches(event)) {
      return shortcut;
    }
  }
}

/**
 * Compile a table of keyboard shortcuts down to a form that dispatches
 * based on the pressed key and modifiers in O(1), instead of testing each
 * shortcut in sequence.
 */
export function compileKeyboardShortcuts<S extends KeyboardShortcutMatch>(
  shortcuts: Iterable<S>,
): CompiledKeyboardShortcuts<S> {
  const compiled = new CompiledKeyboardShortcuts<S>();
  for (const shortcut of shortcuts) {
    compiled.add(shortcut);
  }
  return compiled;
}

export interface RegisterKeyboardShortcutsOptions {
  /** The {@link KEY_DOWN_COMMAND} priority (default {@link COMMAND_PRIORITY_NORMAL}) */
  priority?: CommandListenerPriority;
}

/**
 * Compile the given shortcuts and register a single
 * {@link KEY_DOWN_COMMAND} listener that dispatches each matched shortcut's
 * command with the KeyboardEvent as its payload (unless its `$disabled`
 * predicate returns true for the current selection). When several
 * shortcuts match the same event they are tried in the given order until
 * one command dispatch is handled.
 *
 * @returns A cleanup function that unregisters the listener.
 */
export function registerKeyboardShortcuts(
  editor: LexicalEditor,
  shortcuts: Iterable<KeyboardShortcut>,
  options: RegisterKeyboardShortcutsOptions = {},
): () => void {
  const compiled = compileKeyboardShortcuts(shortcuts);
  return editor.registerCommand(
    KEY_DOWN_COMMAND,
    event => {
      let selection: undefined | null | BaseSelection;
      for (const shortcut of compiled.matches(event)) {
        if (shortcut.$disabled) {
          if (selection === undefined) {
            selection = $getSelection();
          }
          if (shortcut.$disabled(selection, editor)) {
            continue;
          }
        }
        const $next = () => editor.dispatchCommand(shortcut.command, event);
        if (
          shortcut.$dispatch
            ? shortcut.$dispatch(shortcut.command, event, $next, editor)
            : $next()
        ) {
          return true;
        }
      }
      return false;
    },
    options.priority !== undefined ? options.priority : COMMAND_PRIORITY_NORMAL,
  );
}

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
