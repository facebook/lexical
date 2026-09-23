/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {MdastConfig} from './MdastExtension';
import type {CompiledMdast, MdastExportRule} from './types';
import type {LexicalEditor} from 'lexical';

import {getStaticNodeConfig, iterStaticNodeConfigChain} from 'lexical';

/**
 * Compiles the raw contribution arrays held in {@link MdastConfig} into the
 * indexed registry used at runtime. Rules earlier in the arrays win for a
 * given node `type`; since {@link MdastExtension}'s `mergeConfig` prepends the
 * rules contributed by extensions merged later (closer to the editor root),
 * those higher-priority rules take precedence — mirroring the dispatch order
 * of `@lexical/html`'s `DOMImportExtension`. Export rules also apply to
 * subclasses, with the nearest ancestor's rule taking precedence.
 */
export function compileMdast(
  editor: LexicalEditor,
  config: MdastConfig,
): CompiledMdast {
  const importHandlers: CompiledMdast['importHandlers'] = new Map();
  const exportHandlers: CompiledMdast['exportHandlers'] = new Map();

  for (const rule of config.importRules) {
    if (!importHandlers.has(rule.type)) {
      importHandlers.set(rule.type, rule.$import);
    }
  }
  const exportRules = new Map<
    MdastExportRule['type'],
    MdastExportRule['$export']
  >();
  for (const rule of config.exportRules) {
    // Class and string rules for the same type share contribution priority.
    // Abstract classes have no type string, so retain the class as the key.
    const type =
      typeof rule.type === 'string'
        ? rule.type
        : (getStaticNodeConfig(rule.type).ownNodeType ?? rule.type);
    if (!exportRules.has(type)) {
      exportRules.set(type, rule.$export);
      if (typeof type === 'string') {
        exportHandlers.set(type, rule.$export);
      }
    }
  }
  for (const [type, {klass}] of editor._nodes) {
    for (const ancestor of iterStaticNodeConfigChain(klass)) {
      const handler = exportRules.get(ancestor.ownNodeType ?? ancestor.klass);
      if (handler) {
        exportHandlers.set(type, handler);
        break;
      }
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
