/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {
  AnyDOMRenderMatch,
  AnyRenderStateConfigPairOrUpdater,
  ContextRecord,
  DOMRenderRuntime,
  RenderContextReader,
  RenderStateConfig,
} from './types';
import type {
  EditorDOMRenderConfig,
  InitialEditorConfig,
  Klass,
  LexicalEditor,
  LexicalNode,
} from 'lexical';

import {
  $fullReconcile,
  $isLexicalNode,
  DEFAULT_EDITOR_DOM_CONFIG,
} from 'lexical';

import {compileDOMRenderConfigOverrides} from './compileDOMRenderConfigOverrides';
import {DOMRenderContextSymbol} from './constants';
import {
  contextFromPairs,
  getContextRecord,
  getContextValue,
} from './ContextRecord';

type RenderContextRecord = ContextRecord<typeof DOMRenderContextSymbol>;

function makeReader(record: RenderContextRecord): RenderContextReader {
  return {
    get<V>(cfg: RenderStateConfig<V>): V {
      return getContextValue(record, cfg);
    },
  };
}

/**
 * The mutable, writable editor-level context record. Reads of a render state
 * during reconciliation (and as the base layer of a session) fall through to
 * this record, and it is the layer the `disabledForEditor` predicates read.
 *
 * @internal
 */
export function createEditorContextRecord(
  contextDefaults: readonly AnyRenderStateConfigPairOrUpdater[],
): RenderContextRecord {
  const parent = Object.create(null) as RenderContextRecord;
  return contextFromPairs(contextDefaults, parent) || parent;
}

/**
 * Filter the configured overrides down to those that are resident in the
 * editor's render config, removing any whose `disabledForEditor` predicate
 * returns `true` for the given editor context.
 *
 * @internal
 */
export function filterEditorInstalled(
  overrides: readonly AnyDOMRenderMatch[],
  record: RenderContextRecord,
): AnyDOMRenderMatch[] {
  const reader = makeReader(record);
  return overrides.filter(
    o => !(o.disabledForEditor && o.disabledForEditor(reader)),
  );
}

function sameOverrides(
  a: readonly AnyDOMRenderMatch[],
  b: readonly AnyDOMRenderMatch[],
): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function symmetricDiff(
  prev: readonly AnyDOMRenderMatch[],
  next: readonly AnyDOMRenderMatch[],
): AnyDOMRenderMatch[] {
  const prevSet = new Set(prev);
  const nextSet = new Set(next);
  const changed: AnyDOMRenderMatch[] = [];
  for (const o of prev) {
    if (!nextSet.has(o)) {
      changed.push(o);
    }
  }
  for (const o of next) {
    if (!prevSet.has(o)) {
      changed.push(o);
    }
  }
  return changed;
}

/**
 * Build a predicate matching the nodes an override targets — `'*'` matches
 * everything, a node class matches by `instanceof`, and a guard is used as-is.
 */
function nodeMatcher(o: AnyDOMRenderMatch): (node: LexicalNode) => boolean {
  if (o.nodes === '*') {
    return () => true;
  }
  const matchers = o.nodes.map(match => {
    const klass = match as Klass<LexicalNode>;
    return $isLexicalNode(klass.prototype)
      ? (node: LexicalNode) => node instanceof klass
      : (match as (node: LexicalNode) => boolean);
  });
  return node => matchers.some(f => f(node));
}

/**
 * Inspect the overrides added/removed by a context change.
 *
 * @returns `rerender` — whether any changed override affects live
 * reconciliation (export-only hooks need none); and `recreate` — a predicate
 * matching nodes whose DOM must be unmounted and recreated (structural
 * `$createDOM`/`$getDOMSlot` overrides), or `null` when re-running
 * `$updateDOM`/`$decorateDOM` in place is enough.
 */
function analyzeChange(changed: readonly AnyDOMRenderMatch[]): {
  recreate: ((node: LexicalNode) => boolean) | null;
  rerender: boolean;
} {
  let rerender = false;
  const structural: ((node: LexicalNode) => boolean)[] = [];
  for (const o of changed) {
    const isStructural = Boolean(o.$createDOM || o.$getDOMSlot);
    if (!(isStructural || o.$updateDOM || o.$decorateDOM)) {
      // Export-only hooks ($exportDOM/$shouldInclude/…) don't affect the live
      // DOM; recompiling the resident config is enough.
      continue;
    }
    rerender = true;
    if (isStructural) {
      structural.push(nodeMatcher(o));
    }
  }
  return {
    recreate:
      structural.length === 0 ? null : node => structural.some(f => f(node)),
    rerender,
  };
}

