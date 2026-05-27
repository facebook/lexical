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
  $getRoot,
  $isElementNode,
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
 * The node types affected by an override, or `all` when the override targets
 * everything (`'*'`) or uses a guard predicate we can not enumerate by type.
 */
function overrideTypes(o: AnyDOMRenderMatch): {all: boolean; types: string[]} {
  if (o.nodes === '*') {
    return {all: true, types: []};
  }
  const types: string[] = [];
  for (const match of o.nodes) {
    const klass = match as Klass<LexicalNode>;
    if ($isLexicalNode(klass.prototype)) {
      types.push(klass.getType());
    } else {
      // A guard predicate can match a subset we can not enumerate by type.
      return {all: true, types: []};
    }
  }
  return {all: false, types};
}

interface ChangeAnalysis {
  /** Some changed override affects live reconciliation. */
  rerender: boolean;
  /** Some changed override changes element structure (`$createDOM`/`$getDOMSlot`). */
  recreate: boolean;
  /** The change affects every node type. */
  all: boolean;
  /** The specific node types affected (when not `all`). */
  types: Set<string>;
}

function analyzeChange(changed: readonly AnyDOMRenderMatch[]): ChangeAnalysis {
  const result: ChangeAnalysis = {
    all: false,
    recreate: false,
    rerender: false,
    types: new Set(),
  };
  for (const o of changed) {
    const structural = Boolean(o.$createDOM || o.$getDOMSlot);
    const reconcile = structural || Boolean(o.$updateDOM || o.$decorateDOM);
    if (!reconcile) {
      // Export-only hooks ($exportDOM/$shouldInclude/…) do not affect the
      // live DOM; recompiling the resident config is enough.
      continue;
    }
    result.rerender = true;
    if (structural) {
      result.recreate = true;
    }
    const {all, types} = overrideTypes(o);
    if (all) {
      result.all = true;
    } else {
      for (const t of types) {
        result.types.add(t);
      }
    }
  }
  return result;
}

function $markDirtyByType(all: boolean, types: ReadonlySet<string>): void {
  const stack: LexicalNode[] = [$getRoot()];
  while (stack.length > 0) {
    const node = stack.pop() as LexicalNode;
    if (all || types.has(node.getType())) {
      node.markDirty();
    }
    if ($isElementNode(node)) {
      for (const child of node.getChildren()) {
        stack.push(child);
      }
    }
  }
}

/**
 * Per-editor runtime backing {@link DOMRenderExtension}'s conditional
 * overrides and imperative editor context. See {@link DOMRenderRuntime}.
 *
 * @internal
 */
export class DOMRenderRuntimeImpl implements DOMRenderRuntime {
  readonly editor: LexicalEditor;
  /** `{...editorConfig, dom: baseDom}` — the clean base for every recompile. */
  readonly recompileConfig: InitialEditorConfig;
  readonly overrides: readonly AnyDOMRenderMatch[];
  readonly editorContext: RenderContextRecord;
  readonly hasSessionGates: boolean;
  installed: readonly AnyDOMRenderMatch[];

  /** Node types (or all) to recreate (force `$updateDOM` → true) for one pass. */
  private forceRecreateAll = false;
  private readonly forceRecreateTypes = new Set<string>();
  /** Memoized session configs keyed by the set of session-disabled overrides. */
  private readonly sessionCache = new Map<string, EditorDOMRenderConfig>();

  constructor(
    editor: LexicalEditor,
    recompileConfig: InitialEditorConfig,
    overrides: readonly AnyDOMRenderMatch[],
    editorContext: RenderContextRecord,
  ) {
    this.editor = editor;
    this.recompileConfig = recompileConfig;
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
    this.editor._config.dom = this.compileInstalled(next);

    const {rerender, recreate, all, types} = analyzeChange(changed);
    if (!rerender) {
      return;
    }
    if (recreate) {
      if (all) {
        this.forceRecreateAll = true;
      } else {
        for (const t of types) {
          this.forceRecreateTypes.add(t);
        }
      }
    }
    // `discrete` so the toggle re-renders synchronously, like the initial mount.
    this.editor.update(() => $markDirtyByType(all, types), {
      discrete: true,
      onUpdate: () => {
        this.forceRecreateAll = false;
        this.forceRecreateTypes.clear();
      },
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
      cfg = compileDOMRenderConfigOverrides(this.recompileConfig, {
        overrides: sessionSet,
      });
      this.sessionCache.set(key, cfg);
    }
    return cfg;
  }

  private compileInstalled(
    installed: readonly AnyDOMRenderMatch[],
  ): EditorDOMRenderConfig {
    const dom = compileDOMRenderConfigOverrides(this.recompileConfig, {
      overrides: installed as AnyDOMRenderMatch[],
    });
    // Honor a transient force-recreate by reporting that the structurally
    // affected nodes need to be unmounted and recreated through the new
    // config, since the override that knew how to revert its own DOM may have
    // just been removed.
    const base = dom.$updateDOM;
    dom.$updateDOM = (nextNode, prevNode, el, editor) => {
      if (
        this.forceRecreateAll ||
        this.forceRecreateTypes.has(nextNode.getType())
      ) {
        return true;
      }
      return base(nextNode, prevNode, el, editor);
    };
    return dom;
  }
}
