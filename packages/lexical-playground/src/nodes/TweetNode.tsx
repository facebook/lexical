/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementFormatType, LexicalNode, NodeKey} from 'lexical';

import {BlockWithAlignableContents} from '@lexical/react/LexicalBlockWithAlignableContents';
import {DecoratorBlockNode} from '@lexical/react/LexicalDecoratorBlockNode';
import * as React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';

const WIDGET_SCRIPT_URL = 'https://platform.twitter.com/widgets.js';

const getHasScriptCached = () =>
  document.querySelector(`script[src="${WIDGET_SCRIPT_URL}"]`);

type TweetComponentProps = Readonly<{
  format: ElementFormatType | null;
  loadingComponent?: JSX.Element | string;
  nodeKey: NodeKey;
  onError?: (error: string) => void;
  onLoad?: () => void;
  tweetID: string;
}>;

function TweetComponent({
  format,
  loadingComponent,
  nodeKey,
  onError,
  onLoad,
  tweetID,
}: TweetComponentProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const previousTweetIDRef = useRef<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const createTweet = useCallback(async () => {
    try {
      await window.twttr.widgets.createTweet(tweetID, containerRef.current);

      setIsLoading(false);

      if (onLoad) {
        onLoad();
      }
    } catch (error) {
      if (onError) {
        onError(String(error));
      }
    }
  }, [onError, onLoad, tweetID]);

  useEffect(() => {
    if (tweetID !== previousTweetIDRef.current) {
      setIsLoading(true);

      if (!getHasScriptCached()) {
        const script = document.createElement('script');
        script.src = WIDGET_SCRIPT_URL;
        script.async = true;
        document.body?.appendChild(script);
        script.onload = createTweet;
        script.onerror = onError;
      } else {
        createTweet();
      }

      if (previousTweetIDRef) {
        previousTweetIDRef.current = tweetID;
      }
    }
  }, [createTweet, onError, tweetID]);

  return (
    <BlockWithAlignableContents format={format} nodeKey={nodeKey}>
      {isLoading ? loadingComponent : null}
      <div
        style={{display: 'inline-block', width: '550px'}}
        ref={containerRef}
      />
    </BlockWithAlignableContents>
  );
}

export class TweetNode extends DecoratorBlockNode<JSX.Element> {
  __id: string;

  static getType(): string {
    return 'tweet';
  }

  static clone(node: TweetNode): TweetNode {
    return new TweetNode(node.__id, node.__format, node.__key);
  }

  constructor(id: string, format?: ElementFormatType | null, key?: NodeKey) {
    super(format, key);
    this.__id = id;
  }

  getId(): string {
    return this.__id;
  }

  decorate(): JSX.Element {
    return (
      <TweetComponent
        format={this.__format}
        loadingComponent="Loading..."
        nodeKey={this.getKey()}
        tweetID={this.__id}
      />
    );
  }

  isTopLevel(): true {
    return true;
  }
}

export function $createTweetNode(tweetID: string): TweetNode {
  return new TweetNode(tweetID);
}

export function $isTweetNode(
  node: TweetNode | LexicalNode | null | undefined,
): node is TweetNode {
  return node instanceof TweetNode;
}
