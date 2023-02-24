/** @module @lexical/headless */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {CreateEditorArgs, LexicalEditor} from 'lexical';

import {createEditor} from 'lexical';

export function createHeadlessEditor(
  editorConfig?: CreateEditorArgs,
): LexicalEditor {
  const editor = createEditor(editorConfig);
  editor._headless = true;

  const unsupportedMethods = [
    'registerDecoratorListener',
    'registerRootListener',
    'registerMutationListener',
    'getRootElement',
    'setRootElement',
    'getElementByKey',
    'focus',
    'blur',
  ] as const;

  unsupportedMethods.forEach((method: typeof unsupportedMethods[number]) => {
    editor[method] = () => {
      throw new Error(`${method} is not supported in headless mode`);
    };
  });

  return editor;
}
