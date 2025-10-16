/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  getExtensionDependencyFromEditor,
  LexicalBuilder,
} from '@lexical/extension';
import {$getEditor, LexicalEditor} from 'lexical';

import {DOMRenderContextSymbol, DOMRenderExtensionName} from './constants';
import {
  $withContext,
  createContextState,
  getContextValue,
  getEditorContext,
} from './ContextRecord';
import {DOMRenderExtension} from './DOMRenderExtension';
import {AnyContextConfigPair, ContextRecord, RenderStateConfig} from './types';

/**
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
 * true if the export was initiated from the root of the document
 */
export const RenderContextRoot = createRenderState('root', Boolean);

/**
 * true if this is an export operation ($generateHtmlFromNodes)
 */
export const RenderContextExport = createRenderState('isExport', Boolean);

function getDefaultRenderContext(
  editor: LexicalEditor,
): undefined | ContextRecord<typeof DOMRenderContextSymbol> {
  const builder = LexicalBuilder.maybeFromEditor(editor);
  return builder && builder.hasExtensionByName(DOMRenderExtensionName)
    ? getExtensionDependencyFromEditor(editor, DOMRenderExtension).output
        .defaults
    : undefined;
}

function getRenderContext(
  editor: LexicalEditor,
): undefined | ContextRecord<typeof DOMRenderContextSymbol> {
  const editorContext = getEditorContext(editor);
  return (
    (editorContext && editorContext[DOMRenderContextSymbol]) ||
    getDefaultRenderContext(editor)
  );
}

export function $getRenderContextValue<V>(
  cfg: RenderStateConfig<V>,
  editor: LexicalEditor = $getEditor(),
): V {
  return getContextValue(getRenderContext(editor), cfg);
}

export const $withRenderContext: (
  cfg: readonly AnyContextConfigPair<typeof DOMRenderContextSymbol>[],
  editor?: LexicalEditor,
) => <T>(f: () => T) => T = $withContext(
  DOMRenderContextSymbol,
  getDefaultRenderContext,
);
