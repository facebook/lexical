/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {ContextRecord} from '../types';
import type {DOMImportExtension} from './DOMImportExtension';
import type {ImportContextPairOrUpdater, ImportStateConfig} from './types';

import {getPeerDependencyFromEditor} from '@lexical/extension';
import {$getEditor, type LexicalEditor} from 'lexical';

import {DOMImportContextSymbol, DOMImportExtensionName} from '../constants';
import {
  $withContext,
  createContextState,
  getContextRecord,
  getContextValue,
} from '../ContextRecord';

/**
 * Create an import context state. The phantom symbol prevents accidental
 * use of a render-context state in an import context (and vice versa).
 *
 * Note: to support the value-or-updater pattern, `V` cannot be a function
 * type; wrap it in an array or object if needed.
 *
 * @experimental
 * @__NO_SIDE_EFFECTS__
 */
export function createImportState<V>(
  name: string,
  getDefaultValue: () => V,
  isEqual?: (a: V, b: V) => boolean,
): ImportStateConfig<V> {
  return createContextState(
    DOMImportContextSymbol,
    name,
    getDefaultValue,
    isEqual,
  );
}

/**
 * The kind of operation that produced this import. Lets rules adapt their
 * behavior (e.g. preserve more whitespace on `'paste'`, be lenient on
 * `'deserialize'`, etc.). Defaults to `'unknown'`.
 *
 * @experimental
 */
export type ImportSourceKind =
  | 'paste'
  | 'drop'
  | 'deserialize'
  | 'headless'
  | 'unknown';

/**
 * Built-in import-context state identifying how this import was initiated.
 * Callers of `$generateNodesFromDOM` should set it via the `context` option.
 *
 * @experimental
 */
export const ImportSource: ImportStateConfig<ImportSourceKind> =
  createImportState<ImportSourceKind>('importSource', () => 'unknown');

/**
 * Built-in import-context state holding the bit-packed
 * {@link TextFormatType} formats that should apply to {@link TextNode}s
 * produced during the current subtree. Used by inline-format wrappers
 * (`<b>`, `<i>`, `<u>`, …) to propagate formatting through the context
 * record instead of via the legacy `forChild` chain.
 *
 * @experimental
 */
export const ImportTextFormat: ImportStateConfig<number> = createImportState(
  'textFormat',
  () => 0,
);

function getDefaultImportContext(
  editor: LexicalEditor,
): undefined | ContextRecord<typeof DOMImportContextSymbol> {
  const dep = getPeerDependencyFromEditor<typeof DOMImportExtension>(
    editor,
    DOMImportExtensionName,
  );
  return dep ? dep.output.defaults : undefined;
}

function getImportContext(
  editor: LexicalEditor,
): undefined | ContextRecord<typeof DOMImportContextSymbol> {
  return (
    getContextRecord(DOMImportContextSymbol, editor) ||
    getDefaultImportContext(editor)
  );
}

/**
 * Read an import context value during an import operation.
 * @experimental
 */
export function $getImportContextValue<V>(
  cfg: ImportStateConfig<V>,
  editor: LexicalEditor = $getEditor(),
): V {
  return getContextValue(getImportContext(editor), cfg);
}

/**
 * Run `f` with the given context pairs applied on top of the editor's
 * current import context.
 *
 * @experimental
 */
export const $withImportContext: (
  cfg: readonly ImportContextPairOrUpdater[],
  editor?: LexicalEditor,
) => <T>(f: () => T) => T = $withContext(
  DOMImportContextSymbol,
  getDefaultImportContext,
);
