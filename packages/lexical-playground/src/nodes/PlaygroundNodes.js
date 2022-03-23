/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalNode} from 'lexical';

import {HorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';
import ExtendedNodes from 'lexical/ExtendedNodes';

import {EmojiNode} from './EmojiNode';
import {EquationNode} from './EquationNode';
import {ExcalidrawNode} from './ExcalidrawNode';
import {ImageNode} from './ImageNode';
import {KeywordNode} from './KeywordNode';
import {MentionNode} from './MentionNode';
import {PollNode} from './PollNode';
import {StickyNode} from './StickyNode';
import {TweetNode} from './TweetNode.jsx';
import {TypeaheadNode} from './TypeaheadNode';

const PlaygroundNodes: Array<Class<LexicalNode>> = [
  ...ExtendedNodes,
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
];

export default PlaygroundNodes;
