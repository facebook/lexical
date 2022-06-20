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
  LexicalEditor,
  LexicalNode,
} from 'lexical';
import type {Klass} from 'shared/types';

import {createEditor} from 'lexical';

export function createHeadlessEditor(editorConfig?: {
  disableEvents?: boolean;
  editorState?: EditorState;
  namespace: string;
  nodes?: ReadonlyArray<Klass<LexicalNode>>;
  onError: (error: Error) => void;
  parentEditor?: LexicalEditor;
  readOnly?: boolean;
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
