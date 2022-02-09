/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalNode} from 'lexical';

import {QuoteNode} from 'lexical/QuoteNode';
import {CodeNode} from 'lexical/CodeNode';
import {TableNode} from 'lexical/TableNode';
import {TableCellNode} from 'lexical/TableCellNode';
import {TableRowNode} from 'lexical/TableRowNode';
import {HashtagNode} from 'lexical/HashtagNode';
import {HeadingNode} from 'lexical/HeadingNode';
import {ListNode, ListItemNode} from '@lexical/list';
import {CodeHighlightNode} from 'lexical/CodeHighlightNode';
import {AutoLinkNode} from 'lexical/AutoLinkNode';
import {OverflowNode} from 'lexical/OverflowNode';
import {LinkNode} from 'lexical/LinkNode';

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
