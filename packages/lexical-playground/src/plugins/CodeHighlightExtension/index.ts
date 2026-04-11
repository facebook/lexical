/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {registerCodeHighlighting as registerCodeHighlightingPrism} from '@lexical/code-prism';
import {registerCodeHighlighting as registerCodeHighlightingShiki} from '@lexical/code-shiki';
import {effect, namedSignals} from '@lexical/extension';
import {defineExtension, safeCast} from 'lexical';

export type CodeHighlightMode = 'off' | 'prism' | 'shiki';

export interface CodeHighlightConfig {
  mode: CodeHighlightMode;
}

export const CodeHighlightExtension = defineExtension({
  build: (editor, config) => namedSignals(config),
  config: safeCast<CodeHighlightConfig>({mode: 'off'}),
  name: '@lexical/playground/CodeHighlight',
  register: (editor, config, state) =>
    effect(() => {
      const mode = state.getOutput().mode.value;
      if (mode === 'prism') {
        return registerCodeHighlightingPrism(editor);
      }
      if (mode === 'shiki') {
        return registerCodeHighlightingShiki(editor);
      }
      return undefined;
    }),
});
