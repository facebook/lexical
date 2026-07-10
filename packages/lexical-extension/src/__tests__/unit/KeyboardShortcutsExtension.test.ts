/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  compileKeyboardShortcuts,
  formatKeyboardShortcut,
  getExtensionDependencyFromEditor,
  type KeyboardShortcut,
  KeyboardShortcutsExtension,
  registerKeyboardShortcuts,
} from '@lexical/extension';
import {
  COMMAND_PRIORITY_EDITOR,
  configExtension,
  createCommand,
  defineExtension,
  isExactShortcutMatch,
  KEY_DOWN_COMMAND,
  type KeyboardEventModifierMask,
  type KeyboardEventModifiers,
  type LexicalCommand,
} from 'lexical';
import {describe, expect, test, vi} from 'vitest';

function makeEvent(
  key: string,
  code: string,
  bits: number,
): KeyboardEventModifiers {
  return {
    altKey: Boolean(bits & 1),
    code,
    ctrlKey: Boolean(bits & 2),
    key,
    metaKey: Boolean(bits & 4),
    shiftKey: Boolean(bits & 8),
  };
}

function keyboardEvent(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent('keydown', {cancelable: true, ...init});
}

describe('compileKeyboardShortcuts', () => {
  // Every (key, code) pair crossed with all 16 modifier states, covering
  // exact key matches, case-insensitivity, and the event.code fallback for
  // non-Latin layouts (Cyrillic letter, Arabic-Indic digit)
  const EVENT_KEYS: [string, string][] = [
    ['b', 'KeyB'],
    ['B', 'KeyB'],
    ['б', 'KeyB'],
    ['1', 'Digit1'],
    ['!', 'Digit1'],
    ['١', 'Digit1'],
    ['Enter', 'Enter'],
    [',', 'Comma'],
    ['[', 'BracketLeft'],
    ['z', 'KeyZ'],
  ];
  const SHORTCUTS: [string, KeyboardEventModifierMask][] = [
    ['b', {ctrlKey: true}],
    ['B', {metaKey: true}],
    ['1', {altKey: true, ctrlKey: true}],
    ['Enter', {shiftKey: 'any'}],
    [',', {ctrlKey: true}],
    ['[', {}],
    ['z', {ctrlKey: true, shiftKey: 'any'}],
  ];

  test('matches exactly the events that isExactShortcutMatch matches', () => {
    for (const [key, modifiers] of SHORTCUTS) {
      const compiled = compileKeyboardShortcuts([{key, modifiers}]);
      for (const [eventKey, eventCode] of EVENT_KEYS) {
        for (let bits = 0; bits < 16; bits++) {
          const event = makeEvent(eventKey, eventCode, bits);
          expect(
            compiled.match(event) !== undefined,
            `key=${key} modifiers=${JSON.stringify(
              modifiers,
            )} event=${JSON.stringify(event)}`,
          ).toBe(isExactShortcutMatch(event, key, modifiers));
        }
      }
    }
  });

  test('matches returns all matching shortcuts in insertion order', () => {
    const first = {key: 'k', modifiers: {ctrlKey: true}, name: 'first'};
    const second = {
      key: 'K',
      modifiers: {ctrlKey: true, shiftKey: 'any'},
      name: 'second',
    } as const;
    const other = {key: 'j', modifiers: {ctrlKey: true}, name: 'other'};
    const compiled = compileKeyboardShortcuts([first, second, other]);
    expect(compiled.matches(makeEvent('k', 'KeyK', 2))).toEqual([
      first,
      second,
    ]);
    expect(compiled.matches(makeEvent('K', 'KeyK', 2 | 8))).toEqual([second]);
    expect(compiled.matches(makeEvent('k', 'KeyK', 0))).toEqual([]);
  });
});

