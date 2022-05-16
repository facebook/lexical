/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementFormatType, NodeKey} from 'lexical';
type Props = Readonly<{
  children: JSX.Element | string | (JSX.Element | string)[];
  format: ElementFormatType | null;
  nodeKey: NodeKey;
}>;
declare function BlockWithAlignableContents(arg0: Props): JSX.Element;
