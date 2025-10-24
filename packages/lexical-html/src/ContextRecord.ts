/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {
  AnyContextConfigPair,
  AnyContextSymbol,
  ContextConfig,
  ContextRecord,
} from './types';

import {
  $getEditor,
  createState,
  type LexicalEditor,
  ValueOrUpdater,
} from 'lexical';

let activeContext: undefined | EditorContext;

type WithContext<Ctx extends AnyContextSymbol> = {
  [K in Ctx]?: undefined | ContextRecord<Ctx>;
};

export type EditorContext = {
  editor: LexicalEditor;
} & WithContext<AnyContextSymbol>;

export function getContextValue<Ctx extends AnyContextSymbol, V>(
  contextRecord: undefined | ContextRecord<Ctx>,
  cfg: ContextConfig<Ctx, V>,
) {
  const {key} = cfg;
  return contextRecord && key in contextRecord
    ? (contextRecord[key] as V)
    : cfg.defaultValue;
}

function getEditorContext(editor: LexicalEditor): undefined | EditorContext {
  return activeContext && activeContext.editor === editor
    ? activeContext
    : undefined;
}

export function getContextRecord<Ctx extends AnyContextSymbol>(
  sym: Ctx,
  editor: LexicalEditor,
): undefined | ContextRecord<Ctx> {
  const editorContext = getEditorContext(editor);
  return editorContext && editorContext[sym];
}

export function contextFromPairs<Ctx extends AnyContextSymbol>(
  pairs: readonly AnyContextConfigPair<Ctx>[],
  parent: undefined | ContextRecord<Ctx>,
): undefined | ContextRecord<Ctx> {
  let rval = parent;
  for (const [k, v] of pairs) {
    const key = k.key;
    if (rval === parent && getContextValue(rval, k) === v) {
      continue;
    }
    const ctx = rval || createChildContext(parent);
    ctx[key] = v;
    rval = ctx;
  }
  return rval;
}

export function createChildContext<Ctx extends AnyContextSymbol>(
  parent: undefined | ContextRecord<Ctx>,
): ContextRecord<Ctx> {
  return Object.create(parent || null);
}

export function setContextValue<Ctx extends AnyContextSymbol, V>(
  contextRecord: ContextRecord<Ctx>,
  cfg: ContextConfig<Ctx, V>,
  valueOrUpdater: ValueOrUpdater<V>,
): V {
  const {key, defaultValue} = cfg;
  const value =
    typeof valueOrUpdater !== 'function'
      ? valueOrUpdater
      : (valueOrUpdater as (prev: V) => V)(
          key in contextRecord ? (contextRecord[key] as V) : defaultValue,
        );
  contextRecord[key] = value;
  return value;
}

export function updateContextFromPairs<Ctx extends AnyContextSymbol>(
  contextRecord: ContextRecord<Ctx>,
  pairs: undefined | readonly AnyContextConfigPair<Ctx>[],
): ContextRecord<Ctx> {
  if (pairs) {
    for (const [cfg, valueOrUpdater] of pairs) {
      setContextValue(contextRecord, cfg, valueOrUpdater);
    }
  }
  return contextRecord;
}

/**
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
 * @__NO_SIDE_EFFECTS__
 */
export function $withContext<Ctx extends AnyContextSymbol>(
  sym: Ctx,
  $defaults: (editor: LexicalEditor) => undefined | ContextRecord<Ctx> = () =>
    undefined,
) {
  return (
    cfg: readonly AnyContextConfigPair<Ctx>[],
    editor = $getEditor(),
  ): (<T>(f: () => T) => T) => {
    return (f) => {
      const prevDOMContext = activeContext;
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
      try {
        activeContext = {...parentEditorContext, editor, [sym]: contextRecord};
        return f();
      } finally {
        activeContext = prevDOMContext;
      }
    };
  };
}

/**
 * @__NO_SIDE_EFFECTS__
 */
export function createContextState<Tag extends symbol, V>(
  tag: Tag,
  name: string,
  getDefaultValue: () => V,
  isEqual?: (a: V, b: V) => boolean,
): ContextConfig<Tag, V> {
  return Object.assign(
    createState(Symbol(name), {isEqual, parse: getDefaultValue}),
    {[tag]: true} as const,
  );
}
