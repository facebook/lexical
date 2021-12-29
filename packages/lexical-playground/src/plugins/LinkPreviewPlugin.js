/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from 'lexical';

import * as React from 'react';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import stylex from 'stylex';
import {useLexicalComposerContext} from 'lexical-react/LexicalComposerContext';
import useLexicalEditorEvents from 'lexical-react/useLexicalEditorEvents';

const backgroundAnimation = stylex.keyframes({
  '0%': {
    background: '#f9f9f9',
  },
  '50%': {
    background: '#dddddd',
  },
  '100%': {
    background: '#f9f9f9',
  },
});

const styles = stylex.create({
  container: {
    background: '#fff',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
    position: 'absolute',
    left: -999,
    top: -999,
    width: 400,
    maxWidth: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    zIndex: 100,
    transform: 'translate(-50%, 5px)',
    paddingBottom: 12,
  },
  imageWrapper: {
    textAlign: 'center',
  },
  image: {
    maxWidth: '100%',
    maxHeight: 250,
    margin: 'auto',
  },
  title: {
    marginHorizontal: 12,
    marginTop: 4,
  },
  description: {
    color: '#999',
    fontSize: '90%',
    marginHorizontal: 12,
    marginTop: 4,
  },
  domain: {
    color: '#999',
    fontSize: '90%',
    marginHorizontal: 12,
    marginTop: 4,
  },
  fallback: {
    background: '#f9f9f9',
    borderRadius: 8,
    height: 18,
    marginTop: 12,
    marginHorizontal: 12,
    animationDuration: '3s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear',
    animationName: backgroundAnimation,
  },
});

function LinkPreview({
  url,
  position,
}: $ReadOnly<{
  url: string,
  position: {top: number, left: number},
}>): React$Node {
  const {preview} = useSuspenseRequest(url);
  if (preview === null) {
    return null;
  }
  return (
    <div className={stylex(styles.container)} style={position}>
      {preview.img && (
        <div className={stylex(styles.imageWrapper)}>
          <img
            src={preview.img}
            alt={preview.title}
            className={stylex(styles.image)}
          />
        </div>
      )}
      {preview.domain && (
        <div className={stylex(styles.domain)}>{preview.domain}</div>
      )}
      {preview.title && (
        <div className={stylex(styles.title)}>{preview.title}</div>
      )}
      {preview.description && (
        <div className={stylex(styles.description)}>{preview.description}</div>
      )}
    </div>
  );
}

function LinkPreviewFallback({
  position,
}: $ReadOnly<{position: {top: number, left: number}}>): React$Node {
  return (
    <div className={stylex(styles.container)} style={position}>
      <div
        className={stylex(styles.fallback)}
        style={{width: '40%', animationDelay: '0'}}
      />
      <div
        className={stylex(styles.fallback)}
        style={{width: '80%', animationDelay: '300ms'}}
      />
      <div
        className={stylex(styles.fallback)}
        style={{height: 50, animationDelay: '600ms'}}
      />
    </div>
  );
}

// Cached responses or running request promises
const PREVIEW_CACHE = {};

function useSuspenseRequest(url: string) {
  let cached = PREVIEW_CACHE[url];

  if (!cached) {
    cached = PREVIEW_CACHE[url] = fetch(
      `/api/link-preview?url=${encodeURI(url)}`,
    )
      .then((response) => response.json())
      .then((preview) => {
        PREVIEW_CACHE[url] = preview;
        return preview;
      })
      .catch(() => {
        delete PREVIEW_CACHE[url];
      });
  }

  if (cached instanceof Promise) {
    throw cached;
  }

  return cached;
}

const SHOW_DELAY = 300;

function useHoveredLink(editor: LexicalEditor): HTMLLinkElement | null {
  const [node, setNode] = useState<HTMLLinkElement | null>(null);
  const timer = useRef(null);
  const clear = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const setNodeDebounced = useCallback(
    (node) => {
      clear();
      timer.current = setTimeout(() => {
        setNode(node);
      }, SHOW_DELAY);
    },
    [clear],
  );
  const events = useMemo(
    () => [
      [
        'mouseenter',
        (e) => {
          if (e.target.href) {
            setNodeDebounced(e.target);
          }
        },
        true,
      ],
      [
        'mouseleave',
        (e) => {
          if (e.target.href) {
            clear();
            setNode(null);
          }
        },
        true,
      ],
    ],
    [clear, setNodeDebounced],
  );

  useEffect(() => clear);
  useLexicalEditorEvents(events, editor);

  return node;
}

function useNodePosition(
  node: HTMLElement | null,
  parent: HTMLElement | null,
): {top: number, left: number} {
  return useMemo(() => {
    if (node === null || parent === null) {
      return {top: 0, left: 0};
    }
    const {top, left, width, height} = node.getBoundingClientRect();
    const {top: parentTop, left: parentLeft} = parent.getBoundingClientRect();
    return {
      top: top + height - parentTop,
      left: left + width / 2 - parentLeft,
    };
  }, [node, parent]);
}

export default function LinkPreviewPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();
  const node = useHoveredLink(editor);
  const {top, left} = useNodePosition(node, editor.getRootElement());

  return (
    node &&
    node.href && (
      <Suspense fallback={<LinkPreviewFallback position={{top, left}} />}>
        <LinkPreview url={node.href} position={{top, left}} />
      </Suspense>
    )
  );
}
