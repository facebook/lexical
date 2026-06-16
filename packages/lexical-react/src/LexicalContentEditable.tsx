/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';
import type {JSX} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {forwardRef, Ref, useLayoutEffect, useState} from 'react';

import {
  ContentEditableElement,
  type ContentEditableElementProps,
} from './shared/LexicalContentEditableElement';
import {useCanShowPlaceholder} from './shared/useCanShowPlaceholder';

export {ContentEditableElement, type ContentEditableElementProps};

export type ContentEditableProps = Omit<ContentEditableElementProps, 'editor'> &
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

export const ContentEditable = forwardRef(ContentEditableImpl);

function ContentEditableImpl(
  props: ContentEditableProps,
  ref: Ref<HTMLDivElement>,
): JSX.Element {
  const {placeholder, ...rest} = props;
  const [editor] = useLexicalComposerContext();

  return (
    <>
      <ContentEditableElement editor={editor} {...rest} ref={ref} />
      {placeholder != null && (
        <Placeholder editor={editor} content={placeholder} />
      )}
    </>
  );
}

function Placeholder({
  content,
  editor,
}: {
  editor: LexicalEditor;
  content: ((isEditable: boolean) => null | JSX.Element) | JSX.Element;
}): null | JSX.Element {
  const showPlaceholder = useCanShowPlaceholder(editor);

  const [isEditable, setEditable] = useState(editor.isEditable());
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditable(editor.isEditable());
    return editor.registerEditableListener(currentIsEditable => {
      setEditable(currentIsEditable);
    });
  }, [editor]);

  if (!showPlaceholder) {
    return null;
  }

  let placeholder = null;
  if (typeof content === 'function') {
    placeholder = content(isEditable);
  } else if (content !== null) {
    placeholder = content;
  }

  if (placeholder === null) {
    return null;
  }
  return <div aria-hidden={true}>{placeholder}</div>;
}
