/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as React from 'react';
import {Suspense} from 'react';
import stylex from 'stylex';

const glimmerAnimation = stylex.keyframes({
  '0%': {
    background: '#f9f9f9',
  },
  '50%': {
    background: '#eeeeee',
  },
  '100%': {
    background: '#f9f9f9',
  },
});

const styles = stylex.create({
  container: {
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
  glimmer: {
    background: '#f9f9f9',
    borderRadius: 8,
    height: 18,
    marginBottom: 8,
    marginHorizontal: 12,
    animationDuration: '3s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear',
    animationName: glimmerAnimation,
  },
});

// Cached responses or running request promises
const PREVIEW_CACHE = {};

const URL_MATCHER =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

function useSuspenseRequest(url: string) {
  let cached = PREVIEW_CACHE[url];

  if (!url.match(URL_MATCHER)) {
    return {preview: null};
  }

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
        PREVIEW_CACHE[url] = {preview: null};
      });
  }

  if (cached instanceof Promise) {
    throw cached;
  }

  return cached;
}

function LinkPreviewContent({
  url,
}: $ReadOnly<{
  url: string,
}>): React$Node {
  const {preview} = useSuspenseRequest(url);
  if (preview === null) {
    return null;
  }
  return (
    <div className={stylex(styles.container)}>
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

function Glimmer(props): React$Node {
  return (
    <div
      className={stylex(styles.glimmer)}
      {...props}
      style={{animationDelay: (props.index || 0) * 300, ...(props.style || {})}}
    />
  );
}

export default function LinkPreview({
  url,
}: $ReadOnly<{
  url: string,
}>): React$Node {
  return (
    <Suspense
      fallback={
        <>
          <Glimmer style={{height: '80px'}} index={0} />
          <Glimmer style={{width: '60%'}} index={1} />
          <Glimmer style={{width: '80%'}} index={2} />
        </>
      }>
      <LinkPreviewContent url={url} />
    </Suspense>
  );
}
