/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// The headless editor behind `@lexical/y/headless`. Bundled into that entry
// only; `..` is the public `@lexical/y` entry, which stays external so the
// binding is not bundled twice.
import {buildEditorFromExtensions} from '@lexical/extension';
import {applyUpdate, Doc} from '@y/y';
import {
  type AnyLexicalExtensionArgument,
  type CreateEditorArgs,
  defineExtension,
  type LexicalEditor,
  type LexicalEditorWithDispose,
  LexicalWarning,
} from 'lexical';

import {type ClientIDRange, DEFAULT_ROOT_NAME, YBinding} from '..';

/**
 * @experimental A warning the editor reported through its `onWarn` that is
 * not a `LexicalWarning` (Lexical's own, or an extension's), passed on as one
 * with its message. `data`: `{error: Error}` (the warning as reported).
 */
export const EDITOR_WARNING = '@lexical/y/editor-warning';
/**
 * @experimental The edit's listeners kept scheduling updates: after the last
 * follow-up update the helpers commit, the rest were not committed and are
 * not part of the result. `data`: `{limit: number}` (the follow-up updates
 * committed).
 */
export const FOLLOW_UPS_EXHAUSTED_WARNING = '@lexical/y/follow-ups-exhausted';

/**
 * @experimental The editor a headless helper binds: the same extensions (or
 * nodes) as the clients' editors, so that the server reads and writes the
 * document the way a client would.
 */
export interface HeadlessYConfig {
  /** Extensions that define the editor: nodes, transforms, NodeState. */
  extensions?: readonly AnyLexicalExtensionArgument[];
  /** Node classes, for an editor that is not defined by extensions. */
  nodes?: CreateEditorArgs['nodes'];
  /** The name of the shared root (default `'lexical-y'`). */
  root?: string;
  /**
   * The range of the client ids the server writes with (default
   * `'uint53'`). Use `'uint32'` when updates pass through yrs before 0.28.
   */
  clientIDRange?: ClientIDRange;
  /**
   * Called with every warning, as a `LexicalWarning` (the same ones the
   * result's `warnings` lists): the binding's (`@lexical/y/...` codes), the
   * editor's (it replaces an `onWarn` of the extensions; other errors come
   * as {@link EDITOR_WARNING}), and {@link FOLLOW_UPS_EXHAUSTED_WARNING}.
   * Warnings never refuse an edit, in any environment, and a throwing
   * handler does not either. Default: `console.warn` outside production,
   * nothing in production.
   */
  onWarn?: (warning: LexicalWarning) => void;
  /**
   * The binding's self-check of its own writes (see `YBindingOptions`).
   * Default: off.
   */
  selfCheck?: boolean;
}

/** @experimental Error codes of {@link YHeadlessError}. */
export type YHeadlessErrorCode =
  /** The state has no layout record yet: seed it first. */
  | 'not-initialized'
  /**
   * The binding is read only: the document uses a newer layout, content
   * without a layout record, or node types the editor does not register.
   */
  | 'read-only'
  /** The update writes to a root that is not allowed, or cannot be resolved. */
  | 'foreign-roots';

/** @experimental The error the headless helpers throw when they refuse. */
export class YHeadlessError extends Error {
  readonly code: YHeadlessErrorCode;
  constructor(code: YHeadlessErrorCode, message: string) {
    super(message);
    this.name = 'YHeadlessError';
    this.code = code;
  }
}

/** @internal */
export interface CreateHeadlessYEditorOptions extends HeadlessYConfig {
  /** A Yjs update (usually the stored state) to load before binding. */
  state?: Uint8Array | null;
}

/**
 * @internal A headless editor bound to its own Yjs 14 document, with
 * collaborative undo off. `dispose` (or `using`) releases the binding, the
 * editor and the document.
 */
export interface HeadlessYEditor extends Disposable {
  readonly editor: LexicalEditor;
  readonly doc: Doc;
  readonly binding: YBinding;
  /** Warnings reported so far, oldest first. */
  readonly warnings: readonly LexicalWarning[];
  dispose(): void;
}

/** Follow-up updates committed after an update before giving up on them. */
export const MAX_FOLLOW_UPS = 8;

/** @internal */
export interface OpenedHeadlessYEditor {
  readonly handle: HeadlessYEditor;
  /** Updates written since `state` was loaded (only when recording). */
  readonly writes: Uint8Array<ArrayBuffer>[];
  /**
   * Run `$fn` in one discrete update, then commit the updates it made
   * listeners schedule (at most {@link MAX_FOLLOW_UPS}); rethrow its error
   * after the update.
   */
  runUpdate(fn: () => void, tag?: string | string[]): void;
}

/**
 * @internal Open `options.state` in a headless editor and binding. Throws a
 * {@link YHeadlessError} (`'read-only'`) when the binding cannot write the
 * document. With `record`, every update written after the state was loaded
 * (opening included) is collected in `writes`.
 */
