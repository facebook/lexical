/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EventHandler, LexicalEditor } from 'lexical';
export declare type InputEvents = Array<[string, EventHandler]>;
export declare function useEditorEvents(events: InputEvents, editor: LexicalEditor): void;