/**
 * Per-editor runtime backing {@link DOMRenderExtension}'s conditional
 * overrides and imperative editor context. See {@link DOMRenderRuntime}.
 *
 * @internal
 */
export class DOMRenderRuntimeImpl implements DOMRenderRuntime {
  readonly editor: LexicalEditor;
  /**
   * The `nodes` and base `dom` captured at `init` (before `dom` was
   * overwritten with the compiled config) — the clean base for every recompile.
   */
  readonly initialEditorConfig: Pick<InitialEditorConfig, 'nodes' | 'dom'>;
  readonly overrides: readonly AnyDOMRenderMatch[];
  readonly editorContext: RenderContextRecord;
  readonly hasSessionGates: boolean;
  installed: readonly AnyDOMRenderMatch[];

  /** Memoized session configs keyed by the set of session-disabled overrides. */
  private readonly sessionCache = new Map<string, EditorDOMRenderConfig>();

  constructor(
    editor: LexicalEditor,
    initialEditorConfig: Pick<InitialEditorConfig, 'nodes' | 'dom'>,
    overrides: readonly AnyDOMRenderMatch[],
    editorContext: RenderContextRecord,
  ) {
    this.editor = editor;
    this.initialEditorConfig = initialEditorConfig;
    this.overrides = overrides;
    this.editorContext = editorContext;
    this.installed = filterEditorInstalled(overrides, editorContext);
    this.hasSessionGates = overrides.some(o => o.disabledForSession);
  }

  setContextValue<V>(cfg: RenderStateConfig<V>, value: V): void {
    const prev = this.installed;
    this.editorContext[cfg.key] = value;
    const next = filterEditorInstalled(this.overrides, this.editorContext);
    if (sameOverrides(prev, next)) {
      return;
    }
    const changed = symmetricDiff(prev, next);
    this.installed = next;
    this.sessionCache.clear();
    const dom = compileDOMRenderConfigOverrides(this.initialEditorConfig, {
      overrides: next as AnyDOMRenderMatch[],
    });
    this.editor._config.dom = dom;

    const {rerender, recreate} = analyzeChange(changed);
    if (!rerender) {
      return;
    }

    // Re-render every node through the new config with a full reconcile, which
    // reuses the existing node instances (no node-map mutation, so no spurious
    // mutation/collaboration changes). For structural overrides the affected
    // nodes must be unmounted and recreated — the removed override may have
    // known how to revert its own DOM — so install a transient $updateDOM that
    // reports a recreate for matching nodes, restored once the reconcile is done.
    let restore: undefined | (() => void);
    if (recreate) {
      const base = dom.$updateDOM;
      dom.$updateDOM = (nextNode, prevNode, el, editor) =>
        recreate(nextNode) ? true : base(nextNode, prevNode, el, editor);
      restore = () => {
        dom.$updateDOM = base;
      };
    }
    // `discrete` so the toggle re-renders synchronously, like the initial mount.
    this.editor.update(() => $fullReconcile(), {
      discrete: true,
      onUpdate: restore,
      tag: 'history-merge',
    });
  }

  getSessionConfig(): EditorDOMRenderConfig {
    const resident = this.editor._config.dom || DEFAULT_EDITOR_DOM_CONFIG;
    if (!this.hasSessionGates) {
      return resident;
    }
    const reader = makeReader(
      getContextRecord(DOMRenderContextSymbol, this.editor) ||
        this.editorContext,
    );
    const disabledKeys: string[] = [];
    const sessionSet: AnyDOMRenderMatch[] = [];
    this.installed.forEach((o, i) => {
      if (o.disabledForSession && o.disabledForSession(reader)) {
        disabledKeys.push(String(i));
      } else {
        sessionSet.push(o);
      }
    });
    if (disabledKeys.length === 0) {
      return resident;
    }
    const key = disabledKeys.join(',');
    let cfg = this.sessionCache.get(key);
    if (!cfg) {
      cfg = compileDOMRenderConfigOverrides(this.initialEditorConfig, {
        overrides: sessionSet,
      });
      this.sessionCache.set(key, cfg);
    }
    return cfg;
  }
}
