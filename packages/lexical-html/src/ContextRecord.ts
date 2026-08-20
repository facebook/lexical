/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {AnyContextSymbol} from './types';

import {
  $getEditor,
  type AnyContextConfigPairOrUpdater,
  contextFromPairs,
  type ContextRecord,
  type LexicalEditor,
} from 'lexical';

// The record layer itself is editor-independent and lives in core, where the
// JSON serialization context is built on it too. Only the editor-scoped layer
// below — which resolves a record for the *current* editor — is specific to
// the DOM export and import pipelines.
export {
  contextFromPairs,
  contextUpdater,
  contextValue,
  createContextState,
  getContextValue,
  getOwnContextValue,
  popOwnContextValue,
} from 'lexical';

let activeContext: undefined | EditorContext;

type WithContext<Ctx extends AnyContextSymbol> = {
  [K in Ctx]?: undefined | ContextRecord<Ctx>;
};

/**
 * @experimental
 *
 * The LexicalEditor with context
 */
export type EditorContext = {
  editor: LexicalEditor;
} & WithContext<AnyContextSymbol>;

function getEditorContext(editor: LexicalEditor): undefined | EditorContext {
  return activeContext && activeContext.editor === editor
    ? activeContext
    : undefined;
}

/**
 * @experimental
 *
 * @param sym The symbol for this ContextRecord (e.g. DOMRenderContextSymbol)
 * @param editor The editor
 * @returns The current context or undefined
 */
export function getContextRecord<Ctx extends AnyContextSymbol>(
  sym: Ctx,
  editor: LexicalEditor,
): undefined | ContextRecord<Ctx> {
  const editorContext = getEditorContext(editor);
  return editorContext && editorContext[sym];
}

/**
 * @internal
 * @experimental
 * @__NO_SIDE_EFFECTS__
 */
export function $withFullContext<Ctx extends AnyContextSymbol, T>(
  sym: Ctx,
  contextRecord: ContextRecord<Ctx>,
  f: () => T,
  editor: LexicalEditor = $getEditor(),
): T {
  const prevDOMContext = activeContext;
  const parentEditorContext = getEditorContext(editor);
  try {
    activeContext = {...parentEditorContext, editor, [sym]: contextRecord};
    return f();
  } finally {
    activeContext = prevDOMContext;
  }
}

/**
 * @internal
 * @experimental
 * @__NO_SIDE_EFFECTS__
 */
export function $withContext<Ctx extends AnyContextSymbol>(
  sym: Ctx,
  $defaults: (editor: LexicalEditor) => undefined | ContextRecord<Ctx> = () =>
    undefined,
) {
  return (
    cfg: readonly AnyContextConfigPairOrUpdater<Ctx>[],
    editor = $getEditor(),
  ): (<T>(f: () => T) => T) => {
    return f => {
      const parentEditorContext = getEditorContext(editor);
      const parentContextRecord =
        parentEditorContext && parentEditorContext[sym];
      const contextRecord = contextFromPairs(
        cfg,
        parentContextRecord || $defaults(editor),
      );
      if (!contextRecord || contextRecord === parentContextRecord) {
        return f();
      }
      return $withFullContext(sym, contextRecord, f, editor);
    };
  };
}
