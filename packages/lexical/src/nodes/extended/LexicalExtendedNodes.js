/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalNode} from 'lexical';

import {ListItemNode, ListNode} from '@lexical/list';
import {AutoLinkNode} from 'lexical/AutoLinkNode';
import {CodeHighlightNode} from 'lexical/CodeHighlightNode';
import {CodeNode} from 'lexical/CodeNode';
import {HashtagNode} from 'lexical/HashtagNode';
import {HeadingNode} from 'lexical/HeadingNode';
import {LinkNode} from 'lexical/LinkNode';
import {OverflowNode} from 'lexical/OverflowNode';
import {QuoteNode} from 'lexical/QuoteNode';
import {TableCellNode} from 'lexical/TableCellNode';
import {TableNode} from 'lexical/TableNode';
import {TableRowNode} from 'lexical/TableRowNode';

const LexicalExtendedNodes: Array<Class<LexicalNode>> = [
  HeadingNode,
  ListNode,
  ListItemNode,
  QuoteNode,
  CodeNode,
  TableNode,
  TableCellNode,
  TableRowNode,
  HashtagNode,
  CodeHighlightNode,
  AutoLinkNode,
  LinkNode,
  OverflowNode,
];

export default LexicalExtendedNodes;
