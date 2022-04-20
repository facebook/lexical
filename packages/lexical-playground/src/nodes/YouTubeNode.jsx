/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ElementFormatType, LexicalNode, NodeKey} from 'lexical';

import {LexicalBlockDecoratorNode} from '@lexical/react/LexicalBlockDecoratorNode';
import {LexicalBlockWithAlignableContents} from '@lexical/react/LexicalBlockWithAlignableContents';
import * as React from 'react';

type YouTubeComponentProps = $ReadOnly<{
  format: ?ElementFormatType,
  nodeKey: NodeKey,
  videoID: string,
}>;

function YouTubeComponent({format, nodeKey, videoID}: YouTubeComponentProps) {
  return (
    <LexicalBlockWithAlignableContents format={format} nodeKey={nodeKey}>
      <iframe
        width="560"
        height="315"
        src={`https://www.youtube.com/embed/${videoID}`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen={true}
        title="YouTube video"
      />
    </LexicalBlockWithAlignableContents>
  );
}

export class YouTubeNode extends LexicalBlockDecoratorNode {
  __id: string;

  static getType(): string {
    return 'youtube';
  }

  static clone(node: YouTubeNode): YouTubeNode {
    return new YouTubeNode(node.__id, node.__key);
  }

  constructor(id: string, key?: NodeKey) {
    super(key);
    this.__id = id;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): React$Node {
    return (
      <YouTubeComponent
        format={this.__format}
        nodeKey={this.getKey()}
        videoID={this.__id}
      />
    );
  }
}

export function $createYouTubeNode(videoID: string): YouTubeNode {
  return new YouTubeNode(videoID);
}

export function $isYouTubeNode(node: ?LexicalNode): boolean %checks {
  return node instanceof YouTubeNode;
}
