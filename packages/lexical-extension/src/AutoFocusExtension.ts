/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {defineExtension, provideOutput, safeCast} from 'lexical';

import {disabledToggle, type DisabledToggleOutput} from './disabledToggle';

export interface AutoFocusConfig {
  /**
   * Where to move the selection when the editor is focused and there is no
   * existing selection. Can be "rootStart" or "rootEnd" (the default).
   */
  defaultSelection?: 'rootStart' | 'rootEnd';
  /**
   * The initial state of disabled
   */
  disabled?: boolean;
}

/**
 * An Extension to focus the LexicalEditor when the root element is set
 * (typically only when the editor is first created).
 */
export const AutoFocusExtension = defineExtension({
  config: safeCast<AutoFocusConfig>({}),
  name: '@lexical/extension/AutoFocus',
  register(editor, config) {
    const {defaultSelection} = config;
    return provideOutput<DisabledToggleOutput>(
      ...disabledToggle({
        disabled: config.disabled,
        register: () =>
          editor.registerRootListener((rootElement) => {
            editor.focus(
              () => {
                // If we try and move selection to the same point with setBaseAndExtent, it won't
                // trigger a re-focus on the element. So in the case this occurs, we'll need to correct it.
                // Normally this is fine, Selection API !== Focus API, but fore the intents of the naming
                // of this plugin, which should preserve focus too.
                const activeElement = document.activeElement;
                if (
                  rootElement !== null &&
                  (activeElement === null ||
                    !rootElement.contains(activeElement))
                ) {
                  // Note: preventScroll won't work in Webkit.
                  rootElement.focus({preventScroll: true});
                }
              },
              {defaultSelection},
            );
          }),
      }),
    );
  },
});
