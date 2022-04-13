/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';
export default function TreeView(props: {
  timeTravelPanelClassName: string;
  timeTravelPanelSliderClassName: string;
  timeTravelPanelButtonClassName: string;
  timeTravelButtonClassName: string;
  viewClassName: string;
  editor: LexicalEditor;
}): JSX.Element | null;
