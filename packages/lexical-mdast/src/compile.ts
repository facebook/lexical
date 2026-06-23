/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  CompiledMdastTransformers,
  Klass,
  LexicalNode,
  MdastTransformer,
} from './types';

/**
 * Flattens a list of {@link MdastTransformer}s into the extension arrays and
 * indexed handler maps used by the importer, exporter, and shortcut engine.
 *
 * Later transformers win for a given mdast/Lexical node type, which lets a
 * caller override a default handler by appending their own transformer.
 */
export function compileTransformers(
  transformers: readonly MdastTransformer[],
): CompiledMdastTransformers {
  const importHandlers: CompiledMdastTransformers['importHandlers'] = new Map();
  const exportHandlers: CompiledMdastTransformers['exportHandlers'] = new Map();
  const micromarkExtensions: CompiledMdastTransformers['micromarkExtensions'] =
    [];
  const mdastExtensions: CompiledMdastTransformers['mdastExtensions'] = [];
  const toMarkdownExtensions: CompiledMdastTransformers['toMarkdownExtensions'] =
    [];
  const dependencySet = new Set<Klass<LexicalNode>>();

  for (const transformer of transformers) {
    if (transformer.micromarkExtensions) {
      micromarkExtensions.push(...transformer.micromarkExtensions);
    }
    if (transformer.mdastExtensions) {
      mdastExtensions.push(...transformer.mdastExtensions);
    }
    if (transformer.toMarkdownExtensions) {
      toMarkdownExtensions.push(...transformer.toMarkdownExtensions);
    }
    if (transformer.dependencies) {
      for (const dependency of transformer.dependencies) {
        dependencySet.add(dependency);
      }
    }
    if (transformer.importHandlers) {
      for (const type of Object.keys(transformer.importHandlers)) {
        importHandlers.set(type, transformer.importHandlers[type]);
      }
    }
    if (transformer.exportHandlers) {
      for (const type of Object.keys(transformer.exportHandlers)) {
        exportHandlers.set(type, transformer.exportHandlers[type]);
      }
    }
  }

  return {
    dependencies: [...dependencySet],
    exportHandlers,
    importHandlers,
    mdastExtensions,
    micromarkExtensions,
    toMarkdownExtensions,
  };
}
