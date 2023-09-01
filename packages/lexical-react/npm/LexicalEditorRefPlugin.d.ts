/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { LexicalEditor } from 'lexical';
import { MutableRefObject } from 'react';
import * as React from 'react';
/**
 *
 * Use this plugin to access the editor instance outside of the
 * LexicalComposer. This can help with things like buttons or other
 * UI components that need to update or read EditorState but need to
 * be positioned outside the LexicalComposer in the React tree.
 */
export declare function EditorRefPlugin({ editorRef, }: {
    editorRef: React.RefCallback<LexicalEditor> | MutableRefObject<LexicalEditor | null | undefined>;
}): null;
