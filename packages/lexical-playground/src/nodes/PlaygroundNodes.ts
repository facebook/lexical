/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode} from 'lexical';

import {CodeHighlightNode, CodeNode} from '@lexical/code';
import {HashtagNode} from '@lexical/hashtag';
import {AutoLinkNode, LinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';
import {MarkNode} from '@lexical/mark';
import {OverflowNode} from '@lexical/overflow';
import {HorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {TableCellNode, TableNode, TableRowNode} from '@lexical/table';
import {Class} from 'utility-types';

import {EmojiNode} from './EmojiNode';
import {EquationNode} from './EquationNode';
import {ExcalidrawNode} from './ExcalidrawNode';
import {ImageNode} from './ImageNode';
import {KeywordNode} from './KeywordNode';
import {MentionNode} from './MentionNode';
import {PollNode} from './PollNode';
import {StickyNode} from './StickyNode';
import {TweetNode} from './TweetNode';
import {TypeaheadNode} from './TypeaheadNode';
import {YouTubeNode} from './YouTubeNode';

const PlaygroundNodes: Array<Class<LexicalNode>> = [
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
  PollNode,
  StickyNode,
  ImageNode,
  MentionNode,
  EmojiNode,
  ExcalidrawNode,
  EquationNode,
  TypeaheadNode,
  KeywordNode,
  HorizontalRuleNode,
  TweetNode,
  YouTubeNode,
  MarkNode,
];

export default PlaygroundNodes;