describe('formatKeyboardShortcut', () => {
  test('formats platform conventions', () => {
    const shortcut = {key: 'k', modifiers: {metaKey: true, shiftKey: true}};
    expect(formatKeyboardShortcut(shortcut, {isApple: true})).toBe('⌘+Shift+K');
    expect(formatKeyboardShortcut(shortcut, {isApple: false})).toBe(
      'Meta+Shift+K',
    );
    expect(
      formatKeyboardShortcut(
        {key: 'q', modifiers: {ctrlKey: true, shiftKey: true}},
        {isApple: true},
      ),
    ).toBe('⌃+Shift+Q');
    expect(
      formatKeyboardShortcut(
        {key: '0', modifiers: {altKey: true, ctrlKey: true}},
        {isApple: false},
      ),
    ).toBe('Ctrl+Alt+0');
    expect(formatKeyboardShortcut({key: ' '}, {isApple: false})).toBe('Space');
    expect(
      formatKeyboardShortcut(
        {key: 'ArrowLeft', modifiers: {shiftKey: 'any'}},
        {isApple: false},
      ),
    ).toBe('ArrowLeft');
  });
});

/**
 * Build an editor with the given shortcuts registered plus a recording
 * listener for each distinct command (returning `handled` for it).
 */
function buildTestEditor(
  shortcuts: KeyboardShortcut[],
  listeners: [
    LexicalCommand<KeyboardEvent>,
    (event: KeyboardEvent) => boolean,
  ][],
) {
  return buildEditorFromExtensions(
    defineExtension({
      name: 'keyboard-shortcuts-test',
      register: editor => {
        const cleanups = listeners.map(([command, listener]) =>
          editor.registerCommand(command, listener, COMMAND_PRIORITY_EDITOR),
        );
        cleanups.push(registerKeyboardShortcuts(editor, shortcuts));
        return () => cleanups.forEach(cleanup => cleanup());
      },
    }),
  );
}

