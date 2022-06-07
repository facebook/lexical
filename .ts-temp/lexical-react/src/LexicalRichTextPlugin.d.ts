/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/// <reference types="react" />
import type { InitialEditorStateType } from './shared/PlainRichTextUtils';
export declare function RichTextPlugin({ contentEditable, placeholder, initialEditorState, }: Readonly<{
    contentEditable: JSX.Element;
    initialEditorState?: InitialEditorStateType;
    placeholder: JSX.Element | string;
}>): JSX.Element;
