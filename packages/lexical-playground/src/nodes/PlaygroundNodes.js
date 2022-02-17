/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalNode} from 'lexical';

import {PollNode} from './PollNode';
import {StickyNode} from './StickyNode';
import {MentionNode} from './MentionNode';
import {EmojiNode} from './EmojiNode';
import {TypeaheadNode} from './TypeaheadNode';
import {ImageNode} from './ImageNode';
import {KeywordNode} from './KeywordNode';
import {ExcalidrawNode} from './ExcalidrawNode';
import {HorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';
import ExtendedNodes from 'lexical/ExtendedNodes';

const PlaygroundNodes: Array<Class<LexicalNode>> = [
  ...ExtendedNodes,
  PollNode,
  StickyNode,
  ImageNode,
  MentionNode,
  EmojiNode,
  ExcalidrawNode,
  TypeaheadNode,
  KeywordNode,
  HorizontalRuleNode,
];

export default PlaygroundNodes;
