/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {getPeerDependencyFromEditor} from '@lexical/extension';
import {$getEditor, LexicalEditor} from 'lexical';

import {DOMRenderContextSymbol, DOMRenderExtensionName} from './constants';
import {
  $withContext,
  createContextState,
  getContextRecord,
  getContextValue,
} from './ContextRecord';
import {DOMRenderExtension} from './DOMRenderExtension';
import {
  AnyRenderStateConfigPairOrUpdater,
  ContextRecord,
  RenderStateConfig,
} from './types';

/**
 * Create a context state to be used during render.
 *
 * Note that to support the ValueOrUpdater pattern you can not use a
 * function for V (but you may wrap it in an array or object).
 *
 * @experimental
 * @__NO_SIDE_EFFECTS__
 */
export function createRenderState<V>(
  name: string,
  getDefaultValue: () => V,
  isEqual?: (a: V, b: V) => boolean,
): RenderStateConfig<V> {
  return createContextState(
    DOMRenderContextSymbol,
    name,
    getDefaultValue,
    isEqual,
  );
}

/**
 * Render context state that is true if the export was initiated from the root of the document.
 * @experimental
 */
export const RenderContextRoot = createRenderState('root', Boolean);

/**
 * Render context state that is true if this is an export operation ($generateHtmlFromNodes).
 * @experimental
 */
export const RenderContextExport = createRenderState('isExport', Boolean);

function getDefaultRenderContext(
  editor: LexicalEditor,
): undefined | ContextRecord<typeof DOMRenderContextSymbol> {
  const dep = getPeerDependencyFromEditor<typeof DOMRenderExtension>(
    editor,
    DOMRenderExtensionName,
  );
  return dep ? dep.output.defaults : undefined;
}

function getRenderContext(
  editor: LexicalEditor,
): undefined | ContextRecord<typeof DOMRenderContextSymbol> {
  return (
    getContextRecord(DOMRenderContextSymbol, editor) ||
    getDefaultRenderContext(editor)
  );
}

/**
 * Get a render context value during a DOM render or export operation.
 * @experimental
 */
export function $getRenderContextValue<V>(
  cfg: RenderStateConfig<V>,
  editor: LexicalEditor = $getEditor(),
): V {
  return getContextValue(getRenderContext(editor), cfg);
}

/**
 * Execute a callback within a render context with the given config pairs.
 * @experimental
 */
export const $withRenderContext: (
  cfg: readonly AnyRenderStateConfigPairOrUpdater[],
  editor?: LexicalEditor,
) => <T>(f: () => T) => T = $withContext(
  DOMRenderContextSymbol,
  getDefaultRenderContext,
);
