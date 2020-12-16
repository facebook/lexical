/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor, View} from 'outline';
import {createTextNode} from 'outline';

// $FlowFixMe: TODO
type UnknownState = Object;

import useOutlineEvent from 'outline-react/useOutlineEvent';
import {createParagraphNode} from 'outline';

function onFocusIn(event: FocusEvent, view: View) {
  const root = view.getRoot();

  if (root.getFirstChild() === null) {
    const text = createTextNode();
    root.append(createParagraphNode().append(text));
    text.select();
  }
}

export default function useOutlineFocusIn(
  editor: OutlineEditor,
  pluginStateRef: UnknownState,
): void {
  useOutlineEvent(editor, 'focusin', onFocusIn, pluginStateRef);
}
