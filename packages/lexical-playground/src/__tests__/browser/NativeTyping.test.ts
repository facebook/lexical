/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {PlainTextExtension} from '@lexical/plain-text';
import {expect, test} from 'vitest';

import {setupEditor, typeText} from './utils';

test('pending native input stays with the editor that requested it', async () => {
  const first = setupEditor([PlainTextExtension]);
  const typing = typeText('A🙂B');
  const second = setupEditor([PlainTextExtension]);

  await typing;

  expect(first.root.textContent).toBe('A🙂B');
  expect(second.root.textContent).toBe('');
});
