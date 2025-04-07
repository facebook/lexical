/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalCommand} from '../../LexicalEditor';

import {createCommand} from '../../LexicalCommands';

describe('LexicalCommands tests', () => {
  describe('createCommand', () => {
    it('should return a command with numeric type for built-in commands', () => {
      const command = createCommand('SELECTION_CHANGE_COMMAND');
      expect(command).toEqual({type: 1});
    });

    it('should return a command with string type for custom commands', () => {
      const customType = 'CUSTOM_COMMAND';
      const command = createCommand(customType);
      expect(command).toEqual({type: customType});
    });

    it('should return a command with undefined type when no type is provided', () => {
      const command = createCommand();
      expect(command).toEqual({type: undefined});
    });

    it('should handle all built-in commands correctly', () => {
      // Test a few key built-in commands
      const commands = [
        ['SELECTION_CHANGE_COMMAND', 1],
        ['CLICK_COMMAND', 3],
        ['DELETE_CHARACTER_COMMAND', 4],
        ['PASTE_COMMAND', 8],
        ['FORMAT_TEXT_COMMAND', 12],
        ['KEY_ENTER_COMMAND', 22],
        ['KEY_MODIFIER_COMMAND', 45],
      ];

      commands.forEach(([type, expectedId]) => {
        const command = createCommand(type as string);
        expect(command).toEqual({type: expectedId});
      });
    });

    it('should preserve type safety with TypeScript generics', () => {
      const command: LexicalCommand<string> = createCommand('CUSTOM_COMMAND');
      expect(command).toEqual({type: 'CUSTOM_COMMAND'});

      const builtInCommand: LexicalCommand<MouseEvent> =
        createCommand('CLICK_COMMAND');
      expect(builtInCommand).toEqual({type: 3});
    });

    it('should handle case sensitivity correctly', () => {
      const command1 = createCommand('CLICK_COMMAND');
      const command2 = createCommand('click_command');

      // Built-in command should be transformed
      expect(command1).toEqual({type: 3});
      // Non-matching case should be treated as custom command
      expect(command2).toEqual({type: 'click_command'});
    });
  });
});
