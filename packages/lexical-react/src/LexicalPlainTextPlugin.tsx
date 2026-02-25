/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalEditable} from '@lexical/react/useLexicalEditable';

import {
  type ErrorBoundaryType,
  LegacyDecorators,
} from './shared/LegacyDecorators';
import {useCanShowPlaceholder} from './shared/useCanShowPlaceholder';
import {usePlainTextSetup} from './shared/usePlainTextSetup';

export function PlainTextPlugin({
  contentEditable,
  // TODO Remove. This property is now part of ContentEditable
  placeholder = null,
  ErrorBoundary,
}: {
  contentEditable: JSX.Element;
  placeholder?:
    | ((isEditable: boolean) => null | JSX.Element)
    | null
    | JSX.Element;
  ErrorBoundary: ErrorBoundaryType;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  usePlainTextSetup(editor);

  return (
    <>
      {contentEditable}
      <Placeholder content={placeholder} />
      <LegacyDecorators editor={editor} ErrorBoundary={ErrorBoundary} />
    </>
  );
}

// TODO Remove
function Placeholder({
  content,
}: {
  content: ((isEditable: boolean) => null | JSX.Element) | null | JSX.Element;
}): null | JSX.Element {
  const [editor] = useLexicalComposerContext();
  const showPlaceholder = useCanShowPlaceholder(editor);
  const editable = useLexicalEditable();

  if (!showPlaceholder) {
    return null;
  }

  if (typeof content === 'function') {
    return content(editable);
  } else {
    return content;
  }
}
