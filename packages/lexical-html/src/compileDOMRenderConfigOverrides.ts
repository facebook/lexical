/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {getKnownTypesAndNodes} from '@lexical/extension';
import {
  $isLexicalNode,
  DEFAULT_EDITOR_DOM_CONFIG,
  type EditorDOMRenderConfig,
  getStaticNodeConfig,
  InitialEditorConfig,
  Klass,
  LexicalEditor,
  type LexicalNode,
} from 'lexical';
import invariant from 'shared/invariant';

import {ALWAYS_TRUE} from './constants';
import {AnyDOMRenderMatch, DOMRenderConfig, DOMRenderMatch} from './types';

interface TypeRecord {
  readonly klass: Klass<LexicalNode>;
  readonly types: {[NodeAndSubclasses in string]?: boolean};
}

type TypeTree = {
  [NodeType in string]?: TypeRecord;
};

export function buildTypeTree(
  editorConfig: Pick<InitialEditorConfig, 'nodes'>,
): TypeTree {
  const t: TypeTree = {};
  const {nodes} = getKnownTypesAndNodes(editorConfig);
  for (const klass of nodes) {
    const type = klass.getType();
    t[type] = {klass, types: {}};
  }
  for (const baseRec of Object.values(t)) {
    if (baseRec) {
      const baseType = baseRec.klass.getType();
      for (
        let {klass} = baseRec;
        $isLexicalNode(klass.prototype);
        klass = Object.getPrototypeOf(klass)
      ) {
        const {ownNodeType} = getStaticNodeConfig(klass);
        const superRec = ownNodeType && t[ownNodeType];
        if (superRec) {
          superRec.types[baseType] = true;
        }
      }
    }
  }
  return t;
}

type PredicateOrTypes =
  | ((node: LexicalNode) => boolean)
  | {[NodeType in string]?: true};
type TypeRender<T> = {[NodeType in string]?: T[]};
type AnyRender<T> =
  | readonly [(node: LexicalNode) => boolean, T]
  | readonly ['types', TypeRender<T>];

type PreEditorDOMRenderConfig = {
  [K in keyof EditorDOMRenderConfig]: AnyRender<AnyDOMRenderMatch[K]>[];
};

function buildNodePredicate<T extends LexicalNode>(klass: Klass<T>) {
  return (node: LexicalNode): node is T => node instanceof klass;
}

function getPredicate(
  typeTree: TypeTree,
  {nodes}: DOMRenderMatch<LexicalNode>,
): {[NodeType in string]?: true} | ((node: LexicalNode) => boolean) {
  if (nodes === '*') {
    return ALWAYS_TRUE;
  }
  let types: undefined | {[NodeType in string]?: true} = {};
  const predicates: ((node: LexicalNode) => boolean)[] = [];
  for (const klassOrPredicate of nodes) {
    if ('getType' in klassOrPredicate) {
      const type = klassOrPredicate.getType();
      if (types) {
        const tree = typeTree[type];
        invariant(
          tree !== undefined,
          'Node class %s with type %s not registered in editor',
          klassOrPredicate.name,
          type,
        );
        types = Object.assign(types, tree.types);
      }
      predicates.push(buildNodePredicate(klassOrPredicate));
    } else {
      types = undefined;
      predicates.push(klassOrPredicate);
    }
  }
  if (types) {
    return types;
  } else if (predicates.length === 1) {
    return predicates[0];
  }
  return (node: LexicalNode): boolean => {
    for (const predicate of predicates) {
      if (predicate(node)) {
        return true;
      }
    }
    return false;
  };
}

