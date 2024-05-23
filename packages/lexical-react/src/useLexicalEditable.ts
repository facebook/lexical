/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalSubscription} from './useLexicalSubscription';
import type {LexicalEditor} from 'lexical';

import {useLexicalSubscription} from './useLexicalSubscription';

function subscription(editor: LexicalEditor): LexicalSubscription<boolean> {
  return {
    initialValueFn: () => editor.isEditable(),
    subscribe: (callback) => {
      return editor.registerEditableListener(callback);
    },
  };
}

/**
 * Get the current value for {@link LexicalEditor.isEditable}
 * using {@link useLexicalSubscription}.
 * You should prefer this over manually observing the value with
 * {@link LexicalEditor.registerEditableListener},
 * which is a bit tricky to do correctly, particularly when using
 * React StrictMode (the default for development) or concurrency.
 */
export function useLexicalEditable(): boolean {
  return useLexicalSubscription(subscription);
}

/** @deprecated use the named export {@link useLexicalEditable} */
// eslint-disable-next-line no-restricted-exports
export default useLexicalEditable;
