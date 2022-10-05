/** @module @lexical/headless */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  EditorState,
  EditorThemeClasses,
  Klass,
  LexicalEditor,
  LexicalNode,
} from 'lexical';

import {createEditor} from 'lexical';

type ErrorHandler = (error: Error) => void;

export function createHeadlessEditor(editorConfig?: {
  editorState?: EditorState;
  namespace?: string;
  nodes?: ReadonlyArray<Klass<LexicalNode>>;
  onError?: ErrorHandler;
  parentEditor?: LexicalEditor;
  editable?: boolean;
  theme?: EditorThemeClasses;
}): LexicalEditor {
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
