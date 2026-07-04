/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {MdastConfig} from './MdastExtension';
import type {CompiledMdast} from './types';

/**
 * Compiles the raw contribution arrays held in {@link MdastConfig} into the
 * indexed registry used at runtime. Rules earlier in the arrays win for a
 * given node `type`; since {@link MdastExtension}'s `mergeConfig` prepends the
 * rules contributed by extensions merged later (closer to the editor root),
 * those higher-priority rules take precedence — mirroring the dispatch order
 * of `@lexical/html`'s `DOMImportExtension`.
 */
export function compileMdast(config: MdastConfig): CompiledMdast {
  const importHandlers: CompiledMdast['importHandlers'] = new Map();
  const exportHandlers: CompiledMdast['exportHandlers'] = new Map();

  for (const rule of config.importRules) {
    if (!importHandlers.has(rule.type)) {
      importHandlers.set(rule.type, rule.$import);
    }
  }
  for (const rule of config.exportRules) {
    if (!exportHandlers.has(rule.type)) {
      exportHandlers.set(rule.type, rule.$export);
    }
  }

  return {
    exportHandlers,
    importHandlers,
    inlineShortcutTriggers: new Set(config.inlineShortcutTriggers),
    inlineShortcutTypes: new Set(config.inlineShortcutTypes),
    mdastExtensions: [...config.mdastExtensions],
    micromarkExtensions: [...config.micromarkExtensions],
    toMarkdownExtensions: [...config.toMarkdownExtensions],
  };
}
