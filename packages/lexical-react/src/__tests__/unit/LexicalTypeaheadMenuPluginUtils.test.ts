/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND as fromPlugin} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND as fromUtils} from '@lexical/react/LexicalTypeaheadMenuPluginUtils';
import {describe, expect, test} from 'vitest';

import {SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND as fromMenu} from '../../shared/LexicalMenu';

describe('SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND', () => {
  test('is one command, whichever module it is reached through', () => {
    // Commands are matched by object identity, so the command a consumer
    // dispatches has to be the very one the menu registers its handler
    // against — a second `createCommand` with the same name is a different
    // command that no handler will ever see.
    expect(fromPlugin).toBe(fromUtils);
    expect(fromMenu).toBe(fromUtils);
  });
});