describe('registerKeyboardShortcuts', () => {
  test('dispatches the matched shortcut command with the event as payload', () => {
    const BOLD_COMMAND = createCommand<KeyboardEvent>('test/BOLD');
    const ITALIC_COMMAND = createCommand<KeyboardEvent>('test/ITALIC');
    const bold = vi.fn().mockReturnValue(true);
    const italic = vi.fn().mockReturnValue(true);
    const editor = buildTestEditor(
      [
        {command: BOLD_COMMAND, key: 'b', modifiers: {ctrlKey: true}},
        {command: ITALIC_COMMAND, key: 'i', modifiers: {ctrlKey: true}},
      ],
      [
        [BOLD_COMMAND, bold],
        [ITALIC_COMMAND, italic],
      ],
    );
    const event = keyboardEvent({ctrlKey: true, key: 'b'});
    expect(editor.dispatchCommand(KEY_DOWN_COMMAND, event)).toBe(true);
    expect(bold).toHaveBeenCalledTimes(1);
    expect(bold.mock.calls[0][0]).toBe(event);
    expect(italic).not.toHaveBeenCalled();
    // No modifier match -> no dispatch (the event may still be handled by
    // the core $handleKeyDown listener at COMMAND_PRIORITY_EDITOR)
    editor.dispatchCommand(KEY_DOWN_COMMAND, keyboardEvent({key: 'b'}));
    expect(bold).toHaveBeenCalledTimes(1);
    editor.dispose();
  });

  test('falls through to the next matching shortcut when a dispatch is unhandled', () => {
    const SKIPPED_COMMAND = createCommand<KeyboardEvent>('test/SKIPPED');
    const HANDLED_COMMAND = createCommand<KeyboardEvent>('test/HANDLED');
    const skipped = vi.fn().mockReturnValue(false);
    const handled = vi.fn().mockReturnValue(true);
    const editor = buildTestEditor(
      [
        {command: SKIPPED_COMMAND, key: 'k', modifiers: {ctrlKey: true}},
        {command: HANDLED_COMMAND, key: 'k', modifiers: {ctrlKey: true}},
      ],
      [
        [SKIPPED_COMMAND, skipped],
        [HANDLED_COMMAND, handled],
      ],
    );
    const event = keyboardEvent({ctrlKey: true, key: 'k'});
    expect(editor.dispatchCommand(KEY_DOWN_COMMAND, event)).toBe(true);
    expect(skipped).toHaveBeenCalledTimes(1);
    expect(handled).toHaveBeenCalledTimes(1);
    editor.dispose();
  });

  test('skips shortcuts whose $disabled predicate returns true', () => {
    const DISABLED_COMMAND = createCommand<KeyboardEvent>('test/DISABLED');
    const ENABLED_COMMAND = createCommand<KeyboardEvent>('test/ENABLED');
    const disabled = vi.fn().mockReturnValue(true);
    const enabled = vi.fn().mockReturnValue(true);
    const $disabled = vi.fn().mockReturnValue(true);
    const editor = buildTestEditor(
      [
        {
          $disabled,
          command: DISABLED_COMMAND,
          key: 'k',
          modifiers: {ctrlKey: true},
        },
        {command: ENABLED_COMMAND, key: 'k', modifiers: {ctrlKey: true}},
      ],
      [
        [DISABLED_COMMAND, disabled],
        [ENABLED_COMMAND, enabled],
      ],
    );
    const event = keyboardEvent({ctrlKey: true, key: 'k'});
    expect(editor.dispatchCommand(KEY_DOWN_COMMAND, event)).toBe(true);
    expect($disabled).toHaveBeenCalledTimes(1);
    expect(disabled).not.toHaveBeenCalled();
    expect(enabled).toHaveBeenCalledTimes(1);
    editor.dispose();
  });

  test('$dispatch middleware wraps the command dispatch', () => {
    const WRAPPED_COMMAND = createCommand<KeyboardEvent>('test/WRAPPED');
    const listener = vi.fn().mockReturnValue(true);
    const order: string[] = [];
    const editor = buildTestEditor(
      [
        {
          $dispatch: (command, event, $next, editor2) => {
            expect(command).toBe(WRAPPED_COMMAND);
            expect(editor2).toBe(editor);
            order.push('before');
            const handled = $next();
            order.push('after');
            return handled;
          },
          command: WRAPPED_COMMAND,
          key: 'k',
          modifiers: {ctrlKey: true},
        },
      ],
      [
        [
          WRAPPED_COMMAND,
          event => {
            order.push('listener');
            return listener(event);
          },
        ],
      ],
    );
    const event = keyboardEvent({ctrlKey: true, key: 'k'});
    expect(editor.dispatchCommand(KEY_DOWN_COMMAND, event)).toBe(true);
    expect(order).toEqual(['before', 'listener', 'after']);
    editor.dispose();
  });
});

