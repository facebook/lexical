/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import useLexicalEditable from '@lexical/react/useLexicalEditable';
import * as React from 'react';

import {useCanShowPlaceholder} from './shared/useCanShowPlaceholder';
import {ErrorBoundaryType, useDecorators} from './shared/useDecorators';
import {usePlainTextSetup} from './shared/usePlainTextSetup';

export function PlainTextPlugin({
  contentEditable,
  placeholder,
  placeholderNonEditable,
  ErrorBoundary,
}: {
  contentEditable: JSX.Element;
  placeholder: JSX.Element | string;
  placeholderNonEditable?: null | string | JSX.Element;
  ErrorBoundary: ErrorBoundaryType;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const decorators = useDecorators(editor, ErrorBoundary);
  usePlainTextSetup(editor);

  return (
    <>
      {contentEditable}
      <Placeholder
        placeholder={placeholder}
        placeholderNonEditable={placeholderNonEditable}
      />
      {decorators}
    </>
  );
}

function Placeholder({
  placeholder,
  placeholderNonEditable,
}: {
  placeholder: string | JSX.Element;
  placeholderNonEditable?: null | string | JSX.Element;
}): null | JSX.Element {
  const [editor] = useLexicalComposerContext();
  const showPlaceholder = useCanShowPlaceholder(editor, false);
  const editable = useLexicalEditable();

  if (!showPlaceholder) {
    return null;
  } else if (placeholderNonEditable === undefined) {
    return editable ? <>{placeholder}</> : null;
  } else {
    return editable ? <>{placeholder}</> : <>{placeholderNonEditable}</>;
  }
}
