/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './ContentEditable.css';

import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import * as React from 'react';
import {MutableRefObject} from 'react';

export default function LexicalContentEditable({
  className,
  editorRef,
}: {
  className?: string;
  editorRef?: MutableRefObject<HTMLDivElement | null>;
}): JSX.Element {
  return (
    <div className="editor-scroller">
      <div className="editor" ref={editorRef}>
        <ContentEditable className={className || 'ContentEditable__root'} />
      </div>
    </div>
  );
}
