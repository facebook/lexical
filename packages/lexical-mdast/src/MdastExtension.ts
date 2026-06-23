/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {MdastTransformer} from './types';

import {effect, namedSignals} from '@lexical/extension';
import {defineExtension, safeCast} from 'lexical';

import {compileTransformers} from './compile';
import {registerMarkdownShortcuts} from './MdastShortcuts';
import {TRANSFORMERS} from './MdastTransformers';

export interface MdastConfig {
  /**
   * The transformer set used to derive the node dependencies that this
   * extension registers. Defaults to {@link TRANSFORMERS}.
   */
  transformers: readonly MdastTransformer[];
}

/**
 * Registers the Lexical nodes required by the default {@link TRANSFORMERS}
 * (headings, quotes, lists, ...) so the editor can import and export Markdown
 * via `$convertFromMarkdownString` / `$convertToMarkdownString`.
 */
export const MdastExtension = /* @__PURE__ */ defineExtension({
  build: (editor, config) => namedSignals(config),
  config: /* @__PURE__ */ safeCast<MdastConfig>({transformers: TRANSFORMERS}),
  name: '@lexical/mdast/Mdast',
  nodes: () => compileTransformers(TRANSFORMERS).dependencies,
});

export interface MdastShortcutsConfig {
  /** Disable the streaming shortcuts without removing the extension. */
  disabled: boolean;
  /** The transformer set driving shortcut recognition. */
  transformers: readonly MdastTransformer[];
}

/**
 * Registers the streaming Markdown shortcuts (see
 * {@link registerMarkdownShortcuts}) and the nodes they depend on.
 */
export const MdastShortcutsExtension = /* @__PURE__ */ defineExtension({
  build: (editor, config) => namedSignals(config),
  config: /* @__PURE__ */ safeCast<MdastShortcutsConfig>({
    disabled: false,
    transformers: TRANSFORMERS,
  }),
  dependencies: [MdastExtension],
  name: '@lexical/mdast/Shortcuts',
  register: (editor, config, state) => {
    const {disabled, transformers} = state.getOutput();
    return effect(() =>
      disabled.value
        ? undefined
        : registerMarkdownShortcuts(editor, transformers.value),
    );
  },
});