describe('KeyboardShortcutsExtension', () => {
  const shortcutWith = (
    command: LexicalCommand<KeyboardEvent>,
    key: string,
    modifiers: KeyboardEventModifierMask,
  ): KeyboardShortcut => ({command, key, modifiers});

  function buildExtensionEditor(
    shortcuts: Record<string, KeyboardShortcut | null>,
    listeners: [
      LexicalCommand<KeyboardEvent>,
      (event: KeyboardEvent) => boolean,
    ][],
    overlay?: Record<string, KeyboardShortcut | null>,
  ) {
    return buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          configExtension(KeyboardShortcutsExtension, {shortcuts}),
          ...(overlay
            ? [
                configExtension(KeyboardShortcutsExtension, {
                  shortcuts: overlay,
                }),
              ]
            : []),
        ],
        name: 'extension-test',
        register: editor => {
          const cleanups = listeners.map(([command, listener]) =>
            editor.registerCommand(command, listener, COMMAND_PRIORITY_EDITOR),
          );
          return () => cleanups.forEach(cleanup => cleanup());
        },
      }),
    );
  }

  test('dispatches configured shortcuts', () => {
    const BOLD_COMMAND = createCommand<KeyboardEvent>('ext/BOLD');
    const bold = vi.fn().mockReturnValue(true);
    const editor = buildExtensionEditor(
      {bold: shortcutWith(BOLD_COMMAND, 'b', {ctrlKey: true})},
      [[BOLD_COMMAND, bold]],
    );
    editor.dispatchCommand(
      KEY_DOWN_COMMAND,
      keyboardEvent({ctrlKey: true, key: 'b'}),
    );
    expect(bold).toHaveBeenCalledTimes(1);
    editor.dispose();
  });

  test('overlays merge by name: add, remap, and disable', () => {
    const BOLD_COMMAND = createCommand<KeyboardEvent>('overlay/BOLD');
    const ITALIC_COMMAND = createCommand<KeyboardEvent>('overlay/ITALIC');
    const CUSTOM_COMMAND = createCommand<KeyboardEvent>('overlay/CUSTOM');
    const bold = vi.fn().mockReturnValue(true);
    const italic = vi.fn().mockReturnValue(true);
    const custom = vi.fn().mockReturnValue(true);
    const editor = buildExtensionEditor(
      {
        bold: shortcutWith(BOLD_COMMAND, 'b', {ctrlKey: true}),
        italic: shortcutWith(ITALIC_COMMAND, 'i', {ctrlKey: true}),
      },
      [
        [BOLD_COMMAND, bold],
        [ITALIC_COMMAND, italic],
        [CUSTOM_COMMAND, custom],
      ],
      {
        // remap bold to a different key
        bold: shortcutWith(BOLD_COMMAND, 'b', {ctrlKey: true, shiftKey: true}),
        // add a new shortcut
        custom: shortcutWith(CUSTOM_COMMAND, 'm', {altKey: true}),
        // disable italic
        italic: null,
      },
    );
    editor.dispatchCommand(
      KEY_DOWN_COMMAND,
      keyboardEvent({ctrlKey: true, key: 'b'}),
    );
    expect(bold).not.toHaveBeenCalled();
    editor.dispatchCommand(
      KEY_DOWN_COMMAND,
      keyboardEvent({ctrlKey: true, key: 'b', shiftKey: true}),
    );
    expect(bold).toHaveBeenCalledTimes(1);
    editor.dispatchCommand(
      KEY_DOWN_COMMAND,
      keyboardEvent({ctrlKey: true, key: 'i'}),
    );
    expect(italic).not.toHaveBeenCalled();
    editor.dispatchCommand(
      KEY_DOWN_COMMAND,
      keyboardEvent({altKey: true, key: 'm'}),
    );
    expect(custom).toHaveBeenCalledTimes(1);
    editor.dispose();
  });

  test('shortcuts can be remapped and disabled at runtime through the output signals', () => {
    const BOLD_COMMAND = createCommand<KeyboardEvent>('runtime/BOLD');
    const bold = vi.fn().mockReturnValue(true);
    const editor = buildExtensionEditor(
      {bold: shortcutWith(BOLD_COMMAND, 'b', {ctrlKey: true})},
      [[BOLD_COMMAND, bold]],
    );
    const {output} = getExtensionDependencyFromEditor(
      editor,
      KeyboardShortcutsExtension,
    );
    output.shortcuts.value = {
      ...output.shortcuts.value,
      bold: shortcutWith(BOLD_COMMAND, 'b', {metaKey: true}),
    };
    editor.dispatchCommand(
      KEY_DOWN_COMMAND,
      keyboardEvent({ctrlKey: true, key: 'b'}),
    );
    expect(bold).not.toHaveBeenCalled();
    editor.dispatchCommand(
      KEY_DOWN_COMMAND,
      keyboardEvent({key: 'b', metaKey: true}),
    );
    expect(bold).toHaveBeenCalledTimes(1);

    output.disabled.value = true;
    editor.dispatchCommand(
      KEY_DOWN_COMMAND,
      keyboardEvent({key: 'b', metaKey: true}),
    );
    expect(bold).toHaveBeenCalledTimes(1);
    editor.dispose();
  });
});
