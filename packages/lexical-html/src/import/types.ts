/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {DOMImportContextSymbol} from '../constants';
import type {
  AnyContextConfigPairOrUpdater,
  ContextConfig,
  ContextRecord,
} from '../types';
import type {LexicalEditor, LexicalNode} from 'lexical';

/**
 * Phantom-typed branding so consumers cannot construct or mutate a
 * {@link CompiledSelector} directly; the only way to obtain one is via the
 * {@link sel} builder or {@link parseSelector}. The actual runtime shape is
 * an internal implementation detail (see `./sel`).
 *
 * @experimental
 */
export declare const NodeBrand: unique symbol;
/** @experimental */
export declare const CaptureBrand: unique symbol;

/**
 * An opaque, compiled selector used as the `match` field of a
 * {@link DOMImportRule}. The two phantom type parameters carry the matched
 * Node subtype (`N`) and a record of named regex captures (`C`) so the
 * importer body gets correctly-typed `ctx` and `node` arguments without
 * casts.
 *
 * @experimental
 */
export interface CompiledSelector<
  N extends Node = Node,
  C extends Record<string, RegExpMatchArray> = Record<string, RegExpMatchArray>,
> {
  readonly [NodeBrand]?: N;
  readonly [CaptureBrand]?: C;
}

/**
 * The Node subtype matched by a selector (e.g. `HTMLAnchorElement` for
 * `sel.tag('a')`, `Text` for `sel.text()`).
 *
 * @experimental
 */
export type NodeOfSelector<S> =
  S extends CompiledSelector<infer N, Record<string, RegExpMatchArray>>
    ? N
    : Node;

/**
 * The named-capture map for a selector.
 *
 * @experimental
 */
export type CapturesOfSelector<S> =
  S extends CompiledSelector<Node, infer C> ? C : Record<string, never>;

/**
 * Options bag for {@link ElementSelectorBuilder.attr} when the value is a
 * regex. Future options will be added here without breaking existing
 * call-sites.
 *
 * @experimental
 */
export interface AttrMatchOptions<K extends string = string> {
  /**
   * If provided, the {@link RegExpMatchArray} from the successful match is
   * stored on `ctx.captures[capture]` for the importer to consume — saving
   * a second regex execution.
   */
  readonly capture?: K;
}

/**
 * Options bag for {@link ElementSelectorBuilder.styleAny} when the value is a
 * regex. See {@link AttrMatchOptions} for capture semantics.
 *
 * @experimental
 */
export interface StyleMatchOptions<K extends string = string> {
  readonly capture?: K;
}

/**
 * Fluent builder for an element selector. The two type parameters carry the
 * matched element type and the named-capture map; each call refines them.
 *
 * The builder itself implements {@link CompiledSelector} so it can be used
 * directly as the `match` field of a rule — no `.build()` call needed.
 *
 * @experimental
 */
export interface ElementSelectorBuilder<
  E extends HTMLElement,
  C extends Record<string, RegExpMatchArray> = Record<string, never>,
> extends CompiledSelector<E, C> {
  /** Require every listed class to be present on the element. */
  classAll(...classes: readonly string[]): ElementSelectorBuilder<E, C>;
  /** Require at least one of the listed classes to be present. */
  classAny(...classes: readonly string[]): ElementSelectorBuilder<E, C>;
  /** Require the attribute to be present (any value). */
  attr(name: string, value: true): ElementSelectorBuilder<E, C>;
  /** Require the attribute to equal the given string. */
  attr(name: string, value: string): ElementSelectorBuilder<E, C>;
  /**
   * Require the attribute to match the given regex. With
   * `{capture: 'name'}` the match result is exposed on
   * `ctx.captures.name`.
   */
  attr<const O extends AttrMatchOptions>(
    name: string,
    value: RegExp,
    options?: O,
  ): ElementSelectorBuilder<
    E,
    O extends {capture: infer K} ? C & Record<K & string, RegExpMatchArray> : C
  >;
  /** Require the inline-style declaration to equal `value`. */
  styleAny(prop: string, value: string): ElementSelectorBuilder<E, C>;
  /** Require the inline-style declaration to match `value`. */
  styleAny<const O extends StyleMatchOptions>(
    prop: string,
    value: RegExp,
    options?: O,
  ): ElementSelectorBuilder<
    E,
    O extends {capture: infer K} ? C & Record<K & string, RegExpMatchArray> : C
  >;
}

/**
 * Argument to {@link DOMImportContext.branch} / `$importChildren({context})`
 * — see {@link ContextConfigPair} / {@link ContextConfigUpdater}.
 *
 * @experimental
 */
export type ImportContextPairOrUpdater = AnyContextConfigPairOrUpdater<
  typeof DOMImportContextSymbol
>;

/**
 * A typed context-state key for the import pipeline. Create with
 * {@link createImportState}.
 *
 * @experimental
 */
export type ImportStateConfig<V> = ContextConfig<
  typeof DOMImportContextSymbol,
  V
>;

/**
 * Context exposed to a rule's `$import` function. Mirrors the existing render
 * context (see {@link RenderContext}) but is import-scoped.
 *
 * @experimental
 */
export interface DOMImportContext<
  C extends Record<string, RegExpMatchArray> = Record<string, never>,
