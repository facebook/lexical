/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalNode, NodeKey} from 'lexical';

import {DecoratorNode} from 'lexical';
import * as React from 'react';
import {useEffect, useRef} from 'react';

type YouTubeComponentProps = $ReadOnly<{
  onLoad?: () => void,
  videoID: string,
}>;

function YouTubeComponent({onLoad, videoID}: YouTubeComponentProps) {
  const previousYouTubeIDRef = useRef(null);

  useEffect(() => {
    if (videoID !== previousYouTubeIDRef.current) {
      if (onLoad) {
        onLoad();
      }

      previousYouTubeIDRef.current = videoID;
    }
  }, [onLoad, videoID]);

  return (
    <iframe
      width="560"
      height="315"
      src={`https://www.youtube.com/embed/${videoID}`}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen={true}
      title="YouTube video"
    />
  );
}

export class YouTubeNode extends DecoratorNode<React$Node> {
  __id: string;
  __format: ?string;

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

  createDOM(): HTMLElement {
    const elem = document.createElement('div');
    if (this.__format) {
      elem.style.textAlign = this.__format;
    }
    return elem;
  }

  updateDOM(prevNode: YouTubeNode): boolean {
    return prevNode.__format !== this.__format;
  }

  decorate(): React$Node {
    return <YouTubeComponent videoID={this.__id} />;
  }

  setFormat(alignment: string): void {
    const self = this.getWritable();
    self.__format = alignment;
  }
}

export function $createYouTubeNode(videoID: string): YouTubeNode {
  return new YouTubeNode(videoID);
}

export function $isYouTubeNode(node: ?LexicalNode): boolean %checks {
  return node instanceof YouTubeNode;
}
