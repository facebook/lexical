/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * The code of a {@link LexicalWarning}: a string namespaced by the package
 * that reports it (`'@lexical/y/self-check'`). The union lists the codes the
 * Lexical packages report, for suggestions; any other string is accepted,
 * so a `switch` over codes needs a `default` branch and keeps compiling when
 * codes are added.
 *
 * Codes are public API: a code is never renamed, never removed from this
 * list while a package can report it, and never reused for another
 * condition. New codes may be added in any release.
 */
export type LexicalWarningCode =
  /**
   * `@lexical/y`: the document's layout version is missing, newer than this
   * version supports or malformed, or an older layout's root has content;
   * the binding is read only.
   */
  | '@lexical/y/unsupported-layout'
  /**
   * `@lexical/y`: the document has node types the editor does not register;
   * the binding is read only.
   */
  | '@lexical/y/unknown-node-types'
  /**
   * `@lexical/y`: the document stores a node type in a way this editor's
   * class cannot (another storage kind or group identity); the binding is
   * read only.
   */
  | '@lexical/y/storage-mismatch'
  /** `@lexical/y`: the opt-in self-check found the editor and the document disagree. */
  | '@lexical/y/self-check'
  /**
   * `@lexical/y`: a remote change could not be read; the editor was rebuilt
   * from the document.
   */
  | '@lexical/y/recovered-read'
  /** `@lexical/y`: a local change could not be written; the document was rewritten. */
  | '@lexical/y/recovered-write'
  /**
   * `@lexical/y`: a node class's declarations make it a line, format or
   * group, but something it does prevents that (an incomplete schema, an
   * overridden merge method, slots); it is stored as a nested node.
   */
  | '@lexical/y/nested-fallback'
  /**
   * `@lexical/y`: a node property or NodeState value is not plain JSON, so it
   * is not synchronized.
   */
  | '@lexical/y/unsynced-value'
  | (string & {});

/**
 * A warning with a stable code, passed to the editor's `onWarn` by packages
 * that report recoverable, warn-level conditions. It is an `Error`, so a
 * handler written for `onWarn` keeps working; check
 * `instanceof LexicalWarning` to read `code` and `data`.
 *
 * ```ts
 * onWarn(error) {
 *   if (error instanceof LexicalWarning) {
 *     switch (error.code) {
 *       case '@lexical/y/self-check':
 *         reportMismatch(error.message, error.data);
 *         return;
 *       default:
 *         break;
 *     }
 *   }
 *   console.warn(error);
 * }
 * ```
 */
export class LexicalWarning extends Error {
  /** What happened, namespaced by package (see {@link LexicalWarningCode}). */
  readonly code: LexicalWarningCode;
  /**
   * Details for programs, documented with each code (the message is for
   * people and may change).
   */
  readonly data?: unknown;
  constructor(code: LexicalWarningCode, message: string, data?: unknown) {
    super(message);
    this.name = 'LexicalWarning';
    this.code = code;
    this.data = data;
  }
}
