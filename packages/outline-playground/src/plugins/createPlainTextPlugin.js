/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineComposerPlugin} from 'outline-react/OutlineComposer.react';

import * as React from 'react';
import {useLayoutEffect} from 'react';
import usePlainText from 'outline-react/useOutlinePlainText';
import type {OutlineComposerPluginProps} from 'outline-react/OutlineComposer.react';

function PlainTextPluginComponent({
  outlineProps: {editor, registerClearEditorFn},
}: {
  outlineProps: OutlineComposerPluginProps,
}): null {
  const clearEditor = usePlainText(editor);
  // Use a layout effect to ensure this registers before it might be used in standard useEffects
  useLayoutEffect(() => {
    registerClearEditorFn(clearEditor);
  }, [clearEditor, registerClearEditorFn]);

  return null;
}

export default function createPlainTextPlugin(): OutlineComposerPlugin<null> {
  return {
    name: 'plain-text',
    component: PlainTextPluginComponent,
    props: null,
  };
}