export function openHeadlessYEditor(
  options: CreateHeadlessYEditorOptions,
  record = false,
): OpenedHeadlessYEditor {
  // While an internal update runs, errors are collected and rethrown after
  // it, so Lexical restores the previous state (nothing is written).
  let captured: Error[] | null = null;
  const onError = (error: Error) => {
    if (captured === null) {
      throw error;
    }
    captured.push(error);
  };
  // The binding, Lexical and the extensions report through the editor's
  // onWarn: everything is collected here, with the helpers' own. A warning
  // never refuses an edit, so this never throws (a throwing config.onWarn
  // included: its error is rethrown in a microtask).
  const warnings: LexicalWarning[] = [];
  const onWarn = options.onWarn;
  const report = (warning: LexicalWarning) => {
    warnings.push(warning);
    try {
      if (onWarn) {
        onWarn(warning);
      } else if (process.env.NODE_ENV !== 'production') {
        console.warn(warning.message);
      }
    } catch (error) {
      queueMicrotask(() => {
        throw error;
      });
    }
  };
  const editor: LexicalEditorWithDispose = buildEditorFromExtensions(
    defineExtension({
      dependencies: options.extensions ? [...options.extensions] : [],
      name: '@lexical/y/headless',
      nodes: options.nodes,
      onError,
      onWarn: (error: Error) =>
        report(
          error instanceof LexicalWarning
            ? error
            : new LexicalWarning(EDITOR_WARNING, error.message, {error}),
        ),
    }),
  );
  // No garbage collection: the root check resolves deleted items. The
  // binding keeps the client id in range (`clientIDRange`) from `start()`;
  // nothing is written before that.
  const doc = new Doc({gc: false});
  if (options.state) {
    applyUpdate(doc, options.state);
  }
  const writes: Uint8Array<ArrayBuffer>[] = [];
  const collect = (update: Uint8Array) => {
    writes.push(new Uint8Array(update));
  };
  if (record) {
    doc.on('update', collect);
  }
  const binding = new YBinding(editor, doc, {
    captureTimeout: null,
    clientIDRange: options.clientIDRange,
    root: doc.get(options.root || DEFAULT_ROOT_NAME),
    selfCheck: options.selfCheck,
  });
  let disposed = false;
  const dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    doc.off('update', collect);
    binding.dispose();
    editor.dispose();
    doc.destroy();
  };
  const updateOnce = (fn: () => void, tag?: string | string[]) => {
    const errors: Error[] = [];
    captured = errors;
    try {
      editor.update(fn, {discrete: true, tag});
    } finally {
      captured = null;
    }
    if (errors.length > 0) {
      throw errors[0];
    }
  };
  const hasPending = () =>
    editor._pendingEditorState !== null || editor._updates.length > 0;
  const runUpdate = (fn: () => void, tag?: string | string[]) => {
    updateOnce(fn, tag);
    // Commit the updates this one made listeners schedule (an extension that
    // gives new blocks ids, the binding's refreshes), so that what they write
    // is part of this edit rather than lost when the editor is disposed.
    for (let i = 0; hasPending(); i++) {
      if (i === MAX_FOLLOW_UPS) {
        report(
          new LexicalWarning(
            FOLLOW_UPS_EXHAUSTED_WARNING,
            `@lexical/y: listeners kept scheduling updates; after ${MAX_FOLLOW_UPS} follow-up updates the rest were not committed and are not part of the result.`,
            {limit: MAX_FOLLOW_UPS},
          ),
        );
        break;
      }
      updateOnce(() => {}, tag);
    }
  };
  try {
    binding.start();
    // Commit any update the first read scheduled (refreshes, repairs).
    runUpdate(() => {});
  } catch (error) {
    dispose();
    throw error;
  }
  if (binding.status === 'readonly') {
    dispose();
    throw new YHeadlessError(
      'read-only',
      `@lexical/y: the document is read only here${
        warnings.length > 0
          ? ': ' + warnings.map(warning => warning.message).join(' ')
          : '.'
      }`,
    );
  }
  return {
    handle: {
      binding,
      dispose,
      doc,
      editor,
      [Symbol.dispose]: dispose,
      warnings,
    },
    runUpdate,
    writes,
  };
}

/**
 * @internal A headless editor bound to a new Yjs 14 document holding
 * `state`, after the layout record has been read. Throws a
 * {@link YHeadlessError} (`'read-only'`) when the binding cannot write the
 * document (a newer layout, unknown node types). With no state (or an empty
 * one) the binding is `'pending'`: write content and call
 * `binding.initialize()` to seed it. Not exported from
 * `@lexical/y/headless`: servers use `seedYState`, `editYState` and
 * `readYState`; the tests use it to inspect a handle.
 */
export function createHeadlessYEditor(
  options: CreateHeadlessYEditorOptions = {},
): HeadlessYEditor {
  return openHeadlessYEditor(options).handle;
}
