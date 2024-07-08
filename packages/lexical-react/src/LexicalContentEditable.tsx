/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Props as ElementProps} from './shared/LexicalContentEditableElement';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalEditable} from '@lexical/react/useLexicalEditable';
import {forwardRef, Ref} from 'react';

import {ContentEditableElement} from './shared/LexicalContentEditableElement';
import {useCanShowPlaceholder} from './shared/useCanShowPlaceholder';

/* eslint-disable @typescript-eslint/ban-types */
export type Props = ElementProps &
  (
    | {
        'aria-placeholder'?: void;
        placeholder?: null;
      }
    | {
        'aria-placeholder': string;
        placeholder:
          | ((isEditable: boolean) => null | JSX.Element)
          | JSX.Element;
      }
  );

/* eslint-enable @typescript-eslint/ban-types */

function ContentEditableImpl(
  props: Props,
  ref: Ref<HTMLDivElement>,
): JSX.Element {
  let placeholder = null;
  let rest: Omit<Props, 'placeholder'> = props;
  if ('placeholder' in props) {
    ({placeholder, ...rest} = props);
  }

  return (
    <>
      <ContentEditableElement {...rest} ref={ref} />
      {placeholder != null && <Placeholder content={placeholder} />}
    </>
  );
}

export const ContentEditable = forwardRef(ContentEditableImpl);

function Placeholder({
  content,
}: {
  content: ((isEditable: boolean) => null | JSX.Element) | JSX.Element;
}): null | JSX.Element {
  const [editor] = useLexicalComposerContext();
  const showPlaceholder = useCanShowPlaceholder(editor);
  const editable = useLexicalEditable();

  if (!showPlaceholder) {
    return null;
  }

  let placeholder = null;
  if (typeof content === 'function') {
    placeholder = content(editable);
  } else if (content !== null) {
    placeholder = content;
  }

  if (placeholder === null) {
    return null;
  }
  return <div aria-hidden={true}>{placeholder}</div>;
}
