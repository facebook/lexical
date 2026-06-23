/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {createState} from 'lexical';

/**
 * Per-node state used to round-trip the *exact* Markdown syntax a construct was
 * parsed from, so re-serializing produces minimally different output. This is
 * the same technique `@lexical/markdown` uses; the state lives on the Lexical
 * nodes (and therefore survives serialization), and the exporter reads it to
 * reproduce the original marker/fence/break.
 */

/** The bullet character (`-`, `*`, `+`) an unordered/check `ListNode` used. */
export const listMarkerState = /* @__PURE__ */ createState('mdastListMarker', {
  parse: (v): string => (typeof v === 'string' && /^[-*+]$/.test(v) ? v : '-'),
  resetOnCopyNode: true,
});

/** The delimiter (`.` or `)`) an ordered `ListNode` used. */
export const orderedMarkerState = /* @__PURE__ */ createState(
  'mdastOrderedMarker',
  {
    parse: (v): '.' | ')' => (v === ')' ? ')' : '.'),
    resetOnCopyNode: true,
  },
);

/** The marker (`*` or `_`) an italic run used (`*em*` vs `_em_`). */
export const emphasisMarkerState = /* @__PURE__ */ createState(
  'mdastEmphasisMarker',
  {
    parse: (v): '*' | '_' => (v === '_' ? '_' : '*'),
    resetOnCopyNode: true,
  },
);

/** The marker (`*` or `_`) a bold run used (`**b**` vs `__b__`). */
export const strongMarkerState = /* @__PURE__ */ createState(
  'mdastStrongMarker',
  {
    parse: (v): '*' | '_' => (v === '_' ? '_' : '*'),
    resetOnCopyNode: true,
  },
);

/** Whether a (level 1/2) `HeadingNode` was written in setext style. */
export const setextState = /* @__PURE__ */ createState('mdastSetext', {
  parse: (v): boolean => v === true,
  resetOnCopyNode: true,
});

/** The fence a `CodeNode` used (e.g. ```` ``` ````, ````` ```` `````, `~~~`). */
export const codeFenceState = /* @__PURE__ */ createState('mdastCodeFence', {
  parse: (v): string =>
    typeof v === 'string' && /^(`{3,}|~{3,})$/.test(v) ? v : '```',
  resetOnCopyNode: true,
});

/** The hard-line-break marker a `LineBreakNode` used (`\` or trailing spaces). */
export const hardLineBreakState = /* @__PURE__ */ createState(
  'mdastHardLineBreak',
  {
    parse: (v): string =>
      typeof v === 'string' && /^(\\| {2,})$/.test(v) ? v : '',
    resetOnCopyNode: true,
  },
);
