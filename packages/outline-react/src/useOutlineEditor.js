/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor} from 'outline';

import {useCallback} from 'react';
import useLayoutEffect from './shared/useLayoutEffect';
import useOutlineCanShowPlaceholder from 'outline-react/useOutlineCanShowPlaceholder';

export default function useOutlineEditor(
  editor: OutlineEditor,
  onError: (error: Error, log: Array<string>) => void,
): [(null | HTMLElement) => void, boolean] {
  const showPlaceholder = useOutlineCanShowPlaceholder(editor);
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
