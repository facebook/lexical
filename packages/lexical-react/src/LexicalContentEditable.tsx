/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Props as ElementProps} from './shared/LexicalContentEditableElement';

import {useLexicalEditable} from '@lexical/react/useLexicalEditable';

import {useLexicalComposerContext} from './LexicalComposerContext';
import {ContentEditableElement} from './shared/LexicalContentEditableElement';
import {useCanShowPlaceholder} from './shared/useCanShowPlaceholder';

/* eslint-disable @typescript-eslint/ban-types */
export type Props = (
  | {}
  | {
      'aria-placeholder': string;
      placeholder:
        | ((isEditable: boolean) => null | JSX.Element)
        | null
        | JSX.Element;
    }
) &
  ElementProps;
/* eslint-enable @typescript-eslint/ban-types */

export function ContentEditable(props: Props): JSX.Element {
  let placeholder = null;
  if ('placeholder' in props) {
    placeholder = props.placeholder;
  }

  return (
    <>
      <ContentEditableElement {...props} />
      <Placeholder content={placeholder} />
    </>
  );
}

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
