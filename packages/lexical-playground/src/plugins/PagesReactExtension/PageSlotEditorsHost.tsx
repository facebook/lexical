/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {LexicalExtensionEditorComposer} from '@lexical/react/LexicalExtensionEditorComposer';
import {useExtensionSignalValue} from '@lexical/react/useExtensionSignalValue';
import * as React from 'react';
import {type JSX} from 'react';

import {PagesExtension} from '../PagesExtension/PagesExtension';

/**
 * Renders a composer for every nested header/footer editor the pages
 * extension has created. The editors are built outside React and set
 * their own root element (their `ReactExtension` renders no content
 * editable), so the composer only mounts their React-rendered nodes
 * (images, polls, ...) and plugins. Rendered as a decorator of the
 * document editor, it sits inside the application's providers, which
 * those components rely on.
 */
export function PageSlotEditorsHost(): JSX.Element {
  const slotEditors = useExtensionSignalValue(PagesExtension, 'slotEditors');
  return (
    <>
      {slotEditors.map(editor => (
        <LexicalExtensionEditorComposer
          key={editor.getKey()}
          initialEditor={editor}
        />
      ))}
    </>
  );
}

/** `ReactExtension` decorator form of {@link PageSlotEditorsHost}. */
export function PageSlotEditorsHostDecorator(): JSX.Element {
  return <PageSlotEditorsHost />;
}
