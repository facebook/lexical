/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from 'lexical';

import {useCallback} from 'react';
import useLayoutEffect from 'shared/useLayoutEffect';
import useLexicalCanShowPlaceholder from '@lexical/react/DEPRECATED_useLexicalCanShowPlaceholder';

export default function useLexicalEditor(
  editor: LexicalEditor,
  onError: (error: Error, log: Array<string>) => void,
): [(null | HTMLElement) => void, boolean] {
  const showPlaceholder = useLexicalCanShowPlaceholder(editor);
  const rootElementRef = useCallback(
    (rootElement: null | HTMLElement) => {
      editor.setRootElement(rootElement);
    },
    [editor],
  );
  useLayoutEffect(() => {
    return editor.addListener('error', onError);
  }, [editor, onError]);

  return [rootElementRef, showPlaceholder];
}
