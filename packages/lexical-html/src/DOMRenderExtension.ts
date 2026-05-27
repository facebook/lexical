/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {DOMRenderConfig, DOMRenderExtensionOutput} from './types';
import type {InitialEditorConfig} from 'lexical';

import {defineExtension, RootNode, shallowMergeConfig} from 'lexical';

import {compileDOMRenderConfigOverrides} from './compileDOMRenderConfigOverrides';
import {DOMRenderExtensionName} from './constants';
import {
  createEditorContextRecord,
  DOMRenderRuntimeImpl,
  filterEditorInstalled,
} from './DOMRenderRuntime';

/** @internal The result returned from {@link DOMRenderExtension}'s `init`. */
interface DOMRenderInitResult {
  /** `{...editorConfig}` captured before `dom` is overwritten with the compiled config. */
  recompileConfig: InitialEditorConfig;
}

/**
 * @experimental
 *
 * An extension that allows overriding the render and export behavior for an
 * editor. This is highly experimental and subject to change from one version
 * to the next.
 **/
export const DOMRenderExtension = defineExtension<
  DOMRenderConfig,
  typeof DOMRenderExtensionName,
  DOMRenderExtensionOutput,
  DOMRenderInitResult
>({
  build(editor, config, state) {
    const {recompileConfig} = state.getInitResult();
    const editorContext = createEditorContextRecord(config.contextDefaults);
    const runtime = new DOMRenderRuntimeImpl(
      editor,
      recompileConfig,
      config.overrides,
      editorContext,
    );
    return {defaults: editorContext, runtime};
  },
  config: {
    contextDefaults: [],
    overrides: [],
  },
  html: {
    // Define a RootNode export for $generateDOMFromRoot
    export: new Map([
      [
        RootNode,
        () => {
          const element = document.createElement('div');
          element.role = 'textbox';
          return {element};
        },
      ],
    ]),
  },
  init(editorConfig, config) {
    // Capture the clean base config (with the user's `dom`, before we overwrite
    // it) so the runtime can recompile from scratch when overrides toggle.
    const recompileConfig: InitialEditorConfig = {...editorConfig};
    const editorContext = createEditorContextRecord(config.contextDefaults);
    const installed = filterEditorInstalled(config.overrides, editorContext);
    editorConfig.dom = compileDOMRenderConfigOverrides(editorConfig, {
      overrides: installed,
    });
    return {recompileConfig};
  },
  mergeConfig(config, partial) {
    const merged = shallowMergeConfig(config, partial);
    for (const k of ['overrides', 'contextDefaults'] as const) {
      if (partial[k]) {
        (merged[k] as unknown[]) = [...config[k], ...partial[k]];
      }
    }
    return merged;
  },
  name: DOMRenderExtensionName,
});
