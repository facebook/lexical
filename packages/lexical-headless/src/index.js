/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {CreateEditorConfig,LexicalEditor} from 'lexical';

import {createEditor} from 'lexical';

export function createHeadlessEditor(
  editorConfig?: CreateEditorConfig,
): LexicalEditor {
  const editor = createEditor(editorConfig);
  editor._headless = true;

  [
    'registerDecoratorListener',
    'registerRootListener',
    'registerMutationListeners',
    'getRootElement',
    'setRootElement',
    'getElementByKey',
    'focus',
    'blur',
  ].forEach((method) => {
    // $FlowFixMe
    editor[method] = () => {
      throw new Error(`${method} is not supported in headless mode`);
    };
  });

  return editor;
}
