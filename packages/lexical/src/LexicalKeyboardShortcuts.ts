/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {CommandListenerPriority, LexicalEditor} from './LexicalEditor';
import type {
  KeyboardEventModifierMask,
  KeyboardEventModifiers,
} from './LexicalUtils';

import {KEY_DOWN_COMMAND} from './LexicalCommands';
import {COMMAND_PRIORITY_NORMAL} from './LexicalEditor';

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
 * The handler for a matched {@link KeyboardShortcut}. Returning true marks
 * the event as handled: no later shortcuts or lower-priority
 * {@link KEY_DOWN_COMMAND} listeners will run, and `event.preventDefault()`
 * is called unless the shortcut sets `preventDefault: false`. Returning
 * false falls through to the next matching shortcut (if any).
 */
export type KeyboardShortcutHandler = (
  event: KeyboardEvent,
  editor: LexicalEditor,
) => boolean;

/**
 * A keyboard shortcut: the key and modifiers to match plus the handler to
 * run when it matches.
 */
export interface KeyboardShortcut extends KeyboardShortcutMatch {
  handler: KeyboardShortcutHandler;
  /**
   * Call `event.preventDefault()` when the handler returns true
   * (default true)
   */
  preventDefault?: boolean;
}

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
 * {@link KEY_DOWN_COMMAND} listener that dispatches to them by the pressed
 * key and modifiers. When several shortcuts match the same event they are
 * tried in the given order until one handler returns true.
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
      for (const shortcut of compiled.matches(event)) {
        if (shortcut.handler(event, editor)) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          return true;
        }
      }
      return false;
    },
    options.priority !== undefined ? options.priority : COMMAND_PRIORITY_NORMAL,
  );
}
