/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {DOMRenderConfig, DOMRenderExtensionOutput} from './types';

import {defineExtension, RootNode, shallowMergeConfig} from 'lexical';

import {compileDOMRenderConfigOverrides} from './compileDOMRenderConfigOverrides';
import {DOMRenderExtensionName} from './constants';
import {contextFromPairs} from './ContextRecord';

/** @internal @experimental */

export const DOMRenderExtension = defineExtension<
  DOMRenderConfig,
  typeof DOMRenderExtensionName,
  DOMRenderExtensionOutput,
  void
>({
  build(editor, config, state) {
    return {
      defaults: contextFromPairs(config.contextDefaults, undefined),
    };
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
    editorConfig.dom = compileDOMRenderConfigOverrides(editorConfig, config);
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
