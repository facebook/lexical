/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Path namespace (under `static/`) where the build-time plugin emits a Markdown
 * copy of every doc page, e.g. the page `/docs/intro` is served at
 * `/llms/docs/intro.md`.
 */
export const MARKDOWN_NAMESPACE = 'llms';

/**
 * Map a doc permalink to the namespace-relative path of its generated Markdown
 * file (without the `MARKDOWN_NAMESPACE` prefix or surrounding slashes), e.g.
 * `/docs/api/` -> `docs/api`.
 *
 * Shared by the plugin that writes the file and the CopyPageButton that links
 * to it so the two normalizations (notably trailing-slash handling for index
 * pages) can never drift.
 *
 * @param {string} permalink Doc permalink, including baseUrl (e.g. `/docs/api/`).
 * @param {string} baseUrl Site baseUrl (e.g. `/`).
 * @returns {string}
 */
export function relativeMarkdownPath(permalink, baseUrl) {
  let rel = permalink;
  if (baseUrl && rel.startsWith(baseUrl)) {
    rel = rel.slice(baseUrl.length);
  }
  return rel.replace(/^\/+/, '').replace(/\/+$/, '') || 'index';
}
