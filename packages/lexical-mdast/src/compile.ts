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

import invariant from '@lexical/internal/invariant';
import {getStaticNodeConfig, iterStaticNodeConfigChain} from 'lexical';

function getExportRuleType(klass: MdastExportRule['type']): string {
  if (typeof klass === 'string') {
    return klass;
  }
  const {ownNodeType, ownNodeConfig, declaresOwnConfig} =
    getStaticNodeConfig(klass);
  // Without an own $config(), a resolved config belongs to an ancestor.
  // A legacy static getType() can declare a distinct type with no config.
  // Checking metadata also works after Lexical synthesizes a getType().
  invariant(
    ownNodeType !== undefined &&
      (declaresOwnConfig || ownNodeConfig === undefined),
    'MdastExtension: export rule node classes must have their own type.',
  );
  return ownNodeType;
}

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
  const exportRules: CompiledMdast['exportHandlers'] = new Map();
  for (const rule of config.exportRules) {
    // Class and string rules for the same type share contribution priority.
    const type = getExportRuleType(rule.type);
    if (!exportRules.has(type)) {
      exportRules.set(type, rule.$export);
      exportHandlers.set(type, rule.$export);
    }
  }
  for (const [type, {klass}] of editor._nodes) {
    for (const {ownNodeType} of iterStaticNodeConfigChain(klass)) {
      const handler =
        ownNodeType === undefined ? undefined : exportRules.get(ownNodeType);
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
