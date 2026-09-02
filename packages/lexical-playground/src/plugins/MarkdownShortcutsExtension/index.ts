/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {effect, namedSignals} from '@lexical/extension';
import {registerMarkdownShortcuts} from '@lexical/markdown';
import {defineExtension, safeCast} from 'lexical';

import {playgroundTransformers} from '../MarkdownTransformers';

export interface PlaygroundMarkdownShortcutsConfig {
  /**
   * When `true` the `>` shortcut builds shadow root QuoteNodes, which hold
   * block-level children, so a heading shortcut typed inside a quote nests
   * the heading instead of being declined. Driven by the
   * "Shadow root quotes in Markdown" setting.
   */
  shadowRootQuotes: boolean;
}

// This is not a published extension because markdown transformers
// should get a refactor to require less manual configuration
export const PlaygroundMarkdownShortcutsExtension = defineExtension({
  build: (editor, config) => namedSignals(config),
  config: safeCast<PlaygroundMarkdownShortcutsConfig>({
    shadowRootQuotes: false,
  }),
  name: '@lexical/playground/MarkdownShortcuts',
  register: (editor, _config, state) => {
    const {shadowRootQuotes} = state.getOutput();
    return effect(() =>
      registerMarkdownShortcuts(
        editor,
        playgroundTransformers(shadowRootQuotes.value),
      ),
    );
  },
});
