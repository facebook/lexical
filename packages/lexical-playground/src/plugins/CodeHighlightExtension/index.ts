/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {CodeIndentExtension} from '@lexical/code-core';
import {CodePrismExtension} from '@lexical/code-prism';
import {CodeShikiExtension} from '@lexical/code-shiki';
import {
  effect,
  getExtensionDependencyFromEditor,
  namedSignals,
} from '@lexical/extension';
import {configExtension, defineExtension, safeCast} from 'lexical';

export type CodeHighlightMode = 'off' | 'prism' | 'shiki';

export interface CodeHighlightConfig {
  mode: CodeHighlightMode;
}

/**
 * Playground aggregator that switches between {@link CodePrismExtension}
 * and {@link CodeShikiExtension} based on a `mode` signal. Both sub-
 * extensions start in `disabled: true` state and this extension flips
 * their `disabled` signals to route highlighting to the selected engine.
 */
export const CodeHighlightExtension = defineExtension({
  build: (editor, config) => namedSignals(config),
  config: safeCast<CodeHighlightConfig>({mode: 'off'}),
  dependencies: [
    configExtension(CodePrismExtension, {disabled: true}),
    configExtension(CodeShikiExtension, {
      disabled: true,
      // `{light, dark}` registry entry => vars-only output (no inline
      // color); `PlaygroundEditorTheme.css` reads `--shiki-light(-bg)`
      // / `--shiki-dark(-bg)` to apply the active scheme.
      themes: {default: {dark: 'one-dark-pro', light: 'one-light'}},
    }),
    configExtension(CodeIndentExtension, {tabSize: 2}),
  ],
  name: '@lexical/playground/CodeHighlight',
  register: (editor, config, state) => {
    const prismOutput = getExtensionDependencyFromEditor(
      editor,
      CodePrismExtension,
    ).output;
    const shikiOutput = getExtensionDependencyFromEditor(
      editor,
      CodeShikiExtension,
    ).output;
    return effect(() => {
      const mode = state.getOutput().mode.value;
      prismOutput.disabled.value = mode !== 'prism';
      shikiOutput.disabled.value = mode !== 'shiki';
    });
  },
});