function makePrerender(): PreEditorDOMRenderConfig {
  return {
    $createDOM: [],
    $exportDOM: [],
    $extractWithChild: [],
    $getDOMSlot: [],
    $shouldExclude: [],
    $shouldInclude: [],
    $updateDOM: [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AccFn<T, N extends LexicalNode, Args extends any[]> = (
  node: N,
  ...rest: [...Args, editor: LexicalEditor]
) => T;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GetOverrideFn<T, N extends LexicalNode, Args extends any[]> = (
  n: N,
) => undefined | OverrideFn<T, N, Args>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OverrideFn<T, N extends LexicalNode, Args extends any[]> = (
  node: N,
  ...rest: [...Args, $next: () => T, editor: LexicalEditor]
) => T;

function ignoreNext2<T, N extends LexicalNode>(
  acc: AccFn<T, N, []>,
): OverrideFn<T, N, []> {
  return (node: N, _$next: () => T, editor: LexicalEditor) => acc(node, editor);
}
function ignoreNext3<T, N extends LexicalNode, A>(
  acc: AccFn<T, N, [A]>,
): OverrideFn<T, N, [A]> {
  return (node: N, a: A, _$next: () => T, editor: LexicalEditor) =>
    acc(node, a, editor);
}
function ignoreNext4<T, N extends LexicalNode, A, B>(
  acc: AccFn<T, N, [A, B]>,
): OverrideFn<T, N, [A, B]> {
  return (node: N, a: A, b: B, _$next: () => T, editor: LexicalEditor) =>
    acc(node, a, b, editor);
}
function ignoreNext5<T, N extends LexicalNode, A, B, C>(
  acc: AccFn<T, N, [A, B, C]>,
): OverrideFn<T, N, [A, B, C]> {
  return (node: N, a: A, b: B, c: C, _$next: () => T, editor: LexicalEditor) =>
    acc(node, a, b, c, editor);
}

function merge2<T, N extends LexicalNode>(
  $acc: AccFn<T, N, []>,
  $getOverride: GetOverrideFn<T, N, []>,
): typeof $acc {
  return (node, editor) => {
    const $next = () => $acc(node, editor);
    const $override = $getOverride(node);
    return $override ? $override(node, $next, editor) : $next();
  };
}

function merge3<T, N extends LexicalNode, A>(
  acc: AccFn<T, N, [A]>,
  $getOverride: GetOverrideFn<T, N, [A]>,
): typeof acc {
  return (node, a, editor) => {
    const $next = () => acc(node, a, editor);
    const $override = $getOverride(node);
    return $override ? $override(node, a, $next, editor) : $next();
  };
}

function merge4<T, N extends LexicalNode, A, B>(
  $acc: AccFn<T, N, [A, B]>,
  $getOverride: GetOverrideFn<T, N, [A, B]>,
): typeof $acc {
  return (node, a, b, editor) => {
    const $next = () => $acc(node, a, b, editor);
    const $override = $getOverride(node);
    return $override ? $override(node, a, b, $next, editor) : $next();
  };
}

function merge5<T, N extends LexicalNode, A, B, C>(
  acc: AccFn<T, N, [A, B, C]>,
  $getOverride: GetOverrideFn<T, N, [A, B, C]>,
): typeof acc {
  return (node, a, b, c, editor) => {
    const $next = () => acc(node, a, b, c, editor);
    const $override = $getOverride(node);
    return $override ? $override(node, a, b, c, $next, editor) : $next();
  };
}

function compilePrerenderKey<K extends keyof PreEditorDOMRenderConfig>(
  prerender: PreEditorDOMRenderConfig,
  k: K,
  defaults: EditorDOMRenderConfig,
  mergeFunction: (
    $acc: EditorDOMRenderConfig[K],
    $getOverride: (node: LexicalNode) => AnyDOMRenderMatch[K],
  ) => typeof $acc,
  ignoreNextFunction: (fn: EditorDOMRenderConfig[K]) => AnyDOMRenderMatch[K],
): void {
  let acc = defaults[k];
  for (const pair of prerender[k]) {
    if (typeof pair[0] === 'function') {
      const [$predicate, $override] = pair;
      acc = mergeFunction(
        acc,
        (node) => ($predicate(node) && $override) || undefined,
      );
    } else {
      const typeOverrides = pair[1];
      const compiled: Record<string, undefined | EditorDOMRenderConfig[K]> = {};
      for (const type in typeOverrides) {
        const arr = typeOverrides[type];
        if (arr) {
          compiled[type] = arr.reduce(
            ($acc, $override) => mergeFunction($acc, () => $override),
            acc,
          );
        }
      }
      acc = mergeFunction(acc, (node) => {
        const f = compiled[node.getType()];
        return f && ignoreNextFunction(f);
      });
    }
  }
  defaults[k] = acc;
}

function addOverride<K extends keyof PreEditorDOMRenderConfig>(
  prerender: PreEditorDOMRenderConfig,
  k: K,
  predicateOrTypes: PredicateOrTypes,
  override: AnyDOMRenderMatch[K],
): void {
  if (!override) {
    return;
  }
  const arr = prerender[k];
  if (typeof predicateOrTypes === 'function') {
    arr.push([predicateOrTypes, override]);
  } else {
    const last = arr[arr.length - 1];
    let types: TypeRender<AnyDOMRenderMatch[K]>;
    if (last && last[0] === 'types') {
      types = last[1];
    } else {
      types = {};
      arr.push(['types', types]);
    }
    for (const type in predicateOrTypes) {
      const typeArr = types[type] || [];
      types[type] = typeArr;
      typeArr.push(override);
    }
  }
}

export function precompileDOMRenderConfigOverrides(
  editorConfig: Pick<InitialEditorConfig, 'nodes'>,
  overrides: DOMRenderConfig['overrides'],
): PreEditorDOMRenderConfig {
  const typeTree = buildTypeTree(editorConfig);
  const prerender = makePrerender();
  for (const override of overrides) {
    const predicateOrTypes = getPredicate(typeTree, override);
    for (const k_ in prerender) {
      const k = k_ as keyof typeof prerender;
      addOverride(prerender, k, predicateOrTypes, override[k]);
    }
  }
  return prerender;
}

export function compileDOMRenderConfigOverrides(
  editorConfig: InitialEditorConfig,
  {overrides}: DOMRenderConfig,
): EditorDOMRenderConfig {
  const prerender = precompileDOMRenderConfigOverrides(editorConfig, overrides);
  const dom = {
    ...DEFAULT_EDITOR_DOM_CONFIG,
    ...editorConfig.dom,
  };
  compilePrerenderKey(prerender, '$createDOM', dom, merge2, ignoreNext2);
  compilePrerenderKey(prerender, '$exportDOM', dom, merge2, ignoreNext2);
  compilePrerenderKey(prerender, '$extractWithChild', dom, merge5, ignoreNext5);
  compilePrerenderKey(prerender, '$getDOMSlot', dom, merge3, ignoreNext3);
  compilePrerenderKey(prerender, '$shouldExclude', dom, merge3, ignoreNext3);
  compilePrerenderKey(prerender, '$shouldInclude', dom, merge3, ignoreNext3);
  compilePrerenderKey(prerender, '$updateDOM', dom, merge4, ignoreNext4);
  return dom;
}