> {
  /** The editor driving this import. */
  readonly editor: LexicalEditor;
  /** Captures from this rule's selector. Fresh per rule invocation. */
  readonly captures: Readonly<C>;

  /** Read a typed context value. */
  get<V>(cfg: ImportStateConfig<V>): V;

  /**
   * Recursively import every child of `parent` and return the produced
   * lexical nodes, optionally enforcing a {@link ChildSchema} and/or
   * branching the import context for the duration of the call (via
   * `opts.context`).
   */
  $importChildren(parent: ParentNode, opts?: ImportChildrenOpts): LexicalNode[];

  /**
   * Recursively import a single DOM node.
   */
  $importOne(node: Node, opts?: ImportNodeOpts): LexicalNode[];
}

/**
 * Options accepted by {@link DOMImportContext.$importChildren}. The combination
 * of `schema`, `$onChild`, and `$after` is sufficient to express every
 * child-handling pattern in the legacy `forChild` / `after` / wrap-continuous
 * machinery.
 *
 * @experimental
 */
export interface ImportChildrenOpts {
  /**
   * How to validate and (re)package produced children. Defaults to whichever
   * schema the parent's importer passed; the top-level entry uses
   * {@link BlockSchema}.
   */
  readonly schema?: ChildSchema;
  /**
   * Called for each produced lexical child immediately after its rule
   * returned, with the chance to substitute or drop it. Equivalent to the
   * old `forChild` hook but scoped to one `$importChildren` call.
   */
  readonly $onChild?: (child: LexicalNode) => LexicalNode | null | undefined;
  /**
   * Called once with the full child array after all DOM children have been
   * recursively imported but before {@link ChildSchema.packageRun} is
   * applied. Equivalent to the old `after` hook.
   */
  readonly $after?: (children: LexicalNode[]) => LexicalNode[];
  /** Context overrides scoped to the children traversal. */
  readonly context?: readonly ImportContextPairOrUpdater[];
}

/** @experimental */
export interface ImportNodeOpts {
  readonly context?: readonly ImportContextPairOrUpdater[];
}

/**
 * A {@link ChildSchema} encodes which lexical nodes a parent accepts as
 * children and how to package or reject the rest. The legacy
 * `wrapContinuousInlines` / `ArtificialNode__DO_NOT_USE` logic is the
 * `BlockSchema` and `NestedBlockSchema` cases of this primitive.
 *
 * @experimental
 */
export interface ChildSchema {
  /** Optional name for debug output. */
  readonly name?: string;
  /** Returns `true` if `child` is a valid child of `parent` in this position. */
  accepts(child: LexicalNode, parent: LexicalNode | null): boolean;
  /**
   * Package a maximal run of non-accepted siblings into zero or more
   * accepted nodes. If omitted, {@link ChildSchema.onReject} is consulted
   * instead.
   */
  packageRun?(
    rejected: LexicalNode[],
    parent: LexicalNode | null,
    domParent: Node | null,
  ): LexicalNode[];
  /**
   * Strategy for non-accepted children when `packageRun` is missing or
   * returns an empty array. `'hoist'` lifts them up as siblings of the
   * parent; `'drop'` silently removes them.
   */
  readonly onReject?: 'hoist' | 'drop';
  /**
   * Final pass over the assembled child list (after `packageRun`). Returns
   * the children to actually attach. Use to enforce structural invariants
   * (e.g. drop empty runs, pad short table rows).
   */
  finalize?(children: LexicalNode[], parent: LexicalNode | null): LexicalNode[];
}

/**
 * The middleware signature of an import rule. Call `$next()` to delegate to
 * the next-matching rule for this node (returning its result, which may then
 * be inspected or wrapped); return `[]` to drop the node.
 *
 * @experimental
 */
export type DOMImportFn<
  E extends Node,
  C extends Record<string, RegExpMatchArray> = Record<string, never>,
> = (
  ctx: DOMImportContext<C>,
  node: E,
  $next: () => readonly LexicalNode[],
) => readonly LexicalNode[];

/**
 * An importer for a DOM node, dispatched by `match` and implemented by
 * `$import`.
 *
 * @experimental
 */
export interface DOMImportRule<S extends CompiledSelector = CompiledSelector> {
  /**
   * Optional identifier surfaced in dev-mode logs, error messages, and
   * introspection devtools. Convention: `'@scope/package/rule-id'` for
   * library rules.
   */
  readonly name?: string;
  /** A {@link CompiledSelector} produced by the {@link sel} builder. */
  readonly match: S;
  /** Middleware that converts the matched DOM node into lexical nodes. */
  readonly $import: DOMImportFn<NodeOfSelector<S>, CapturesOfSelector<S>>;
}

/** @experimental */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDOMImportRule = DOMImportRule<any>;

/**
 * Per-call options to the extension's `$generateNodesFromDOM`.
 *
 * @experimental
 */
export interface GenerateNodesFromDOMOptions {
  /**
   * Context pairs/updaters applied for the duration of this import only —
   * use to communicate per-call info such as the {@link ImportSource}.
   */
  readonly context?: readonly ImportContextPairOrUpdater[];
}

/**
 * Output of {@link DOMImportExtension}.
 *
 * @experimental
 */
export interface DOMImportExtensionOutput {
  /**
   * Convert a {@link Document} or {@link ParentNode} into lexical nodes,
   * using the dispatcher compiled from this extension's configured
   * {@link DOMImportRule}s.
   *
   * Must be called within an `editor.update()` or `editor.read()` because
   * the importers may invoke `$create...` helpers.
   */
  $generateNodesFromDOM(
    dom: Document | ParentNode,
    options?: GenerateNodesFromDOMOptions,
  ): LexicalNode[];
  /** @internal */
  readonly defaults: undefined | ContextRecord<typeof DOMImportContextSymbol>;
}
