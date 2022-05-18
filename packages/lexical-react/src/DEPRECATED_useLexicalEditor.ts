/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import {useCallback} from 'react';

import {useLexicalCanShowPlaceholder} from './DEPRECATED_useLexicalCanShowPlaceholder';

export function useLexicalEditor(
  editor: LexicalEditor,
): [(rootElement: null | HTMLElement) => void, boolean] {
  const showPlaceholder = useLexicalCanShowPlaceholder(editor);

  const rootElementRef = useCallback(
    (rootElement: null | HTMLElement) => {
      editor.setRootElement(rootElement);
    },
    [editor],
  );

  return [rootElementRef, showPlaceholder];
}
