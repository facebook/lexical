/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Shared gallery example definitions used by both the website gallery page
 * and the screenshot capture script.
 *
 * To add a new example:
 * 1. Add an entry here with the example's `dir` name and metadata.
 * 2. Set `waitForSelector` to enable automated screenshot capture.
 * 3. Run `pnpm run capture-gallery-screenshots` to generate the image.
 */

export interface GalleryExample {
  /** Directory name under examples/ */
  dir: string;
  /** Display title on the gallery card */
  title: string;
  /** Short description shown on the gallery card */
  description: string;
  /** Filter tags (e.g. 'opensource', 'favorite') */
  tags: string[];
  /** Query string appended to the StackBlitz embed URL */
  stackblitzQuery: string;
  /**
   * CSS selector to wait for before taking a screenshot.
   * If set, the capture script will screenshot this example and
   * the gallery card will use the local image.
   * If omitted, the gallery falls back to the Slorber screenshot API.
   */
  waitForSelector?: string;
}

/** Helper to build a StackBlitz URI from an example and a prefix */
export function buildStackBlitzUri(
  example: GalleryExample,
  stackblitzPrefix: string,
): string {
  return `${stackblitzPrefix}examples/${example.dir}?${example.stackblitzQuery}`;
}

/** Helper to get the local screenshot path for an example (if available) */
export function getScreenshotPreview(
  example: GalleryExample,
): string | undefined {
  return example.waitForSelector
    ? `/img/gallery/${example.dir}.png`
    : undefined;
}

export const galleryExamples: GalleryExample[] = [
  {
    description: 'Learn how to create an editor with Emojis',
    dir: 'vanilla-js-plugin',
    stackblitzQuery:
      'embed=1&file=src%2Femoji-plugin%2FEmojiPlugin.ts&terminalHeight=0&ctl=0',
    tags: ['opensource'],
    title: 'EmojiPlugin',
    waitForSelector: '[data-lexical-editor]',
  },
  {
    description: 'Learn how to create an editor with Real Time Collaboration',
    dir: 'react-rich-collab',
    stackblitzQuery: 'ctl=0&file=src%2Fmain.tsx&terminalHeight=0&embed=1',
    tags: ['opensource', 'favorite'],
    title: 'Collab RichText',
    // Editor is inside iframes, so wait for the iframe elements instead
    waitForSelector: 'iframe[name="left"]',
  },
  {
    description: 'Learn how to create an editor with Tables',
    dir: 'react-table',
    stackblitzQuery: 'embed=1&file=src%2Fmain.tsx&terminalHeight=0&ctl=0',
    tags: ['opensource', 'favorite'],
    title: 'TablePlugin',
    waitForSelector: '[data-lexical-editor]',
  },
];
