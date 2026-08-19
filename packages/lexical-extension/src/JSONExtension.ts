/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $isLexicalNode,
  $withSerializationContext,
  defineExtension,
  type EditorState,
  type Klass,
  type LexicalNode,
  safeCast,
  SerializationContextCompact,
  SerializationContextOverride,
  type SerializedEditorState,
  type SerializedLexicalNode,
  shallowMergeConfig,
} from 'lexical';

/**
 * A node class (which also matches its subclasses, and is the cheaper option)
 * or a type guard such as `$isTextNode`.
 *
 * @experimental
 */
export type NodeMatch<T extends LexicalNode> =
  | Klass<T>
  | ((node: LexicalNode) => node is T);

/**
 * Overrides the JSON a node exports, for the nodes matched by `nodes`.
 *
 * The override is middleware: call `$next()` for the JSON the default
 * implementation (or a lower-priority override) produces and enhance it,
 * return your own JSON to replace it (a replacement is authoritative — the
 * node's own `exportJSON()` and any lower-priority overrides never run, and
 * for an element the walk does not append the live children), or return
 * `null` to omit the node and its subtree from the export.
 *
 * Do not update the editor state from an override; serialization is a
 * read-only operation.
 *
 * @experimental
 */
export interface SerializationOverride<T extends LexicalNode> {
  /**
   * `'*'` for every node, or an array of `NodeClass | $isNodeGuard`. Classes
   * are matched with `instanceof`, so they also match subclasses.
   */
  readonly nodes: '*' | readonly NodeMatch<T>[];
  readonly $exportJSON: (
    node: T,
    $next: () => SerializedLexicalNode,
  ) => SerializedLexicalNode | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnySerializationOverride = SerializationOverride<any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * A convenience function for type inference when constructing JSON overrides
 * for use with {@link JSONExtension}.
 *
 * @experimental
 * @__NO_SIDE_EFFECTS__
 */
export function jsonOverride(
  nodes: '*',
  config: Omit<SerializationOverride<LexicalNode>, 'nodes'>,
): SerializationOverride<LexicalNode>;
export function jsonOverride<T extends LexicalNode>(
  nodes: readonly NodeMatch<T>[],
  config: Omit<SerializationOverride<T>, 'nodes'>,
): SerializationOverride<T>;
export function jsonOverride(
  nodes: AnySerializationOverride['nodes'],
  config: Omit<AnySerializationOverride, 'nodes'>,
): AnySerializationOverride {
  return {...config, nodes};
}

export interface JSONConfig {
  /**
   * Export the compact form of the document by default: a property whose value
   * is strictly equal to its `json` schema default is omitted, as is the
   * deprecated `version` when it is `1`. Parsing restores both, so the compact
   * and legacy forms describe the same document. Defaults to false (the
   * legacy form).
   */
  compact: boolean;
  /**
   * Overrides built with {@link jsonOverride}, highest priority first: the
   * first matching override runs outermost, and its `$next()` runs the next
   * matching one, bottoming out at the node's own `exportJSON()`. Lower layers
   * run only when `$next()` is called; when a consulted lower layer omits the
   * node, the omission wins over whatever the outer override returns.
   */
  overrides: readonly AnySerializationOverride[];
}

/** Options for a single {@link JSONExtensionOutput.$exportJSON} call. */
export interface ExportJSONOptions {
  /** Override the extension's configured `compact` for this export. */
  readonly compact?: boolean;
}

export interface JSONExtensionOutput {
  /**
   * Serialize an editor state (the editor's current one by default) with this
   * extension's overrides and compaction applied.
   */
  $exportJSON: (
    editorState?: EditorState,
    options?: ExportJSONOptions,
  ) => SerializedEditorState;
  /**
   * Run `fn` with this extension's configured serialization context installed,
   * so any JSON export inside it — including `editorState.toJSON()` and the
   * `@lexical/clipboard` selection export — uses the configured overrides and
   * compaction. Use this to apply the configuration to export paths the
   * extension does not own, e.g. around a copy handler.
   */
  $withSerialization: <T>(fn: () => T) => T;
}

type NodePredicate = (node: LexicalNode) => boolean;

const matchesEverything: NodePredicate = () => true;

/**
 * Compile a `nodes` matcher into a single predicate, resolving each entry's
 * class-vs-guard nature once rather than per node.
 */
function compilePredicate(
  nodes: AnySerializationOverride['nodes'],
): NodePredicate {
  if (nodes === '*') {
    return matchesEverything;
  }
  const predicates = nodes.map((match): NodePredicate => {
    // A node class is told from a type guard by whether an object inheriting
    // its prototype is a LexicalNode. Probing via Object.create (once, at
    // compile time) also covers the abstract base class itself, whose own
    // prototype is not an instance of it; a guard's prototype is a plain
    // object (or absent, for arrow functions), so the probe is false.
    const {prototype} = match as Klass<LexicalNode>;
    return prototype != null && $isLexicalNode(Object.create(prototype))
      ? node => node instanceof (match as Klass<LexicalNode>)
      : (match as NodePredicate);
  });
  return node => {
    for (let i = 0; i < predicates.length; i++) {
      if (predicates[i](node)) {
        return true;
      }
    }
    return false;
  };
}

/**
 * Compile the configured overrides into the single middleware the core
 * serialization context consults. The chain is lazy: an override's `$next()`
 * runs the next matching override (bottoming out at the node's own
 * `exportJSON()`) the first time it is called, so an override that replaces
 * or omits a node without calling `$next()` never pays for — and is never
 * exposed to — the layers beneath it.
 */
function compileOverrides(overrides: readonly AnySerializationOverride[]) {
  if (overrides.length === 0) {
    return null;
  }
  const compiled = overrides.map(override => ({
    $exportJSON: override.$exportJSON,
    predicate: compilePredicate(override.nodes),
  }));
  const $applyOverrides = (
    node: LexicalNode,
    $default: () => SerializedLexicalNode,
  ): SerializedLexicalNode | null => {
    // When a consulted lower layer omits the node, the omission wins over the
    // outer override's return value: there was nothing left to enhance.
    let omitted = false;
    const $runFrom = (start: number): SerializedLexicalNode | null => {
      for (let i = start; i < compiled.length; i++) {
        if (compiled[i].predicate(node)) {
          const entry = compiled[i];
          let memo: SerializedLexicalNode | undefined;
          const $next = () => {
            if (memo === undefined) {
              const inner = $runFrom(i + 1);
              if (inner === null) {
                omitted = true;
                // Give the caller something well-formed to work with even
                // though the node will be omitted regardless.
                memo = $default();
              } else {
                memo = inner;
              }
            }
            return memo;
          };
          return entry.$exportJSON(node, $next);
        }
      }
      return $default();
    };
    const result = $runFrom(0);
    return omitted ? null : result;
  };
  return $applyOverrides;
}

/**
 * Controls how the editor's state serializes to JSON for exports made under
 * its context: whether to write the compact or the legacy form, and how
 * individual nodes are exported (including omitting or replacing them)
 * through {@link jsonOverride} declarations.
 *
 * The context is installed by this extension's output — around
 * {@link JSONExtensionOutput.$exportJSON} calls, or any code wrapped in
 * {@link JSONExtensionOutput.$withSerialization}. Export paths invoked
 * outside of those (a bare `editorState.toJSON()`, the editor's built-in
 * copy handler) run without it.
 *
 * @example
 * ```ts
 * configExtension(JSONExtension, {
 *   compact: true,
 *   overrides: [
 *     // never serialize comment threads
 *     jsonOverride([CommentNode], {$exportJSON: () => null}),
 *   ],
 * })
 * ```
 *
 * @experimental
 */
export const JSONExtension = /* @__PURE__ */ defineExtension({
  build(editor, config): JSONExtensionOutput {
    const override = compileOverrides(config.overrides);
    const $withConfigured = (compact: boolean) =>
      $withSerializationContext([
        [SerializationContextCompact, compact],
        [SerializationContextOverride, override],
      ]);
    return {
      $exportJSON(editorState = editor.getEditorState(), options = {}) {
        const compact =
          options.compact === undefined ? config.compact : options.compact;
        return $withConfigured(compact)(() => editorState.toJSON());
      },
      $withSerialization<T>(fn: () => T): T {
        return $withConfigured(config.compact)(fn);
      },
    };
  },
  config: /* @__PURE__ */ safeCast<JSONConfig>({
    compact: false,
    overrides: [],
  }),
  // Contributions from independent extensions must compose: `overrides`
  // concatenates (like DOMRenderExtension's) rather than being replaced by
  // the default shallow merge.
  mergeConfig(config, partial) {
    const merged = shallowMergeConfig(config, partial);
    if (partial && partial.overrides) {
      merged.overrides = [...config.overrides, ...partial.overrides];
    }
    return merged;
  },
  name: '@lexical/extension/JSON',
});
