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
import {useCallback, useEffect, useRef, useState} from 'react';

const WIDGET_SCRIPT_URL = 'https://platform.twitter.com/widgets.js';

const getHasScriptCached = () =>
  document.querySelector(`script[src="${WIDGET_SCRIPT_URL}"]`);

type TweetComponentProps = $ReadOnly<{
  loadingComponent?: React$Node,
  onError?: (error?: Error) => void,
  onLoad?: () => void,
  tweetID: string,
}>;

function TweetComponent({
  loadingComponent,
  onError,
  onLoad,
  tweetID,
}: TweetComponentProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const previousTweetIDRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  const createTweet = useCallback(async () => {
    try {
      await window.twttr.widgets.createTweet(tweetID, containerRef.current);

      setIsLoading(false);

      if (onLoad) {
        onLoad();
      }
    } catch (e) {
      if (onError) {
        onError(e);
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

      previousTweetIDRef.current = tweetID;
    }
  }, [createTweet, onError, tweetID]);

  return (
    <>
      {isLoading ? loadingComponent : null}
      <div ref={containerRef} />
    </>
  );
}

export class TweetNode extends DecoratorNode<React$Node> {
  __id: string;

  static getType(): string {
    return 'tweet';
  }

  static clone(node: TweetNode): TweetNode {
    return new TweetNode(node.__id, node.__key);
  }

  constructor(id: string, key?: NodeKey) {
    super(key);

    this.__id = id;
  }

  createDOM(): HTMLElement {
    return document.createElement('div');
  }

  updateDOM(): false {
    return false;
  }

  decorate(): React$Node {
    return <TweetComponent loadingComponent="Loading..." tweetID={this.__id} />;
  }
}

export function $createTweetNode(tweetID: string): TweetNode {
  return new TweetNode(tweetID);
}

export function $isTweetNode(node: ?LexicalNode): boolean %checks {
  return node instanceof TweetNode;
}
